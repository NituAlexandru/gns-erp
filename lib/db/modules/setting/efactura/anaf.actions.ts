'use server'

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/db'
import { auth } from '@/auth'
import { decrypt, encrypt } from '@/lib/utils/encryption'
import AnafToken from './anaf-token.model'
import { AnafAuthResponse, AnafMessagesResponse } from './anaf.types'
import { ExchangeTokenSchema } from './anaf.validator'
import { SUPER_ADMIN_ROLES } from '../../user/user-roles'
import SupplierInvoiceModel from '../../financial/treasury/payables/supplier-invoice.model'
import Supplier from '../../suppliers/supplier.model'
import { parseAnafXml } from '@/lib/db/modules/setting/efactura/anaf-parser'
import AnafMessage from './anaf-message.model'
import AnafLog from './anaf-log.model'
import { ISupplierDoc } from '../../suppliers/types'
import AdmZip from 'adm-zip'
import { getNoCachedSetting } from '../setting.actions'
import { XMLParser } from 'fast-xml-parser'
import { PAGE_SIZE } from '@/lib/constants'

// --- HELPER AUTH CHECK ---
async function checkAdmin() {
  const session = await auth()
  const userRole = session?.user?.role?.toLowerCase() || ''

  if (!session || !session.user || !SUPER_ADMIN_ROLES.includes(userRole)) {
    throw new Error('Neautorizat: Acces permis doar Adminilor.')
  }
  return true
}
// --- HELPER LOGGING ---
async function logAnaf(
  type: 'INFO' | 'SUCCESS' | 'ERROR',
  action: string,
  message: string,
  details?: unknown
) {
  try {
    await AnafLog.create({ type, action, message, details })
  } catch (e) {
    console.error('Failed to write ANAF log', e)
  }
}
// GENERATE LOGIN URL ---
export async function generateAnafLoginUrl() {
  await checkAdmin()
  const clientId = process.env.ANAF_CLIENT_ID
  const redirectUri = process.env.ANAF_REDIRECT_URI
  const authEndpoint = process.env.ANAF_AUTH_ENDPOINT

  if (!clientId || !redirectUri || !authEndpoint) {
    throw new Error('Missing ANAF configuration in .env')
  }

  const url = `${authEndpoint}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&token_content_type=jwt`

  return url
}
// EXCHANGE CODE FOR TOKEN ---
export async function exchangeCodeForToken(code: string) {
  await checkAdmin()
  const validation = ExchangeTokenSchema.safeParse({ code })
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  try {
    await connectToDatabase()
    const body = new URLSearchParams()
    body.append('grant_type', 'authorization_code')
    body.append('code', code)
    body.append('client_id', process.env.ANAF_CLIENT_ID!)
    body.append('client_secret', process.env.ANAF_CLIENT_SECRET!)
    body.append('redirect_uri', process.env.ANAF_REDIRECT_URI!)
    body.append('token_content_type', 'jwt')

    const response = await fetch(process.env.ANAF_TOKEN_ENDPOINT!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Eroare ANAF (${response.status}): ${errorText}`,
      }
    }

    const data: AnafAuthResponse = await response.json()
    const encryptedAccess = encrypt(data.access_token)
    const encryptedRefresh = encrypt(data.refresh_token)
    const now = new Date()
    const accessTokenExpiresAt = new Date(
      now.getTime() + (data.expires_in - 60) * 1000
    )
    const refreshTokenExpiresAt = new Date(
      now.getTime() + 90 * 24 * 60 * 60 * 1000
    )

    await AnafToken.deleteMany({})
    await AnafToken.create({
      iv: encryptedAccess.iv,
      encryptedAccessToken: encryptedAccess.data,
      encryptedRefreshToken: encryptedRefresh.data + ':' + encryptedRefresh.iv,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    })

    revalidatePath('/admin/settings/efactura')
    return { success: true }
  } catch (error) {
    console.error('Server Action Error:', error)
    return {
      success: false,
      error: 'Eroare internă la salvarea conexiunii ANAF.',
    }
  }
}
//  GET STATUS ---
export async function getAnafStatus() {
  await checkAdmin()
  await connectToDatabase()
  const tokenDoc = await AnafToken.findOne()
  if (!tokenDoc) return { connected: false }
  const now = new Date()
  const isExpired = tokenDoc.refreshTokenExpiresAt < now
  return {
    connected: !isExpired,
    expiresAt: tokenDoc.refreshTokenExpiresAt,
    lastLogin: tokenDoc.updatedAt,
  }
}
// HELPER INTERNAL TOKEN
async function getInternalAccessToken(): Promise<string> {
  await connectToDatabase()
  const tokenDoc = await AnafToken.findOne()
  if (!tokenDoc) throw new Error('Nu există conexiune ANAF.')
  const now = new Date()

  if (tokenDoc.accessTokenExpiresAt.getTime() - now.getTime() > 60 * 1000) {
    return decrypt(tokenDoc.encryptedAccessToken, tokenDoc.iv)
  }

  if (tokenDoc.refreshTokenExpiresAt > now) {
    const parts = tokenDoc.encryptedRefreshToken.split(':')
    if (parts.length !== 2)
      throw new Error('Format Refresh Token Invalid în DB')
    const refreshToken = decrypt(parts[0], parts[1])

    const body = new URLSearchParams()
    body.append('grant_type', 'refresh_token')
    body.append('refresh_token', refreshToken)
    body.append('client_id', process.env.ANAF_CLIENT_ID!)
    body.append('client_secret', process.env.ANAF_CLIENT_SECRET!)

    const response = await fetch(process.env.ANAF_TOKEN_ENDPOINT!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    })

    if (!response.ok) {
      await logAnaf('ERROR', 'REFRESH_TOKEN', 'Eșec la refresh token ANAF')
      throw new Error('Token Refresh Failed')
    }

    const data: AnafAuthResponse = await response.json()
    const encAccess = encrypt(data.access_token)
    const encRefresh = encrypt(data.refresh_token)

    tokenDoc.iv = encAccess.iv
    tokenDoc.encryptedAccessToken = encAccess.data
    tokenDoc.encryptedRefreshToken = encRefresh.data + ':' + encRefresh.iv
    tokenDoc.accessTokenExpiresAt = new Date(
      now.getTime() + (data.expires_in - 60) * 1000
    )
    tokenDoc.refreshTokenExpiresAt = new Date(
      now.getTime() + 90 * 24 * 60 * 60 * 1000
    )
    await tokenDoc.save()

    return data.access_token
  }
  throw new Error('Token Expirat. Necesită reconectare fizică.')
}
// MAIN SYNC ACTION ---
export async function syncAndProcessAnaf() {
  await checkAdmin()
  const session = await auth()
  const userId = session?.user?.id

  // 1. Preluăm setările companiei din DB
  const settings = await getNoCachedSetting()
  if (!settings) {
    throw new Error(
      'Datele companiei nu sunt configurate. Mergi la Setări > Companie.'
    )
  }

  const stats = { newMessages: 0, processed: 0, errors: 0 }

  try {
    // Luăm token-ul explicit ca string
    const accessToken: string = await getInternalAccessToken()

    // Configurare CUI / CIF
    let cifDeFolosit = settings.cui.toUpperCase().replace('RO', '').trim()

    // Logică pentru Mediu de TEST
    if (process.env.ANAF_API_BASE_URL?.includes('test')) {
      try {
        const parts = accessToken.split('.')
        if (parts.length === 3) {
          const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
          const parsedToken = JSON.parse(payload)
          if (parsedToken.sub) cifDeFolosit = parsedToken.sub
        }
      } catch (e) {
        console.log('Info: Token parse ignore', e)
      }
    }

    // APEL API & PAGINARE (Folosim endpoint-ul istoric cu TIMESTAMPS)
    const endData = new Date()
    const startData = new Date()
    startData.setDate(endData.getDate() - 59) // Calculăm data de acum 60 zile

    const startTime = startData.getTime() // Unix Timestamp (milisecunde)
    const endTime = endData.getTime()

    // ATENȚIE: Endpoint diferit, specific pentru paginație/istoric
    const endpoint = `${process.env.ANAF_API_BASE_URL}/listaMesajePaginatieFactura`

    let currentPage = 1
    let hasMorePages = true

    // Deschidem bucla WHILE
    while (hasMorePages) {
      const urlList = `${endpoint}?startTime=${startTime}&endTime=${endTime}&cif=${cifDeFolosit}&pagina=${currentPage}`

      console.log(`📡 Descarc pagina ${currentPage}... URL: ${urlList}`)

      const resList = await fetch(urlList, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      })

      console.log('👉 STATUS HTTP:', resList.status, resList.statusText)

      if (!resList.ok) {
        const errorBody = await resList.text()
        throw new Error(`Eroare ANAF (${resList.status}): ${errorBody}`)
      }

      // Parsare text pentru siguranță
      // Safe JSON parsing
      const textResponse = await resList.text()

      // Definim un tip local care să accepte și eroarea, ca să nu folosim 'any'
      type AnafResponseOrError = AnafMessagesResponse & { eroare?: string }

      let dataList: AnafResponseOrError
      try {
        dataList = JSON.parse(textResponse)
      } catch {
        hasMorePages = false
        break
      }

      // Verificăm dacă ANAF ne-a dat o eroare logică
      if (dataList.eroare) {
        throw new Error(`ANAF Refuză cererea: ${dataList.eroare}`)
      }

      // Acum TS știe că dataList este valid și folosim tipul importat
      const messages = dataList.mesaje || []

      console.log(`✅ Pagina ${currentPage}: ${messages.length} mesaje găsite.`)

      // Dacă nu sunt mesaje, oprim bucla
      if (messages.length === 0) {
        hasMorePages = false
        break
      }

      const defaultBank =
        settings.bankAccounts.find((b) => b.isDefault) ||
        settings.bankAccounts[0]
      const defaultEmail =
        settings.emails.find((e) => e.isDefault) || settings.emails[0]
      const defaultPhone =
        settings.phones.find((p) => p.isDefault) || settings.phones[0]

      // PROCESARE MESAJE
      for (const msg of messages) {
        try {
          // --- DATA NORMALIZATION ---
          const realId = msg.id || msg.id_descarcare
          const rawTip = msg.tip || 'NECUNOSCUT'
          const realTip = rawTip.replace(/\s+/g, '_')

          // FILTRU: Ignorăm ce nu e primit
          if (realTip !== 'FACTURA_PRIMITA') continue

          // Fallback CUI Emitent
          let realCuiEmitent = msg.cif_emitent || msg.cui_emitent
          if (!realCuiEmitent && msg.detalii) {
            const match = msg.detalii.match(/cif_emitent=(\d+)/)
            if (match && match[1]) realCuiEmitent = match[1]
            else realCuiEmitent = 'NECUNOSCUT'
          } else if (!realCuiEmitent) {
            realCuiEmitent = 'NECUNOSCUT'
          }

          const exists = await AnafMessage.findOne({ id_descarcare: realId })

          if (!exists) {
            stats.newMessages++

            const dbMsg = await AnafMessage.create({
              id_descarcare: realId,
              cui_emitent: realCuiEmitent,
              titlu: msg.titlu || 'Fara Titlu',
              tip: realTip,
              data_creare: parseAnafDate(msg.data_creare),
              detalii: msg.detalii || '',
              serial: msg.serial || '',
              is_downloaded: false,
              processing_status: 'UNPROCESSED',
            })

            // DOWNLOAD & UNZIP LOGIC
            try {
              const urlDownload = `${process.env.ANAF_API_BASE_URL}/descarcare?id=${realId}`
              const resXml: Response = await fetch(urlDownload, {
                headers: { Authorization: `Bearer ${accessToken}` },
              })

              if (resXml.ok) {
                const blob = await resXml.blob()
                const buffer = Buffer.from(await blob.arrayBuffer())
                let xmlText = ''

                // VERIFICARE ZIP
                if (buffer.toString('utf-8', 0, 2) === 'PK') {
                  console.log(`📦 Dezarhivare ZIP ID: ${realId}`)
                  const zip = new AdmZip(buffer)
                  const zipEntries = zip.getEntries()

                  const xmlEntry =
                    zipEntries.find(
                      (entry) =>
                        entry.entryName.toLowerCase().endsWith('.xml') &&
                        !entry.entryName.toLowerCase().includes('semnatura')
                    ) || zipEntries[0]

                  if (xmlEntry) {
                    xmlText = zip.readAsText(xmlEntry)
                  } else {
                    throw new Error('ZIP gol sau fără XML valid')
                  }
                } else {
                  xmlText = buffer.toString('utf8')
                }

                dbMsg.is_downloaded = true

                // PARSARE XML
                try {
                  const parsed = parseAnafXml(xmlText)
                  const cleanCuiSupplier = parsed.supplierCui
                    .replace(/^RO/, '')
                    .trim()

                  const supplier = (await Supplier.findOne({
                    fiscalCode: {
                      $regex: new RegExp(`^RO?${cleanCuiSupplier}$`, 'i'),
                    },
                  }).lean()) as ISupplierDoc | null

                  if (supplier) {
                    // Definim supAddr pentru fallback la adresa
                    const supAddr = supplier.address as unknown as Record<
                      string,
                      string | number | undefined
                    >

                    await SupplierInvoiceModel.create({
                      supplierId: supplier._id,
                      supplierSnapshot: {
                        name: parsed.supplierName || supplier.name,
                        cui: parsed.supplierCui || supplier.fiscalCode,
                        regCom: supplier.regComNumber || '',
                        address: {
                          judet:
                            parsed.supplierAddressDetails.county ||
                            String(supAddr.county || supAddr.judet || ''),
                          localitate:
                            parsed.supplierAddressDetails.city ||
                            String(supAddr.city || supAddr.localitate || ''),
                          strada:
                            parsed.supplierAddressDetails.street ||
                            String(supAddr.street || supAddr.strada || ''),
                          numar:
                            parsed.supplierAddressDetails.number ||
                            String(supAddr.number || supAddr.numar || ''),
                          codPostal:
                            parsed.supplierAddressDetails.zip ||
                            String(
                              supAddr.zipCode || supAddr.codPostal || '000000'
                            ),
                          tara: parsed.supplierAddressDetails.country || '',
                          alteDetalii: parsed.supplierAddress,
                          persoanaContact: parsed.supplierContact?.name || '',
                          telefonContact: parsed.supplierContact?.phone || '',
                        },
                        bank: parsed.supplierBank || '',
                        iban:
                          parsed.supplierIban ||
                          supplier.bankAccountLei?.iban ||
                          '',
                        capital: parsed.supplierCapital || '',
                        bic: parsed.supplierBic || '',
                        contactName: parsed.supplierContact?.name || '',
                        contactPhone: parsed.supplierContact?.phone || '',
                        contactEmail: parsed.supplierContact?.email || '',
                      },
                      ourCompanySnapshot: {
                        name: settings.name,
                        cui: settings.cui,
                        regCom: settings.regCom,
                        address: {
                          judet: settings.address.judet,
                          localitate: settings.address.localitate,
                          strada: settings.address.strada,
                          numar: settings.address.numar || '',
                          codPostal: settings.address.codPostal,
                          tara: settings.address.tara,
                          alteDetalii: settings.address.alteDetalii || '',
                        },
                        currency: defaultBank?.currency || 'RON',
                        email: defaultEmail?.address || '',
                        phone: defaultPhone?.number || '',
                        bank: defaultBank?.bankName || '',
                        iban: defaultBank?.iban || '',
                        contactName: parsed.customerContact?.name || '',
                      },
                      invoiceType: parsed.invoiceType,
                      invoiceTypeCode: parsed.invoiceTypeCode,
                      invoiceSeries: parsed.invoiceSeries,
                      invoiceNumber: parsed.invoiceNumber,
                      invoiceDate: parsed.invoiceDate,
                      dueDate: parsed.dueDate,
                      invoicePeriod: parsed.invoicePeriod,
                      invoiceCurrency: parsed.currency,
                      paymentMethodCode: parsed.paymentMethodCode,
                      notes: parsed.notes ? parsed.notes.join('\n') : '',
                      exchangeRate: parsed.exchangeRate,
                      references: {
                        contract: parsed.contractReference,
                        order: parsed.orderReference,
                        salesOrder: parsed.salesOrderID,
                        despatch: parsed.despatchReference,
                        deliveryLocationId: parsed.deliveryLocationId,
                        deliveryPartyName: parsed.deliveryPartyName,
                        actualDeliveryDate: parsed.actualDeliveryDate,
                        billingReference: parsed.billingReference,
                      },
                      items: parsed.lines.map((line) => ({
                        productName: line.productName,
                        productCode: line.productCode,
                        quantity: line.quantity,
                        unitOfMeasure: line.unitOfMeasure,
                        unitPrice: line.price,
                        lineValue: line.lineValue,
                        vatRateDetails: {
                          rate: line.vatRate,
                          value: line.vatAmount,
                        },
                        lineTotal: line.lineValue + line.vatAmount,
                        originCountry: line.originCountry,
                        baseQuantity: line.baseQuantity,
                        allowanceAmount: line.lineAllowanceAmount,
                        unitCode: line.unitCode,
                        description: line.productDescription,
                        cpvCode: line.commodityCode,
                      })),
                      taxSubtotals: parsed.taxSubtotals,
                      totals: {
                        subtotal: parsed.totalAmount - parsed.totalTax,
                        vatTotal: parsed.totalTax,
                        grandTotal: parsed.totalAmount,
                        payableAmount: parsed.payableAmount,
                        prepaidAmount: parsed.prepaidAmount,
                        globalDiscount: parsed.totalAllowance,
                        globalTax: parsed.totalCharges,
                        productsSubtotal: parsed.totalAmount - parsed.totalTax,
                        productsVat: parsed.totalTax,
                        packagingSubtotal: 0,
                        packagingVat: 0,
                        servicesSubtotal: 0,
                        servicesVat: 0,
                        manualSubtotal: 0,
                        manualVat: 0,
                      },

                      status: 'NEPLATITA',
                      eFacturaXMLId: realId,
                      createdBy: userId,
                      createdByName: 'Sistem e-Factura',
                    })

                    dbMsg.processing_status = 'COMPLETED'
                    stats.processed++
                  } else {
                    dbMsg.processing_status = 'ERROR_NO_SUPPLIER'
                    dbMsg.processing_error = `Furnizor inexistent: ${parsed.supplierCui}`
                    stats.errors++
                  }
                } catch (parseErr) {
                  const e =
                    parseErr instanceof Error
                      ? parseErr.message
                      : String(parseErr)
                  console.error(`XML Parse Error ${realId}:`, e)
                  dbMsg.processing_status = 'ERROR_OTHER'
                  dbMsg.processing_error = `Eroare parsare: ${e.substring(0, 100)}`
                  stats.errors++
                }

                await dbMsg.save()
              }
            } catch (downloadErr) {
              const e =
                downloadErr instanceof Error
                  ? downloadErr.message
                  : String(downloadErr)
              console.error(`Download Error ${realId}:`, e)
              dbMsg.processing_status = 'ERROR_OTHER'
              dbMsg.processing_error = e
              await dbMsg.save()
              stats.errors++
            }
          }
        } catch (itemErr) {
          console.error('Critical item error:', itemErr)
          stats.errors++
        }
      }

      // Verificăm dacă mai sunt pagini (ANAF dă max 500 per pagină)
      if (messages.length < 500) {
        hasMorePages = false
      } else {
        currentPage++
      }
    }

    await logAnaf('SUCCESS', 'SYNC', `Sincronizare finalizată.`, stats)
    revalidatePath('/financial/treasury/payables')
    return { success: true, stats }
  } catch (error: unknown) {
    const e = error instanceof Error ? error.message : String(error)
    console.error('Sync Critical Error:', e)
    await logAnaf('ERROR', 'SYNC_CRITICAL', e)
    return { success: false, error: e }
  }
}
// Helper Data
function parseAnafDate(str: string): Date {
  const y = parseInt(str.substring(0, 4))
  const m = parseInt(str.substring(4, 6)) - 1
  const d = parseInt(str.substring(6, 8))
  const h = parseInt(str.substring(8, 10))
  const min = parseInt(str.substring(10, 12))
  return new Date(y, m, d, h, min)
}
// GET INBOX MESSAGES from eFactura ---
export async function getAnafInboxErrors(
  page: number = 1,
  limit: number = PAGE_SIZE
) {
  await checkAdmin()
  await connectToDatabase()

  const skip = (page - 1) * limit
  const startOfYear = new Date(new Date().getFullYear(), 0, 1)

  // Query de bază (doar neprocesate)
  const baseQuery = { processing_status: { $ne: 'COMPLETED' } }

  // Query pentru an curent
  const currentYearQuery = {
    processing_status: { $ne: 'COMPLETED' },
    data_creare: { $gte: startOfYear },
  }

  const [messages, total, totalCurrentYear] = await Promise.all([
    AnafMessage.find(baseQuery) // Tabelul arată tot ce e neprocesat, indiferent de an
      .sort({ data_creare: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AnafMessage.countDocuments(baseQuery),
    AnafMessage.countDocuments(currentYearQuery), // Badge doar pe anul curent
  ])

  return {
    data: JSON.parse(JSON.stringify(messages)),
    totalPages: Math.ceil(total / limit),
    total,
    totalCurrentYear,
  }
}
// 2. Logs Paginat
export async function getAnafLogs(page: number = 1, limit: number = PAGE_SIZE) {
  await checkAdmin()
  await connectToDatabase()

  const skip = (page - 1) * limit
  const startOfYear = new Date(new Date().getFullYear(), 0, 1)

  const [logs, total, totalCurrentYear] = await Promise.all([
    AnafLog.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AnafLog.countDocuments({}),
    AnafLog.countDocuments({ createdAt: { $gte: startOfYear } }),
  ])

  return {
    data: JSON.parse(JSON.stringify(logs)),
    totalPages: Math.ceil(total / limit),
    total,
    totalCurrentYear,
  }
}
// RETRY PROCESS MESSAGE (SINGLE ITEM) ---
export async function retryProcessMessage(messageId: string) {
  await checkAdmin()
  const session = await auth()
  const userId = session?.user?.id
  const settings = await getNoCachedSetting()
  if (!settings) {
    return { success: false, error: 'Setările companiei lipsesc.' }
  }

  try {
    await connectToDatabase()

    // Găsim mesajul în DB
    const msg = await AnafMessage.findById(messageId)
    if (!msg)
      return { success: false, error: 'Mesajul nu mai există în baza de date.' }

    // Obținem token și descărcăm fișierul
    const token = await getInternalAccessToken()
    // Folosim id_descarcare salvat in mesaj
    const urlDownload = `${process.env.ANAF_API_BASE_URL}/descarcare?id=${msg.id_descarcare}`

    const resXml = await fetch(urlDownload, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resXml.ok) {
      return { success: false, error: `Eroare download ANAF: ${resXml.status}` }
    }

    // Procesare ZIP / XML (Logică identică cu Sync)
    const blob = await resXml.blob()
    const buffer = Buffer.from(await blob.arrayBuffer())
    let xmlText = ''

    // Verificare ZIP
    if (buffer.toString('utf-8', 0, 2) === 'PK') {
      try {
        const zip = new AdmZip(buffer)
        const zipEntries = zip.getEntries()
        const xmlEntry =
          zipEntries.find(
            (entry) =>
              entry.entryName.toLowerCase().endsWith('.xml') &&
              !entry.entryName.toLowerCase().includes('semnatura')
          ) || zipEntries[0]

        if (xmlEntry) {
          xmlText = zip.readAsText(xmlEntry)
        } else {
          return { success: false, error: 'ZIP gol sau fără XML valid.' }
        }
      } catch {
        return { success: false, error: 'Eroare la dezarhivare ZIP.' }
      }
    } else {
      xmlText = buffer.toString('utf8')
    }

    //. Parsare XML
    const parsed = parseAnafXml(xmlText)
    const cleanCuiSupplier = parsed.supplierCui.replace(/^RO/, '').trim()

    // Căutare Furnizor
    const supplier = (await Supplier.findOne({
      fiscalCode: { $regex: new RegExp(`^RO?${cleanCuiSupplier}$`, 'i') },
    }).lean()) as ISupplierDoc | null

    if (!supplier) {
      msg.processing_status = 'ERROR_NO_SUPPLIER'
      msg.processing_error = `Furnizor inexistent ${parsed.supplierCui} `
      await msg.save()
      return {
        success: false,
        error: `Furnizor inexistent: ${parsed.supplierCui}`,
      }
    }

    // Creare Factură (Invoice)
    // Pregătim datele implicite
    const defaultBank =
      settings.bankAccounts.find((b) => b.isDefault) || settings.bankAccounts[0]
    const defaultEmail =
      settings.emails.find((e) => e.isDefault) || settings.emails[0]
    const defaultPhone =
      settings.phones.find((p) => p.isDefault) || settings.phones[0]

    const supAddr = supplier.address as unknown as Record<
      string,
      string | number | undefined
    >

    await SupplierInvoiceModel.create({
      supplierId: supplier._id,
      supplierSnapshot: {
        name: parsed.supplierName || supplier.name,
        cui: parsed.supplierCui || supplier.fiscalCode,
        regCom: supplier.regComNumber || '',
        address: {
          judet:
            parsed.supplierAddressDetails.county ||
            String(supAddr.county || supAddr.judet || ''),
          localitate:
            parsed.supplierAddressDetails.city ||
            String(supAddr.city || supAddr.localitate || ''),
          strada:
            parsed.supplierAddressDetails.street ||
            String(supAddr.street || supAddr.strada || ''),
          numar:
            parsed.supplierAddressDetails.number ||
            String(supAddr.number || supAddr.numar || ''),
          codPostal:
            parsed.supplierAddressDetails.zip ||
            String(supAddr.zipCode || supAddr.codPostal || '000000'),
          tara: parsed.supplierAddressDetails.country || 'RO',
          alteDetalii: parsed.supplierAddress,
          persoanaContact: parsed.supplierContact?.name || '',
          telefonContact: parsed.supplierContact?.phone || '',
        },
        bank: parsed.supplierBank || '',
        iban: parsed.supplierIban || '',
        capital: parsed.supplierCapital || '',
        bic: parsed.supplierBic || '',
        contactName: parsed.supplierContact?.name || '',
        contactPhone: parsed.supplierContact?.phone || '',
        contactEmail: parsed.supplierContact?.email || '',
      },
      ourCompanySnapshot: {
        name: settings.name,
        cui: settings.cui,
        regCom: settings.regCom,
        address: {
          judet: settings.address.judet,
          localitate: settings.address.localitate,
          strada: settings.address.strada,
          numar: settings.address.numar || '',
          codPostal: settings.address.codPostal,
          tara: settings.address.tara,
          alteDetalii: settings.address.alteDetalii || '',
        },
        currency: defaultBank?.currency || 'RON',
        email: defaultEmail?.address || '',
        phone: defaultPhone?.number || '',
        bank: defaultBank?.bankName || '',
        iban: defaultBank?.iban || '',
        contactName: parsed.customerContact?.name || '',
      },
      invoiceType: parsed.invoiceType,
      invoiceTypeCode: parsed.invoiceTypeCode,
      invoiceSeries: parsed.invoiceSeries,
      invoiceNumber: parsed.invoiceNumber,
      invoiceDate: parsed.invoiceDate,
      invoicePeriod: parsed.invoicePeriod,
      dueDate: parsed.dueDate,
      invoiceCurrency: parsed.currency,
      paymentMethodCode: parsed.paymentMethodCode,
      notes: parsed.notes ? parsed.notes.join('\n') : '',
      exchangeRate: parsed.exchangeRate,
      references: {
        contract: parsed.contractReference,
        order: parsed.orderReference,
        salesOrder: parsed.salesOrderID,
        despatch: parsed.despatchReference,
        deliveryLocationId: parsed.deliveryLocationId,
        deliveryPartyName: parsed.deliveryPartyName,
        actualDeliveryDate: parsed.actualDeliveryDate,
        billingReference: parsed.billingReference,
      },
      items: parsed.lines.map((line) => ({
        productName: line.productName,
        productCode: line.productCode,
        quantity: line.quantity,
        unitOfMeasure: line.unitOfMeasure,
        unitCode: line.unitCode,
        unitPrice: line.price,
        lineValue: line.lineValue,
        vatRateDetails: {
          rate: line.vatRate,
          value: line.vatAmount,
        },
        lineTotal: line.lineValue + line.vatAmount,
        originCountry: line.originCountry,
        baseQuantity: line.baseQuantity,
        allowanceAmount: line.lineAllowanceAmount,
        description: line.productDescription,
        cpvCode: line.commodityCode,
      })),
      taxSubtotals: parsed.taxSubtotals,
      totals: {
        subtotal: parsed.totalAmount - parsed.totalTax,
        vatTotal: parsed.totalTax,
        grandTotal: parsed.totalAmount,
        payableAmount: parsed.payableAmount,
        prepaidAmount: parsed.prepaidAmount,
        globalDiscount: parsed.totalAllowance,
        globalTax: parsed.totalCharges,
        productsSubtotal: parsed.totalAmount - parsed.totalTax,
        productsVat: parsed.totalTax,
        packagingSubtotal: 0,
        packagingVat: 0,
        servicesSubtotal: 0,
        servicesVat: 0,
        manualSubtotal: 0,
        manualVat: 0,
      },

      status: 'NEPLATITA',
      eFacturaXMLId: msg.id_descarcare,
      createdBy: userId,
      createdByName: 'Sistem e-Factura Manual Retry',
    })

    // 8. Finalizare cu succes
    msg.is_downloaded = true
    msg.processing_status = 'COMPLETED'
    msg.processing_error = undefined
    await msg.save()

    await logAnaf(
      'SUCCESS',
      'MANUAL_RETRY',
      `Mesaj procesat manual (ID: ${msg.id_descarcare})`
    )

    revalidatePath('/admin/management/incasari-si-plati/payables')
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Retry Error:', errorMessage)
    return { success: false, error: errorMessage }
  }
}
// PREVIEW INVOICE (READ ONLY & DEBUG RAW)
export async function previewAnafInvoice(messageId: string) {
  await checkAdmin()

  try {
    await connectToDatabase()
    const msg = await AnafMessage.findById(messageId)
    if (!msg) return { success: false, error: 'Mesajul nu mai există.' }

    const token = await getInternalAccessToken()
    const urlDownload = `${process.env.ANAF_API_BASE_URL}/descarcare?id=${msg.id_descarcare}`

    const resXml = await fetch(urlDownload, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resXml.ok) return { success: false, error: 'Eroare download ANAF.' }

    const blob = await resXml.blob()
    const buffer = Buffer.from(await blob.arrayBuffer())
    let xmlText = ''

    if (buffer.toString('utf-8', 0, 2) === 'PK') {
      try {
        const zip = new AdmZip(buffer)
        const zipEntries = zip.getEntries()
        const xmlEntry =
          zipEntries.find(
            (entry) =>
              entry.entryName.toLowerCase().endsWith('.xml') &&
              !entry.entryName.toLowerCase().includes('semnatura')
          ) || zipEntries[0]

        if (xmlEntry) xmlText = zip.readAsText(xmlEntry)
        else return { success: false, error: 'ZIP fără XML.' }
      } catch {
        return { success: false, error: 'Eroare dezarhivare.' }
      }
    } else {
      xmlText = buffer.toString('utf8')
    }

    // Parsăm RAW (Tot ce e în fișier, fără filtre)
    const debugParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      removeNSPrefix: true,
    })

    const rawObject = debugParser.parse(xmlText)

    console.log('=====================================================')
    console.log(`🔎 DEBUG XML (ID: ${messageId}) - Primele 500 caractere:`)
    console.log(xmlText.substring(0, 1000)) // Vedem antetul XML
    console.log('=====================================================')

    // Parsăm cu Logica
    const parsed = parseAnafXml(xmlText)

    // AFISĂM ÎN CONSOLA COMPARATIA
    console.log('=====================================================')
    console.log(
      `🔎 ANALIZĂ FACTURĂ: ${parsed.invoiceSeries} ${parsed.invoiceNumber}`
    )
    console.log('=====================================================')

    // Structura originală completă.
    console.log('📦 STRUCTURA RAW (Ce trimite ANAF):')
    // Afisam Invoice-ul, ignoram headerele XML
    console.log(JSON.stringify(rawObject.Invoice || rawObject, null, 2))
    console.log('\n-----------------------------------------------------\n')
    console.log('✅ STRUCTURA PARSATA (Ce salvăm noi):')
    console.log(JSON.stringify(parsed, null, 2))
    console.log('=====================================================')

    return {
      success: true,
      data: JSON.parse(JSON.stringify(parsed)),
    }
  } catch (error: unknown) {
    const e = error instanceof Error ? error.message : String(error)
    return { success: false, error: e }
  }
}
