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

// DE MODIFICAT DATELE COMPANIEI HARDCODATE

// --- HELPER AUTH CHECK ---
async function checkAdmin() {
  const session = await auth()
  const userRole = session?.user?.role?.toLowerCase() || ''

  if (!session || !session.user || !SUPER_ADMIN_ROLES.includes(userRole)) {
    throw new Error('Unauthorized: Acces permis doar Administratorilor.')
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

// --- 1. GENERATE LOGIN URL ---
export async function generateAnafLoginUrl() {
  await checkAdmin()

  const clientId = process.env.ANAF_CLIENT_ID
  const redirectUri = process.env.ANAF_REDIRECT_URI
  const authEndpoint = process.env.ANAF_AUTH_ENDPOINT

  if (!clientId || !redirectUri || !authEndpoint) {
    throw new Error('Missing ANAF configuration in .env')
  }

  // Token content type = jwt este standardul nou ANAF
  const url = `${authEndpoint}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&token_content_type=jwt`

  return url
}

// --- 2. EXCHANGE CODE FOR TOKEN ---
export async function exchangeCodeForToken(code: string) {
  await checkAdmin()

  // Validare input cu Zod
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

    const response = await fetch(process.env.ANAF_TOKEN_ENDPOINT!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ANAF Token Error:', errorText)
      return {
        success: false,
        error: `Eroare ANAF (${response.status}): ${response.statusText}`,
      }
    }

    const data: AnafAuthResponse = await response.json()

    // Criptare Token-uri
    const encryptedAccess = encrypt(data.access_token)
    const encryptedRefresh = encrypt(data.refresh_token)

    const now = new Date()
    // Expirare access token (scadem 60s marja siguranta)
    const accessTokenExpiresAt = new Date(
      now.getTime() + (data.expires_in - 60) * 1000
    )
    // Expirare refresh token (90 zile fix)
    const refreshTokenExpiresAt = new Date(
      now.getTime() + 90 * 24 * 60 * 60 * 1000
    )

    // Ștergem orice setare veche (Single Tenant)
    await AnafToken.deleteMany({})

    await AnafToken.create({
      iv: encryptedAccess.iv,
      encryptedAccessToken: encryptedAccess.data,
      // Stocăm IV-ul refresh token-ului lipit de data pentru a nu complica schema
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

// --- 3. GET STATUS ---
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

// --- HELPER INTERNAL TOKEN (REFRESH LOGIC) ---
// Aceasta trebuie să fie robustă. Dacă nu merge, aruncă eroare.
async function getInternalAccessToken() {
  await connectToDatabase()
  const tokenDoc = await AnafToken.findOne()
  if (!tokenDoc) throw new Error('Nu există conexiune ANAF.')

  const now = new Date()

  // 1. Access Token Valid
  if (tokenDoc.accessTokenExpiresAt.getTime() - now.getTime() > 60 * 1000) {
    return decrypt(tokenDoc.encryptedAccessToken, tokenDoc.iv)
  }

  // 2. Refresh Token
  if (tokenDoc.refreshTokenExpiresAt > now) {
    // Logica de split IV:Data
    const parts = tokenDoc.encryptedRefreshToken.split(':')
    // Validăm că avem ambele părți
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
      body: body,
      cache: 'no-store',
    })

    if (!response.ok) {
      await logAnaf('ERROR', 'REFRESH_TOKEN', 'Eșec la refresh token ANAF')
      throw new Error('Token Refresh Failed')
    }

    const data: AnafAuthResponse = await response.json()

    // Update DB
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

// DE MODIFICAT DATELE FIRMEI HARDCODATE, DE LUAT DIN SETTINGS
// --- MAIN SYNC ACTION ---
export async function syncAndProcessAnaf() {
  await checkAdmin()
  const session = await auth()
  const userId = session?.user?.id

  // Stats
  const stats = { newMessages: 0, processed: 0, errors: 0 }

  try {
    const token = await getInternalAccessToken()

    // CUI-ul firmei tale
    const cuid = 'RO123456' // TODO: De înlocuit cu valoarea din Settings
    const daysBack = 60
    const urlList = `${process.env.ANAF_API_BASE_URL}/listaMesajeFactura?zile=${daysBack}&cui=${cuid}`

    const resList = await fetch(urlList, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resList.ok) throw new Error('Eroare la obținerea listei de mesaje')

    const dataList: AnafMessagesResponse = await resList.json()
    const messages = dataList.mesaje || []

    for (const msg of messages) {
      const exists = await AnafMessage.findOne({
        id_descarcare: msg.id_descarcare,
      })

      if (!exists) {
        stats.newMessages++

        const dbMsg = await AnafMessage.create({
          id_descarcare: msg.id_descarcare,
          cui_emitent: msg.cui_emitent,
          titlu: msg.titlu,
          tip: msg.tip,
          data_creare: parseAnafDate(msg.data_creare),
          detalii: msg.detalii,
          serial: msg.serial,
          is_downloaded: false,
          processing_status: 'UNPROCESSED',
        })

        if (msg.tip === 'FACTURA_PRIMITA') {
          try {
            // A. DOWNLOAD XML
            const urlDownload = `${process.env.ANAF_API_BASE_URL}/descarcare?id=${msg.id_descarcare}`
            const resXml = await fetch(urlDownload, {
              headers: { Authorization: `Bearer ${token}` },
            })

            if (resXml.ok) {
              const xmlText = await resXml.text()
              dbMsg.is_downloaded = true

              // B. PARSE XML
              const parsed = parseAnafXml(xmlText)

              // C. FIND SUPPLIER
              const cleanCui = parsed.supplierCui.replace(/^RO/, '').trim()

              const supplier = (await Supplier.findOne({
                fiscalCode: { $regex: new RegExp(`^RO?${cleanCui}$`, 'i') },
              }).lean()) as ISupplierDoc | null

              if (supplier) {
                // CAZ A: FURNIZOR EXISTĂ

                const invoiceItems = parsed.lines.map((line) => ({
                  productName: line.productName,
                  quantity: line.quantity,
                  unitOfMeasure: line.unitOfMeasure,
                  unitPrice: line.price,
                  lineValue: line.lineValue,
                  vatRateDetails: { rate: 19, value: 0 },
                  lineTotal: line.lineValue,
                }))

                // FIX TS2352: Castare sigură care acceptă și numere (pt distanceInKm), dar noi citim doar string-urile
                const supAddr = supplier.address as unknown as Record<
                  string,
                  string | number | undefined
                >

                await SupplierInvoiceModel.create({
                  supplierId: supplier._id,
                  supplierSnapshot: {
                    name: supplier.name,
                    cui: supplier.fiscalCode || parsed.supplierCui,
                    regCom: supplier.regComNumber || '',
                    // FIX: Structura corectă (închidem obiectul address înainte de bank)
                    address: {
                      judet: String(supAddr.county || supAddr.judet || ''),
                      localitate: String(
                        supAddr.city || supAddr.localitate || ''
                      ),
                      strada: String(supAddr.street || supAddr.strada || ''),
                      numar: String(supAddr.number || supAddr.numar || ''),
                      codPostal: String(
                        supAddr.zipCode || supAddr.codPostal || '000000'
                      ),
                      tara: 'RO',
                      alteDetalii: String(
                        supAddr.details || supAddr.alteDetalii || ''
                      ),
                      persoanaContact: '',
                      telefonContact: '',
                    },
                    bank: supplier.bankAccountLei?.bankName || '',
                    iban: supplier.bankAccountLei?.iban || '',
                  },
                  ourCompanySnapshot: {
                    name: 'Compania Mea',
                    cui: cuid,
                    address: {
                      judet: 'B',
                      localitate: 'B',
                      strada: 'S',
                      codPostal: '0',
                      tara: 'RO',
                    },
                    currency: 'RON',
                    email: '',
                    phone: '',
                    regCom: '',
                    bank: '',
                    iban: '',
                  },
                  invoiceType: 'STANDARD',
                  invoiceSeries: parsed.invoiceSeries,
                  invoiceNumber: parsed.invoiceNumber,
                  invoiceDate: parsed.invoiceDate,
                  dueDate: parsed.dueDate,
                  items: invoiceItems,
                  totals: {
                    subtotal: parsed.totalAmount,
                    vatTotal: 0,
                    grandTotal: parsed.totalAmount,
                    productsSubtotal: parsed.totalAmount,
                    productsVat: 0,
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
                  createdByName: 'Sistem e-Factura',
                })

                dbMsg.processing_status = 'COMPLETED'
                stats.processed++
              } else {
                // CAZ B: FURNIZOR LIPSA
                dbMsg.processing_status = 'ERROR_NO_SUPPLIER'
                dbMsg.processing_error = `Furnizorul cu CUI ${parsed.supplierCui} (${parsed.supplierName}) nu a fost găsit.`
                stats.errors++
              }

              await dbMsg.save()
            }
          } catch (err: unknown) {
            const errorMessage =
              err instanceof Error ? err.message : String(err)
            console.error(
              `Eroare procesare mesaj ${msg.id_descarcare}:`,
              errorMessage
            )

            dbMsg.processing_status = 'ERROR_OTHER'
            dbMsg.processing_error = errorMessage
            await dbMsg.save()
            stats.errors++
          }
        }
      }
    }

    await logAnaf('SUCCESS', 'SYNC', `Sincronizare finalizată.`, stats)
    revalidatePath('/financial/treasury/payables')
    return { success: true, stats }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Sync Critical Error:', errorMessage)
    await logAnaf('ERROR', 'SYNC_CRITICAL', errorMessage)
    return { success: false, error: errorMessage }
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
// --- 6. GET INBOX MESSAGES (Pentru Tab-ul "Mesaje SPV") ---
// Aduce mesajele care NU sunt procesate cu succes (adică erori sau neprocesate)
export async function getAnafInboxErrors() {
  await checkAdmin()
  await connectToDatabase()

  // Vrem să vedem doar ce NU s-a transformat în factură
  const messages = await AnafMessage.find({
    processing_status: { $ne: 'COMPLETED' },
  })
    .sort({ data_creare: -1 })
    .lean()

  // Serializare simplă pentru a evita erorile de Date in Client Components
  return JSON.parse(JSON.stringify(messages))
}

// --- 7. GET LOGS (Pentru Tab-ul "Logs") ---
export async function getAnafLogs(limit = 50000) {
  await checkAdmin()
  await connectToDatabase()

  const logs = await AnafLog.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  return JSON.parse(JSON.stringify(logs))
}

// --- 8. RETRY PROCESS MESSAGE (Acțiunea Manuală) ---
// Se apelează când userul a creat furnizorul și apasă "Reîncearcă" pe mesaj
export async function retryProcessMessage(messageId: string) {
  await checkAdmin()
  const session = await auth()
  const userId = session?.user?.id

  try {
    await connectToDatabase()
    const msg = await AnafMessage.findById(messageId)
    if (!msg) throw new Error('Mesajul nu mai există.')

    const token = await getInternalAccessToken()
    const urlDownload = `${process.env.ANAF_API_BASE_URL}/descarcare?id=${msg.id_descarcare}`
    const resXml = await fetch(urlDownload, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resXml.ok)
      throw new Error('Nu s-a putut redescărca XML-ul de la ANAF.')

    const xmlText = await resXml.text()

    // 2. Parse
    const parsed = parseAnafXml(xmlText)

    // 3. Find Supplier
    const cleanCui = parsed.supplierCui.replace(/^RO/, '').trim()

    //  Castare explicită la interfața documentului
    const supplier = (await Supplier.findOne({
      fiscalCode: { $regex: new RegExp(`^RO?${cleanCui}$`, 'i') },
    }).lean()) as ISupplierDoc | null

    if (!supplier) {
      return {
        success: false,
        error: `Furnizorul cu CUI ${parsed.supplierCui} tot nu a fost găsit. L-ai creat?`,
      }
    }

    // 4. Create Invoice
    const invoiceItems = parsed.lines.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      unitOfMeasure: line.unitOfMeasure,
      unitPrice: line.price,
      lineValue: line.lineValue,
      vatRateDetails: { rate: 19, value: 0 },
      lineTotal: line.lineValue,
    }))

    //  Castare sigură la Record<string, unknown> pentru adresa sursă
    const supAddr = supplier.address as unknown as Record<
      string,
      string | number | undefined
    >
    // DE MODIFICAT DATE COMPANIE HARDCODATE, DE LUAT DIN SETTINGS
    await SupplierInvoiceModel.create({
      supplierId: supplier._id,
      supplierSnapshot: {
        name: supplier.name,
        cui: supplier.fiscalCode || parsed.supplierCui,
        regCom: supplier.regComNumber || '',
        address: {
          judet: String(supAddr.county || supAddr.judet || ''),
          localitate: String(supAddr.city || supAddr.localitate || ''),
          strada: String(supAddr.street || supAddr.strada || ''),
          numar: String(supAddr.number || supAddr.numar || ''),
          codPostal: String(supAddr.zipCode || supAddr.codPostal || '000000'),
          tara: 'RO',
          alteDetalii: String(supAddr.details || supAddr.alteDetalii || ''),
          persoanaContact: '',
          telefonContact: '',
        },
        bank: supplier.bankAccountLei?.bankName || '',
        iban: supplier.bankAccountLei?.iban || '',
      },
      ourCompanySnapshot: {
        name: 'Compania Mea',
        cui: 'RO123456', // TODO: Settings
        address: {
          judet: 'B',
          localitate: 'B',
          strada: 'S',
          codPostal: '0',
          tara: 'RO',
        },
        currency: 'RON',
        email: '',
        phone: '',
        regCom: '',
        bank: '',
        iban: '',
      },
      invoiceType: 'STANDARD',
      invoiceSeries: parsed.invoiceSeries,
      invoiceNumber: parsed.invoiceNumber,
      invoiceDate: parsed.invoiceDate,
      dueDate: parsed.dueDate,
      items: invoiceItems,
      totals: {
        subtotal: parsed.totalAmount,
        vatTotal: 0,
        grandTotal: parsed.totalAmount,
        productsSubtotal: parsed.totalAmount,
        productsVat: 0,
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
      createdByName: 'Manual Retry',
    })

    // Update Message Status
    msg.processing_status = 'COMPLETED'
    msg.processing_error = undefined
    await msg.save()

    revalidatePath('/financial/treasury/payables')
    return { success: true }
  } catch (error: unknown) {
    //  Error handling strict cu unknown
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
}
