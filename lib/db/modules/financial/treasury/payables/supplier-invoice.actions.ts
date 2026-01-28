'use server'

import mongoose, { FilterQuery, startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import SupplierInvoiceModel from './supplier-invoice.model'
import {
  CreateSupplierInvoiceInput,
  ISupplierInvoiceDoc,
  OurCompanySnapshot,
  SupplierSnapshot,
} from './supplier-invoice.types'
import { CreateSupplierInvoiceSchema } from './supplier-invoice.validator'
import { revalidatePath } from 'next/cache'
import { getSetting } from '../../../setting/setting.actions'
import { ISettingInput } from '../../../setting/types'
import { connectToDatabase } from '@/lib/db'
import Supplier from '../../../suppliers/supplier.model'
import { SupplierInvoiceStatus } from './supplier-invoice.constants'
import { CLIENT_DETAIL_PAGE_SIZE, PAYABLES_PAGE_SIZE } from '@/lib/constants'
import { recalculateSupplierSummary } from '../../../suppliers/summary/supplier-summary.actions'
import NirModel from '../../nir/nir.model'
import { generateNextDocumentNumber } from '../../../numbering/numbering.actions'
import { CreateOpeningBalanceInput } from '../../initial-balance/initial-balance.validator'

type SupplierInvoiceActionResult = {
  success: boolean
  message: string
  data?: string
}
type SingleInvoiceResult = {
  success: boolean
  data?: ISupplierInvoiceDoc | null
  message?: string
}
export interface SupplierInvoiceListItem {
  _id: string
  invoiceSeries: string
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date
  status: SupplierInvoiceStatus
  invoiceType: string
  remainingAmount: number
  totals: {
    grandTotal: number
  }
  createdAt: Date
  supplierId?: {
    _id: string
    name: string
  } | null
}

export type SupplierInvoicesPage = {
  data: SupplierInvoiceListItem[]
  totalPages: number
  total: number
  totalCurrentYear?: number
}

export interface ReceptionListItem {
  _id: string
  series: string
  number: string
  date: Date
  invoiceReference: string
  warehouseName: string
  totalValue: number
}

function buildCompanySnapshot(settings: ISettingInput): OurCompanySnapshot {
  const defaultEmail = settings.emails.find((e) => e.isDefault)
  const defaultPhone = settings.phones.find((p) => p.isDefault)
  const defaultBank = settings.bankAccounts.find((b) => b.isDefault)

  if (!defaultEmail || !defaultPhone || !defaultBank) {
    throw new Error(
      'Setările implicite (email, telefon, bancă) nu sunt configurate.',
    )
  }
  return {
    name: settings.name,
    cui: settings.cui,
    regCom: settings.regCom,
    address: settings.address,
    email: defaultEmail.address,
    phone: defaultPhone.number,
    bank: defaultBank.bankName,
    iban: defaultBank.iban,
    currency: defaultBank.currency,
  }
}
/**
 * Creează (înregistrează manual) o factură primită de la un furnizor.
 */
export async function createSupplierInvoice(
  data: CreateSupplierInvoiceInput,
): Promise<SupplierInvoiceActionResult> {
  const session = await startSession()
  let newInvoice: ISupplierInvoiceDoc | null = null

  try {
    newInvoice = await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      const validatedData = CreateSupplierInvoiceSchema.parse(data)

      // 2. Preluare Snapshot Companie (CINE SUNTEM NOI)
      const companySettings = await getSetting()
      if (!companySettings)
        throw new Error('Setările companiei nu sunt configurate.')
      const ourCompanySnapshot = buildCompanySnapshot(companySettings)

      // 3. Crearea Facturii Furnizor
      const [createdInvoice] = await SupplierInvoiceModel.create(
        [
          {
            ...validatedData,
            ourCompanySnapshot: ourCompanySnapshot,
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
            status: 'NEPLATITA',
          },
        ],
        { session },
      )

      return createdInvoice
    })

    await session.endSession()

    if (newInvoice) {
      try {
        await recalculateSupplierSummary(
          newInvoice.supplierId.toString(),
          'auto-recalc',
          true,
        )
      } catch (err) {
        console.error('Eroare recalculare sold furnizor (create invoice):', err)
      }
    }
    if (!newInvoice) {
      throw new Error('Tranzacția nu a returnat o factură.')
    }

    revalidatePath('/admin/management/incasari-si-plati/payables')
    revalidatePath(`/suppliers/${newInvoice.supplierId.toString()}`)

    return {
      success: true,
      message: `Factura ${newInvoice.invoiceNumber} a fost înregistrată.`,
      data: newInvoice._id.toString(),
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare createSupplierInvoice:', error)
    return { success: false, message: (error as Error).message }
  }
}

export async function getSupplierInvoices(
  page: number = 1,
  limit: number = PAYABLES_PAGE_SIZE,
  filters?: {
    q?: string
    status?: string
    from?: string
    to?: string
  },
) {
  try {
    await connectToDatabase()

    const skip = (page - 1) * limit
    const startOfYear = new Date(new Date().getFullYear(), 0, 1)

    // 1. Construim Query-ul (LA FEL CA ÎNAINTE)
    const query: FilterQuery<typeof SupplierInvoiceModel> = {
      invoiceSeries: { $ne: 'INIT-F' },
    }

    if (filters?.q) {
      const regex = new RegExp(filters.q, 'i')
      const matchingSuppliers = await Supplier.find({ name: regex }).select(
        '_id',
      )
      const supplierIds = matchingSuppliers.map((s) => s._id)

      query.$or = [
        { invoiceNumber: regex },
        { invoiceSeries: regex },
        { supplierId: { $in: supplierIds } },
      ]
    }

    if (filters?.status && filters.status !== 'ALL') {
      if (filters.status === 'STORNO') {
        query.invoiceType = 'STORNO'
      } else {
        query.status = filters.status
      }
    }

    if (filters?.from || filters?.to) {
      query.invoiceDate = {}
      if (filters.from) query.invoiceDate.$gte = new Date(filters.from)
      if (filters.to) {
        const toDate = new Date(filters.to)
        toDate.setHours(23, 59, 59, 999)
        query.invoiceDate.$lte = toDate
      }
    }

    // 2. Executăm Query-urile PARALEL (Inclusiv Agregarea pentru Total)
    const [invoices, total, totalCurrentYear, statsResult] = await Promise.all([
      SupplierInvoiceModel.find(query)
        .populate({
          path: 'supplierId',
          model: Supplier,
          select: 'name',
        })
        .sort({ invoiceDate: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupplierInvoiceModel.countDocuments(query),
      SupplierInvoiceModel.countDocuments({
        invoiceDate: { $gte: startOfYear },
      }),
      SupplierInvoiceModel.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$invoiceType', 'STORNO'] }, // E marcat ca STORNO
                      { $gt: ['$totals.grandTotal', 0] }, // ȘI valoarea e pozitivă (ex: ARTOIL, LEROY)
                    ],
                  },
                  then: { $multiply: ['$totals.grandTotal', -1] }, // O facem negativă
                  else: '$totals.grandTotal', // Altfel o luăm așa cum e (ex: SOCERAM care e deja negativ)
                },
              },
            },
          },
        },
      ]),
    ])

    const normalizedInvoices = JSON.parse(JSON.stringify(invoices))
    // Luăm suma din rezultatul agregării (sau 0 dacă nu sunt rezultate)
    const summaryTotal = statsResult.length > 0 ? statsResult[0].totalValue : 0

    return {
      success: true,
      data: normalizedInvoices as SupplierInvoiceListItem[],
      totalPages: Math.ceil(total / limit),
      total: total,
      totalCurrentYear: totalCurrentYear,
      summaryTotal: summaryTotal, // <--- Trimitem suma calculată
    }
  } catch (error) {
    console.error('❌ Eroare getSupplierInvoices:', error)
    return {
      success: false,
      data: [],
      totalPages: 0,
      total: 0,
      totalCurrentYear: 0,
      summaryTotal: 0,
    }
  }
}

export async function getSupplierInvoiceById(
  invoiceId: string,
): Promise<SingleInvoiceResult> {
  try {
    await connectToDatabase()
    if (!Types.ObjectId.isValid(invoiceId)) {
      return { success: false, message: 'ID Factură invalid.' }
    }

    const invoice = await SupplierInvoiceModel.findById(invoiceId)
      .populate({
        path: 'supplierId',
        model: Supplier,
        select: 'name fiscalCode',
      })
      .lean()

    if (!invoice) {
      return { success: false, message: 'Factura nu a fost găsită.' }
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(invoice)),
    }
  } catch (error) {
    console.error('❌ Eroare getSupplierInvoiceById:', error)
    return { success: false, message: (error as Error).message }
  }
}
export async function getInvoicesForSupplier(
  supplierId: string,
  page: number = 1,
): Promise<SupplierInvoicesPage> {
  try {
    await connectToDatabase()

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      throw new Error('ID Furnizor invalid')
    }

    const objectId = new Types.ObjectId(supplierId)
    const limit = CLIENT_DETAIL_PAGE_SIZE
    const skip = (page - 1) * limit

    const queryConditions = {
      supplierId: objectId,
    }

    const total = await SupplierInvoiceModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0 }
    }

    const invoices = await SupplierInvoiceModel.find(queryConditions)
      .select(
        'invoiceSeries invoiceNumber invoiceDate dueDate status totals.grandTotal',
      )
      .sort({ invoiceDate: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Normalizăm datele
    const normalizedInvoices = invoices.map((inv) => ({
      ...inv,
      _id: inv._id.toString(),
    })) as unknown as SupplierInvoiceListItem[]

    return {
      data: normalizedInvoices,
      totalPages: Math.ceil(total / limit),
      total: total,
    }
  } catch (error) {
    console.error('Eroare la getInvoicesForSupplier:', error)
    return { data: [], totalPages: 0, total: 0 }
  }
}

export async function getReceptionsForSupplier(
  supplierId: string,
  page: number = 1,
): Promise<{
  data: ReceptionListItem[]
  totalPages: number
  total: number
}> {
  try {
    await connectToDatabase()

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      console.error('ID Furnizor invalid:', supplierId)
      return { data: [], totalPages: 0, total: 0 }
    }

    const objectId = new Types.ObjectId(supplierId)
    const limit = CLIENT_DETAIL_PAGE_SIZE // Folosim aceeași constantă ca la facturi (10)
    const skip = (page - 1) * limit

    const queryConditions = {
      supplierId: objectId,
    }

    // 1. Numărăm totalul documentelor
    const total = await NirModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0 }
    }

    // 2. Căutăm documentele cu proiecția corectă (select)
    const receptions = await NirModel.find(queryConditions)
      .select(
        'seriesName nirNumber nirDate invoices destinationLocation totals.grandTotal',
      )
      .sort({ nirDate: -1 }) // Cele mai recente primele
      .skip(skip)
      .limit(limit)
      .lean()

    // 3. Normalizăm datele pentru frontend
    const normalizedReceptions: ReceptionListItem[] = receptions.map(
      (nir: any) => {
        // Construim referința facturii (ex: "AAA 123, BBB 456")
        const invoiceRefs =
          nir.invoices && nir.invoices.length > 0
            ? nir.invoices
                .map((inv: any) => `${inv.series || ''} ${inv.number}`.trim())
                .join(', ')
            : '-'

        return {
          _id: nir._id.toString(),
          series: nir.seriesName, // Din schema: seriesName
          number: nir.nirNumber, // Din schema: nirNumber
          date: nir.nirDate, // Din schema: nirDate
          invoiceReference: invoiceRefs, // Calculat din array-ul invoices
          warehouseName: nir.destinationLocation, // Din schema: destinationLocation
          totalValue: nir.totals?.grandTotal || 0, // Din schema: totals.grandTotal
        }
      },
    )

    return {
      data: normalizedReceptions,
      totalPages: Math.ceil(total / limit),
      total: total,
    }
  } catch (error) {
    console.error('Eroare la getReceptionsForSupplier:', error)
    return { data: [], totalPages: 0, total: 0 }
  }
}
/**
 * SOLD INIȚIAL FURNIZOR (INIT-F)
 * Creează o factură de deschidere sold.
 * - Dacă amount > 0: Datorie (STANDARD)
 * - Dacă amount < 0: Avans/Credit (STORNO sau STANDARD Negativ)
 */
export async function createSupplierOpeningBalance(
  data: CreateOpeningBalanceInput,
): Promise<{ success: boolean; message: string }> {
  const session = await startSession()

  try {
    const result = await session.withTransaction(async (session) => {
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name || 'System Admin'

      if (!userId) throw new Error('Trebuie să fiți autentificat.')

      // 1. Date Furnizor
      const supplier = await Supplier.findById(data.partnerId).session(session)
      if (!supplier) throw new Error('Furnizorul nu a fost găsit.')

      if (!supplier.address) {
        throw new Error(
          `Furnizorul ${supplier.name} nu are adresă configurată.`,
        )
      }

      // 2. Construim Snapshot-ul (AICI ERA EROAREA - ACUM FOLOSIM CÂMPURILE REALE)
      const supplierSnapshot: SupplierSnapshot = {
        name: supplier.name,
        // Verifică dacă ai 'fiscalCode' sau 'cui' pe modelul Supplier. De obicei e fiscalCode.
        cui: (supplier as any).fiscalCode || (supplier as any).cui || '-',
        regCom:
          (supplier as any).tradeRegister || (supplier as any).regCom || '-',

        // AICI AM CORECTAT MAPAREA CONFORM ERORII TALE:
        address: {
          judet: supplier.address.judet,
          localitate: supplier.address.localitate,
          strada: supplier.address.strada,
          numar: supplier.address.numar || '',
          codPostal: supplier.address.codPostal,
          tara: supplier.address.tara,
          alteDetalii: supplier.address.alteDetalii || '',
        },

        // Banca (presupunând că bankAccountLei există pe model, altfel verifică modelul Supplier)
        bank: (supplier as any).bankAccountLei?.bankName || '',
        iban: (supplier as any).bankAccountLei?.iban || '',

        contactName: '',
        contactEmail: supplier.email || '',
        contactPhone: supplier.phone || '',
      }

      // 3. Date Companie
      const companySettings = await getSetting()
      if (!companySettings)
        throw new Error('Setările companiei nu sunt configurate.')
      const ourCompanySnapshot = buildCompanySnapshot(companySettings)

      // 4. Numerotare
      const seriesName = 'INIT-F'
      const nextNumber = await generateNextDocumentNumber(seriesName, {
        session,
      })
      const invoiceNumber = String(nextNumber).padStart(4, '0')

      // 5. Logică Semn
      const isNegative = data.amount < 0
      const absoluteAmount = Math.abs(data.amount)
      const invoiceType = isNegative ? 'STORNO' : 'STANDARD'

      // 6. Creare Factură
      await SupplierInvoiceModel.create(
        [
          {
            supplierId: new Types.ObjectId(data.partnerId),
            invoiceSeries: seriesName,
            invoiceNumber: invoiceNumber,
            invoiceDate: data.date,
            dueDate: data.date,
            invoiceType: invoiceType,
            status: 'NEPLATITA',
            supplierSnapshot,
            ourCompanySnapshot,
            items: [
              {
                productName: isNegative
                  ? 'Preluare Sold Creditor (Avans/Retur)'
                  : 'Preluare Sold Datorat',
                quantity: 1,
                unitOfMeasure: 'buc',
                unitPrice: isNegative ? -absoluteAmount : absoluteAmount,
                lineValue: isNegative ? -absoluteAmount : absoluteAmount,
                vatRateDetails: { rate: 0, value: 0 },
                lineTotal: isNegative ? -absoluteAmount : absoluteAmount,
              },
            ],
            totals: {
              productsSubtotal: isNegative ? -absoluteAmount : absoluteAmount,
              productsVat: 0,
              packagingSubtotal: 0,
              packagingVat: 0,
              servicesSubtotal: 0,
              servicesVat: 0,
              manualSubtotal: 0,
              manualVat: 0,
              subtotal: isNegative ? -absoluteAmount : absoluteAmount,
              vatTotal: 0,
              grandTotal: isNegative ? -absoluteAmount : absoluteAmount,
              payableAmount: isNegative ? -absoluteAmount : absoluteAmount,
            },
            isManualEntry: true,
            notes:
              data.details ||
              `Sold inițial preluat automat (${seriesName}-${invoiceNumber})`,
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
            paidAmount: 0,
            remainingAmount: isNegative ? -absoluteAmount : absoluteAmount,
          },
        ],
        { session },
      )
    })

    await recalculateSupplierSummary(
      data.partnerId,
      'init-balance-update',
      true,
    )
    return {
      success: true,
      message: 'Sold inițial furnizor înregistrat cu succes.',
    }
  } catch (error) {
    console.error('Err createSupplierOpeningBalance:', error)
    return { success: false, message: (error as Error).message }
  } finally {
    await session.endSession()
  }
}
