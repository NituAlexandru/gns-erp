'use server'

import { revalidatePath } from 'next/cache'
import { XMLParser } from 'fast-xml-parser'
import { Types } from 'mongoose'
import { connectToDatabase } from '@/lib/db'
import EfacturaOutgoing from './outgoing.model'
import { buildAnafXml } from './outgoing.builder'
import { EfacturaUploadAttempt, EfacturaUploadStatus } from './outgoing.types'
import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '../../../user/user-roles'
import { PaymentMethodKey } from '../../../financial/treasury/payment.constants'
import InvoiceModel from '../../../financial/invoices/invoice.model'
import { PopulatedInvoice } from '../../../financial/invoices/invoice.types'
import PaymentAllocationModel from '../../../financial/treasury/receivables/payment-allocation.model'
import ClientPaymentModel from '../../../financial/treasury/receivables/client-payment.model'
import { getInternalAccessToken } from '../anaf.actions'
import AdmZip from 'adm-zip'
import { parseAnafXml } from '../anaf-parser'

// --- HELPER: Verificare Admin ---
async function checkAdmin() {
  const session = await auth()
  const userRole = session?.user?.role?.toLowerCase() || ''
  if (!session || !session.user || !SUPER_ADMIN_ROLES.includes(userRole)) {
    throw new Error('Neautorizat: Acces permis doar Adminilor.')
  }
  return session.user.id
}
// --- HELPER: Determinare Metodă Plată ---
async function getPaymentDetails(invoiceId: string, remainingAmount: number) {
  // 1. Dacă factura nu e plătită integral, metoda default e OP (42)
  if (remainingAmount > 0.01) {
    return { method: 'ORDIN_DE_PLATA' as PaymentMethodKey, date: undefined }
  }

  // 2. Dacă e plătită integral, căutăm ultima alocare să vedem cum s-a plătit
  const allocation = await PaymentAllocationModel.findOne({
    invoiceId: new Types.ObjectId(invoiceId),
  })
    .sort({ allocationDate: -1 }) // Cea mai recentă
    .populate({
      path: 'paymentId',
      model: ClientPaymentModel,
      select: 'paymentMethod paymentDate',
    })
    .lean()

  if (!allocation || !allocation.paymentId) {
    // Fallback: Dacă e plătită dar nu găsim alocarea (ex: compensare manuală veche), punem OP
    return { method: 'ORDIN_DE_PLATA' as PaymentMethodKey, date: new Date() }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentDoc = allocation.paymentId as any // Cast pentru că populate returnează un obiect complex

  return {
    method: paymentDoc.paymentMethod as PaymentMethodKey,
    date: new Date(paymentDoc.paymentDate),
  }
}
// --- MAIN ACTION: Upload Factura ---
export async function uploadInvoiceToAnaf(invoiceId: string) {
  try {
    await checkAdmin()
    await connectToDatabase()

    // 1. Preluare Factură
    const invoice = await InvoiceModel.findById(invoiceId)
      .populate('clientId')
      .populate('sourceDeliveryNotes')
      .lean()

    if (!invoice) throw new Error('Factura nu a fost găsită.')

    const populatedInvoice = JSON.parse(
      JSON.stringify(invoice)
    ) as PopulatedInvoice

    // Validări
    if (!populatedInvoice.companySnapshot?.cui)
      throw new Error('Lipsește CUI Furnizor.')

    // ✅ MODIFICARE: Verificăm dacă există CUI sau CNP
    const clientRef = populatedInvoice.clientSnapshot
    if (!clientRef?.cui && !clientRef?.cnp) {
      throw new Error('Lipsește CUI sau CNP Client.')
    }

    // Curățare date (CUI)
    if (clientRef.cui) {
      clientRef.cui = clientRef.cui.toUpperCase().replace(/\s+/g, '')
    }
    // Curățare date (CNP) - eliminăm spații dacă există
    if (clientRef.cnp) {
      clientRef.cnp = clientRef.cnp.replace(/\s+/g, '')
    }

    // 2. Determinare Metodă Plată
    const { method } = await getPaymentDetails(
      invoiceId,
      populatedInvoice.remainingAmount || 0
    )

    // 3. Generare XML
    const xmlContent = buildAnafXml({
      invoice: populatedInvoice,
      paymentMethod: method,
    })

    // --- 🔍 DEBUG LOG: XML GENERAT ---
    console.log('=============================================================')
    console.log(`📝 XML GENERAT (Lungime: ${xmlContent.length} caractere)`)
    // Afișăm o parte din XML pentru verificare rapidă în consolă
    console.log(xmlContent.substring(0, 500) + '... [TRUNCATED] ...')
    console.log('=============================================================')

    // 4. Token
    const accessToken = await getInternalAccessToken()

    // 5. URL
    const cifEmitent = populatedInvoice.companySnapshot.cui
      .toUpperCase()
      .replace('RO', '')
      .trim()
    const standard = 'UBL'
    const url = `${process.env.ANAF_API_BASE_URL}/upload?standard=${standard}&cif=${cifEmitent}`

    // --- 🛡️ DEBUG MEDIU ---
    if (url.includes('/test/FCTEL')) {
      console.log('✅ MEDIU: TEST (Sigur)')
    } else {
      console.log('⚠️ MEDIU: PRODUCȚIE (Sau necunoscut)')
    }

    // 6. Apelare API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/xml',
      },
      body: xmlContent,
      cache: 'no-store',
    })

    // 7. Procesare Răspuns
    const responseText = await response.text()

    // --- 🔍 DEBUG LOG: RĂSPUNS ANAF ---
    console.log('📬 RĂSPUNS ANAF (Raw):', responseText)
    console.log('=============================================================')

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    })
    const resultObj = parser.parse(responseText)

    const header = resultObj.header
    let uploadIndex = ''
    let uploadStatus: EfacturaUploadStatus = 'REJECTED'
    const errors: string[] = []

    // Verificăm dacă avem index de încărcare
    if (response.ok && header && header['@_index_incarcare']) {
      uploadIndex = header['@_index_incarcare']
      uploadStatus = 'SENT'
    } else {
      // Parsăm erorile detaliate
      // ANAF poate returna erori în structura <Errors @_errorMessage="..." /> sau direct text
      const errorTag = header?.Errors
      if (errorTag) {
        const msg = errorTag['@_errorMessage'] || JSON.stringify(errorTag)
        errors.push(msg)
      } else {
        // Fallback dacă structura e diferită
        errors.push(
          `HTTP ${response.status}: ${responseText.substring(0, 300)}`
        )
      }
    }

    // 8. Salvare în DB (CRITIC: Salvăm și dacă e eroare, ca să vedem XML-ul)
    let outgoingEntry = await EfacturaOutgoing.findOne({
      invoiceId: new Types.ObjectId(invoiceId),
    })

    if (!outgoingEntry) {
      outgoingEntry = new EfacturaOutgoing({
        invoiceId: new Types.ObjectId(invoiceId),
        invoiceNumber: populatedInvoice.invoiceNumber,
        history: [],
      })
    }

    outgoingEntry.history.push({
      date: new Date(),
      status: uploadStatus,
      xmlContent: xmlContent, // <--- AICI SALVĂM XML-UL "STRICAT" PENTRU DEBUG ULTERIOR
      uploadIndex: uploadIndex || undefined,
      anafMessages: errors.length > 0 ? errors : undefined,
    })

    outgoingEntry.currentStatus = uploadStatus
    await outgoingEntry.save()

    // 9. Actualizare Factură
    if (uploadStatus === 'SENT') {
      await InvoiceModel.findByIdAndUpdate(invoiceId, {
        eFacturaStatus: 'SENT',
        eFacturaUploadId: uploadIndex,
        eFacturaError: null,
      })

      revalidatePath(`/financial/invoices`)
      return {
        success: true,
        message: `Factura trimisă! Index: ${uploadIndex}`,
      }
    } else {
      // Eroare
      const errorString = errors.join('; ')
      await InvoiceModel.findByIdAndUpdate(invoiceId, {
        eFacturaStatus: 'REJECTED_ANAF',
        eFacturaError: errorString.substring(0, 500), // Trunchiem pentru UI
      })

      revalidatePath(`/financial/invoices`)
      // Returnăm eroarea curată către frontend
      return { success: false, message: `Eroare ANAF: ${errorString}` }
    }
  } catch (error) {
    console.error('❌ Upload Critical Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
// --- CHECK STATUS ACTION ---
export async function updateOutgoingStatus(invoiceId: string) {
  try {
    await checkAdmin()
    await connectToDatabase()

    // 1. Găsim factura și intrarea din istoric
    const invoice = await InvoiceModel.findById(invoiceId)
    if (!invoice) throw new Error('Factura nu există.')

    // Dacă nu are index de încărcare, nu avem ce verifica
    if (!invoice.eFacturaUploadId) {
      return {
        success: false,
        message:
          'Factura nu are Index de Încărcare (nu a fost trimisă sau a fost respinsă pe loc).',
      }
    }

    const outgoingEntry = await EfacturaOutgoing.findOne({
      invoiceId: new Types.ObjectId(invoiceId),
    })
    if (!outgoingEntry)
      throw new Error('Nu există istoric de trimitere pentru această factură.')

    // 2. Token ANAF
    const accessToken = await getInternalAccessToken()
    // 3. Apelăm API stareMesaj
    const url = `${process.env.ANAF_API_BASE_URL}/stareMesaj?id_incarcare=${invoice.eFacturaUploadId}`

    console.log(`🔎 Checking status for Index: ${invoice.eFacturaUploadId}...`)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Eroare HTTP la verificare status: ${response.status}`)
    }

    const textResponse = await response.text()
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    })
    const resultObj = parser.parse(textResponse)
    const root = resultObj.stareMesaj || resultObj.header // Uneori ANAF schimbă formatul, dar stareMesaj e standard

    if (!root) {
      throw new Error(`Răspuns ANAF neașteptat: ${textResponse}`)
    }

    const stare = root['@_stare'] // 'ok', 'nok', 'in prelucrare'
    const idDescarcare = root['@_id_descarcare'] // Doar dacă e 'ok'

    // Pregătim actualizarea
    let newStatus: EfacturaUploadStatus = outgoingEntry.currentStatus // Păstrăm curent dacă e 'in prelucrare'
    let message = ''

    // --- LOGICA DE ACTUALIZARE STATUS ---
    if (stare === 'ok') {
      newStatus = 'ACCEPTED'
      message = 'Factura a fost validată de ANAF.'

      // Actualizăm Factura
      await InvoiceModel.findByIdAndUpdate(invoiceId, {
        eFacturaStatus: 'ACCEPTED',
        // Putem salva undeva și id_descarcare dacă vrem, momentan e în istoric
      })
    } else if (stare === 'nok') {
      newStatus = 'REJECTED'
      message = 'Factura a fost respinsă de ANAF.'
      let finalErrorMessage = ''

      // Scenariul 1: Avem ID de descărcare (Erori de validare în ZIP)
      if (idDescarcare) {
        // AICI APELĂM HELPER-UL NOU
        const extractedError = await extractErrorFromZip(
          accessToken,
          idDescarcare
        )

        // Dacă helper-ul a găsit ceva, îl folosim. Altfel, mesaj generic.
        finalErrorMessage =
          extractedError || 'Erori validare ANAF (Vezi arhiva ZIP)'
      }
      // Scenariul 2: Nu avem ID (Eroare tehnică directă în text)
      else {
        finalErrorMessage = JSON.stringify(root).substring(0, 500)
      }

      // Salvăm mesajul clar în Factură
      await InvoiceModel.findByIdAndUpdate(invoiceId, {
        eFacturaStatus: 'REJECTED_ANAF',
        eFacturaError: finalErrorMessage,
        eFacturaUploadId: idDescarcare, // Păstrăm ID-ul ca să poată descărca manual ZIP-ul
      })
    } else {
      message = 'Factura este încă în prelucrare.'
    }

    // 4. Actualizăm Istoricul (`EfacturaOutgoing`)
    // Vrem să actualizăm ultima intrare din istoric care corespunde acestui uploadIndex
    // Sau pur și simplu adăugăm un log nou de verificare

    // Simplificare: Dacă starea s-a schimbat (nu mai e 'SENT'/'PENDING'), actualizăm ultima intrare din history
    if (stare !== 'in prelucrare') {
      // Căutăm intrarea din history cu acest uploadIndex
      const historyIndex = outgoingEntry.history.findIndex(
        (h) => h.uploadIndex === invoice.eFacturaUploadId
      )

      if (historyIndex !== -1) {
        outgoingEntry.history[historyIndex].status = newStatus
        outgoingEntry.history[historyIndex].downloadId = idDescarcare

        if (stare === 'nok') {
          // Încercăm să extragem erorile mai curat
          outgoingEntry.history[historyIndex].anafMessages = [
            JSON.stringify(root),
          ]
        }
      } else {
        // Edge case: Nu găsim intrarea, adăugăm una nouă
        outgoingEntry.history.push({
          date: new Date(),
          status: newStatus,
          xmlContent: '', // Nu mai avem XML-ul aici
          uploadIndex: invoice.eFacturaUploadId,
          downloadId: idDescarcare,
          anafMessages: stare === 'nok' ? [JSON.stringify(root)] : [],
        })
      }

      outgoingEntry.currentStatus = newStatus
      await outgoingEntry.save()
    }

    if (newStatus === 'ACCEPTED' && idDescarcare) {
      try {
        console.log('💾 Auto-archiving signed XML...')
        // Apelăm funcția de download (ea salvează automat în DB dacă găsește XML-ul)
        // Nu returnăm rezultatul către client, doar îl executăm în background
        await downloadOutgoingResult(invoiceId)
      } catch (archiveErr) {
        console.error('⚠️ Auto-archive failed (non-blocking):', archiveErr)
      }
    }

    revalidatePath(`/financial/invoices`)

    return {
      success: true,
      status: stare, // 'ok', 'nok', 'in prelucrare'
      message,
    }
  } catch (error) {
    console.error('❌ Update Status Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
// --- DOWNLOAD & SAVE FINAL ZIP ---
export async function downloadOutgoingResult(invoiceId: string) {
  try {
    await checkAdmin()
    await connectToDatabase()

    // 1. Găsim factura și istoricul
    const invoice = await InvoiceModel.findById(invoiceId).lean()
    if (!invoice) throw new Error('Factura nu există.')

    const outgoingEntry = await EfacturaOutgoing.findOne({
      invoiceId: new Types.ObjectId(invoiceId),
    })

    // Încercăm să găsim ID-ul de descărcare
    // Prioritate: 1. Din istoric (dacă am dat check status), 2. Din factură (dacă am salvat acolo)
    let downloadId = outgoingEntry?.history.find(
      (h) => h.downloadId
    )?.downloadId

    // Dacă nu îl găsim în istoric, poate e factura veche sau nu s-a făcut updateStatus
    // Putem încerca un mecanism de fallback, dar de regulă updateOutgoingStatus îl setează.
    if (!downloadId) {
      // Încercăm un "Last Resort": verificăm statusul acum, poate a devenit OK între timp
      const checkResult = await updateOutgoingStatus(invoiceId)
      if (checkResult.success && checkResult.status === 'ok') {
        // Re-citim intrarea din DB
        const freshEntry = await EfacturaOutgoing.findOne({
          invoiceId: new Types.ObjectId(invoiceId),
        })
        downloadId = freshEntry?.history.find((h) => h.downloadId)?.downloadId
      }
    }

    if (!downloadId) {
      throw new Error(
        'Această factură nu are încă un ID de descărcare (nu a fost validată de ANAF).'
      )
    }

    // 2. Token ANAF
    const accessToken = await getInternalAccessToken()

    // 3. Download ZIP
    const url = `${process.env.ANAF_API_BASE_URL}/descarcare?id=${downloadId}`
    console.log(
      `📥 Downloading ZIP for Invoice ${invoice.invoiceNumber} (ID: ${downloadId})...`
    )

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(
        `Eroare download ANAF: ${response.status} ${response.statusText}`
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 4. Procesare ZIP (Extragere XML Semnat pentru Arhivare)
    let signedXml = ''
    try {
      const zip = new AdmZip(buffer)
      const zipEntries = zip.getEntries()

      // Căutăm fișierul XML (de obicei e unul singur sau are nume specific)
      const xmlEntry = zipEntries.find((entry) =>
        entry.entryName.toLowerCase().endsWith('.xml')
      )

      if (xmlEntry) {
        signedXml = zip.readAsText(xmlEntry)

        // 5. SALVARE XML SEMNAT ÎN DB (Dovada Finală)
        if (outgoingEntry) {
          // Găsim intrarea din istoric care are acest downloadId
          const historyIdx = outgoingEntry.history.findIndex(
            (h) => h.downloadId === downloadId
          )

          if (historyIdx !== -1) {
            // Verificăm să nu suprascriem inutil dacă există deja
            if (!outgoingEntry.history[historyIdx].signedXmlContent) {
              outgoingEntry.history[historyIdx].signedXmlContent = signedXml
              await outgoingEntry.save()
              console.log('✅ XML Semnat salvat în baza de date.')
            }
          }
        }
      }
    } catch (err) {
      console.error(
        '⚠️ Avertisment: Nu s-a putut extrage XML-ul din arhivă pentru salvare DB.',
        err
      )
      // Nu oprim procesul, utilizatorul tot vrea fișierul ZIP
    }

    // 6. Returnare către Client (Base64)
    // Server Actions nu pot returna Blob direct, trimitem base64 string
    const base64 = buffer.toString('base64')
    const fileName = `Factura_${invoice.seriesName}${invoice.invoiceNumber}_ANAF.zip`

    return {
      success: true,
      data: base64,
      fileName: fileName,
      contentType: 'application/zip',
    }
  } catch (error) {
    console.error('❌ Download Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

// --- BULK ACTION: REFRESH ALL SENT ---
export async function refreshAllOutgoingStatuses() {
  try {
    await checkAdmin()
    await connectToDatabase()

    // 1. Găsim toate facturile care așteaptă răspuns
    const pendingInvoices = await InvoiceModel.find({
      eFacturaStatus: 'SENT',
      eFacturaUploadId: { $exists: true, $ne: '' }, // Siguranță
    })
      .select('_id invoiceNumber')
      .lean()

    if (pendingInvoices.length === 0) {
      return {
        success: true,
        message: 'Nu există facturi în așteptare.',
      }
    }

    console.log(`🔄 Bulk Refresh: Verific ${pendingInvoices.length} facturi...`)

    // 2. Executăm verificările în PARALEL
    // Promise.allSettled așteaptă ca toate să termine, indiferent dacă unele dau eroare
    const results = await Promise.allSettled(
      pendingInvoices.map((inv) => updateOutgoingStatus(inv._id.toString()))
    )

    // 3. Calculăm statistici
    let completed = 0
    let stillProcessing = 0
    let errors = 0

    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        const val = res.value
        if (val.success) {
          if (val.status === 'ok' || val.status === 'nok') completed++
          else stillProcessing++ // 'in prelucrare'
        } else {
          errors++
        }
      } else {
        errors++ // Eroare de rețea/sistem
      }
    })

    revalidatePath('/financial/invoices')

    return {
      success: true,
      message: `Verificare completă: ${completed} finalizate, ${stillProcessing} încă în prelucrare, ${errors} erori.`,
      stats: {
        total: pendingInvoices.length,
        completed,
        stillProcessing,
        errors,
      },
    }
  } catch (error) {
    console.error('❌ Bulk Refresh Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

// --- PREVIEW OUTGOING XML ---
export async function getOutgoingPreviewData(invoiceId: string) {
  try {
    await checkAdmin()
    await connectToDatabase()

    // 1. Căutăm intrarea în istoricul Outgoing
    const entry = await EfacturaOutgoing.findOne({
      invoiceId: new Types.ObjectId(invoiceId),
    }).lean()

    if (!entry || !entry.history || entry.history.length === 0) {
      return {
        success: false,
        error: 'Nu există istoric e-Factura pentru această factură.',
      }
    }

    // 2. Găsim cel mai relevant XML (Ultimul trimis sau cel semnat)
    // Sortăm descrescător după dată
    const sortedHistory = entry.history.sort(
      (a: EfacturaUploadAttempt, b: EfacturaUploadAttempt) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const lastAttempt = sortedHistory[0]

    // Prioritizăm XML-ul semnat (final), altfel cel trimis
    const xmlToParse = lastAttempt.signedXmlContent || lastAttempt.xmlContent

    if (!xmlToParse) {
      return { success: false, error: 'Nu s-a găsit conținut XML salvat.' }
    }

    // 3. Parsăm XML-ul folosind parserul existent (FĂRĂ MODIFICĂRI)
    const parsedData = parseAnafXml(xmlToParse)

    return {
      success: true,
      data: JSON.parse(JSON.stringify(parsedData)),
    }
  } catch (error) {
    console.error('❌ Preview Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
// --- HELPER: Extragere mesaj eroare din ZIP-ul ANAF ---
async function extractErrorFromZip(
  accessToken: string,
  downloadId: string
): Promise<string | null> {
  try {
    const url = `${process.env.ANAF_API_BASE_URL}/descarcare?id=${downloadId}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })

    if (!response.ok) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()
    let errorXmlContent = ''

    // Căutăm fișierul XML de eroare
    for (const entry of entries) {
      if (entry.entryName.toLowerCase().endsWith('.xml')) {
        const content = zip.readAsText(entry)
        if (content.includes('<Error')) {
          errorXmlContent = content
          break
        }
      }
    }

    if (!errorXmlContent) return null

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    })
    const errObj = parser.parse(errorXmlContent)
    const errors = errObj.header?.Error || errObj.Error

    if (errors) {
      // Definim tipul așteptat pentru o eroare ANAF
      interface AnafXmlError {
        '@_errorMessage'?: string
        [key: string]: unknown
      }

      // Cast la unknown[] mai întâi, apoi mapăm sigur
      const errorList = (
        Array.isArray(errors) ? errors : [errors]
      ) as AnafXmlError[]

      return errorList
        .map((e) => e['@_errorMessage'] || JSON.stringify(e))
        .join('\n')
    }

    return null
  } catch (error) {
    console.error('Error extracting ZIP message:', error)
    return null
  }
}
