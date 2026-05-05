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
import {
  CLIENT_DETAIL_PAGE_SIZE,
  PAYABLES_PAGE_SIZE,
  TIMEZONE,
} from '@/lib/constants'
import { recalculateSupplierSummary } from '../../../suppliers/summary/supplier-summary.actions'
import NirModel from '../../nir/nir.model'
import { generateNextDocumentNumber } from '../../../numbering/numbering.actions'
import { CreateOpeningBalanceInput } from '../../initial-balance/initial-balance.validator'
import SupplierAllocationModel from './supplier-allocation.model'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import { differenceInCalendarDays, differenceInDays } from 'date-fns'
import { round2 } from '@/lib/utils'
//
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
    originalCurrencyTotal: number
  }
  originalCurrency: string

  createdAt: Date
  supplierId?: {
    _id: string
    name: string
  } | null
  eFacturaXMLId?: string
  notes?: string
}

export type SupplierInvoicesPage = {
  data: SupplierInvoiceListItem[]
  totalPages: number
  total: number
  totalCurrentYear?: number
  totalSum?: number
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

export type SupplierBalanceItemDTO = {
  _id: string
  type: 'INVOICE' | 'PAYMENT'
  seriesName: string | null
  documentNumber: string
  date: Date | string
  dueDate: Date | string | null
  grandTotal: number
  invoiceType: string | null
  remainingAmount: number
  mathematicalRemaining: number
  daysOverdue: number
  status: string
}

export type SupplierBalanceSummary = {
  supplierId: string
  supplierName: string
  totalBalance: number
  invoicesCount: number
  paymentsCount: number
  compensationsCount: number
  overdueCount: number
  items: SupplierBalanceItemDTO[]
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
  await connectToDatabase()
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
    dateType?: string
    onlyOverdue?: boolean
  },
) {
  try {
    await connectToDatabase()

    const skip = (page - 1) * limit
    const startOfYear = fromZonedTime(
      `${new Date().getFullYear()}-01-01 00:00:00`,
      TIMEZONE,
    )

    // 1. Construim Query-ul
    const query: FilterQuery<typeof SupplierInvoiceModel> = {}

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
        // Căutăm FIE documente marcate explicit STORNO, FIE documente cu total negativ
        query.$and = query.$and || []
        query.$and.push({
          $or: [{ invoiceType: 'STORNO' }, { 'totals.grandTotal': { $lt: 0 } }],
        })
      } else {
        query.status = filters.status
      }
    }

    if (filters?.from || filters?.to) {
      const dateField = filters?.dateType === 'due' ? 'dueDate' : 'invoiceDate'
      query[dateField] = {}

      if (filters.from) {
        // Transformăm "2026-01-26" (RO) -> UTC-ul corespunzător orei 00:00 în RO
        // Ex: 2026-01-26 00:00:00 RO devine 2026-01-25 22:00:00 UTC
        const fromDateRO = fromZonedTime(
          `${filters.from} 00:00:00.000`,
          TIMEZONE,
        )
        query[dateField].$gte = fromDateRO
      }

      if (filters.to) {
        // Transformăm "2026-01-26" (RO) -> UTC-ul corespunzător orei 23:59 în RO
        // Ex: 2026-01-26 23:59:59 RO devine 2026-01-26 21:59:59 UTC
        const toDateRO = fromZonedTime(`${filters.to} 23:59:59.999`, TIMEZONE)
        query[dateField].$lte = toDateRO
      }
    }

    if (filters?.onlyOverdue) {
      const todayRO = toZonedTime(new Date(), TIMEZONE)
      query.$and = query.$and || []
      // Scadența e în trecut (mai mică decât data de azi)
      query.$and.push({ dueDate: { $lt: todayRO } })
      // Factura nu e închisă (e neplătită sau parțial plătită)
      query.$and.push({ status: { $in: ['NEPLATITA', 'PARTIAL_PLATITA'] } })
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
          $project: {
            mathTotal: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ['$invoiceType', 'STORNO'] },
                    { $gt: ['$totals.grandTotal', 0] },
                  ],
                },
                then: { $multiply: ['$totals.grandTotal', -1] },
                else: { $ifNull: ['$totals.grandTotal', 0] },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$mathTotal' },
            totalPositive: {
              $sum: { $cond: [{ $gt: ['$mathTotal', 0] }, '$mathTotal', 0] },
            },
            totalNegative: {
              $sum: { $cond: [{ $lt: ['$mathTotal', 0] }, '$mathTotal', 0] },
            },
          },
        },
      ]),
    ])

    const normalizedInvoices = JSON.parse(JSON.stringify(invoices))

    // Extragem toate cele 3 sume calculate
    const summaryTotal = statsResult.length > 0 ? statsResult[0].totalValue : 0
    const summaryPositive =
      statsResult.length > 0 ? statsResult[0].totalPositive : 0
    const summaryNegative =
      statsResult.length > 0 ? statsResult[0].totalNegative : 0

    return {
      success: true,
      data: normalizedInvoices as SupplierInvoiceListItem[],
      totalPages: Math.ceil(total / limit),
      total: total,
      totalCurrentYear: totalCurrentYear,
      summaryTotal: summaryTotal,
      summaryPositive: summaryPositive,
      summaryNegative: summaryNegative,
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
      summaryPositive: 0,
      summaryNegative: 0,
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
  startDateStr?: string,
  endDateStr?: string,
): Promise<SupplierInvoicesPage> {
  try {
    await connectToDatabase()

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      throw new Error('ID Furnizor invalid')
    }

    const objectId = new Types.ObjectId(supplierId)
    const limit = CLIENT_DETAIL_PAGE_SIZE
    const skip = (page - 1) * limit

    const currentDate = new Date()
    const currentYearStr = formatInTimeZone(currentDate, TIMEZONE, 'yyyy')

    const start = startDateStr
      ? fromZonedTime(`${startDateStr}T00:00:00.000`, TIMEZONE)
      : fromZonedTime(`${currentYearStr}-01-01T00:00:00.000`, TIMEZONE)

    const end = endDateStr
      ? fromZonedTime(`${endDateStr}T23:59:59.999`, TIMEZONE)
      : fromZonedTime(`${currentYearStr}-12-31T23:59:59.999`, TIMEZONE)

    const queryConditions = {
      supplierId: objectId,
      invoiceDate: { $gte: start, $lte: end },
    }

    const total = await SupplierInvoiceModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0, totalSum: 0 }
    }

    const sumAggregation = await SupplierInvoiceModel.aggregate([
      {
        $match: {
          ...queryConditions,
          status: { $ne: 'CANCELLED' },
        },
      },
      {
        $group: {
          _id: null,
          totalSum: {
            $sum: {
              $cond: [
                { $eq: ['$invoiceType', 'STORNO'] },
                // Dacă e STORNO: luăm valoarea absolută (ca să fim siguri) și o înmulțim cu -1 pentru a o scădea
                { $multiply: [{ $abs: '$totals.grandTotal' }, -1] },
                // Dacă NU e STORNO (adică e STANDARD): o lăsăm fix cum e (pozitivă se adună, negativă se scade)
                '$totals.grandTotal',
              ],
            },
          },
        },
      },
    ])

    const totalSum = sumAggregation.length > 0 ? sumAggregation[0].totalSum : 0

    const invoices = await SupplierInvoiceModel.find(queryConditions)
      .select(
        'invoiceSeries invoiceNumber invoiceDate dueDate status invoiceType totals.grandTotal',
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
      totalSum: totalSum,
    }
  } catch (error) {
    console.error('Eroare la getInvoicesForSupplier:', error)
    return { data: [], totalPages: 0, total: 0, totalSum: 0 }
  }
}

export async function getReceptionsForSupplier(
  supplierId: string,
  page: number = 1,
  startDateStr?: string,
  endDateStr?: string,
): Promise<{
  data: ReceptionListItem[]
  totalPages: number
  total: number
  totalSum?: number
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

    const currentDate = new Date()
    const currentYearStr = formatInTimeZone(currentDate, TIMEZONE, 'yyyy')

    const start = startDateStr
      ? fromZonedTime(`${startDateStr}T00:00:00.000`, TIMEZONE)
      : fromZonedTime(`${currentYearStr}-01-01T00:00:00.000`, TIMEZONE)

    const end = endDateStr
      ? fromZonedTime(`${endDateStr}T23:59:59.999`, TIMEZONE)
      : fromZonedTime(`${currentYearStr}-12-31T23:59:59.999`, TIMEZONE)

    const queryConditions = {
      supplierId: objectId,
      nirDate: { $gte: start, $lte: end },
    }

    // 1. Numărăm totalul documentelor
    const total = await NirModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0, totalSum: 0 }
    }

    // --- COD NOU PENTRU TOTAL SUM ---
    const sumAggregation = await NirModel.aggregate([
      { $match: queryConditions }, // Dacă ai status 'ANULAT' la recepții, adaugă aici: { ...queryConditions, status: { $ne: 'ANULAT' } }
      {
        $group: {
          _id: null,
          totalSum: { $sum: '$totals.grandTotal' },
        },
      },
    ])

    const totalSum = sumAggregation.length > 0 ? sumAggregation[0].totalSum : 0

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
      totalSum: totalSum,
    }
  } catch (error) {
    console.error('Eroare la getReceptionsForSupplier:', error)
    return { data: [], totalPages: 0, total: 0, totalSum: 0 }
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
  await connectToDatabase()
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

export async function updateSupplierInvoice(
  invoiceId: string,
  data: CreateSupplierInvoiceInput,
): Promise<SupplierInvoiceActionResult> {
  await connectToDatabase() // 1. Conectare sigură la început
  const session = await startSession()
  let updatedInvoice: ISupplierInvoiceDoc | null = null

  try {
    // Începem blocul TRY. Aici punem tranzacția.
    updatedInvoice = await session.withTransaction(async (session) => {
      // 1. Auth
      const authSession = await auth()
      if (!authSession?.user?.id) throw new Error('Utilizator neautentificat.')

      // 2. Găsire Factură
      const existingInvoice =
        await SupplierInvoiceModel.findById(invoiceId).session(session)
      if (!existingInvoice) throw new Error('Factura nu a fost găsită.')

      // 3. GUARD: E-Factura
      if (existingInvoice.eFacturaXMLId) {
        throw new Error('Nu puteți modifica o factură importată din e-Factura.')
      }

      if (
        existingInvoice.status === 'PLATITA' ||
        existingInvoice.status === 'PARTIAL_PLATITA'
      ) {
        throw new Error(
          'Nu puteți modifica o factură plătită sau parțial plătită. Vă rugăm să anulați plățile (alocările) aferente înainte de a modifica factura.',
        )
      }

      // 4. GUARD: Alocări (Plăți)
      const allocationCount = await SupplierAllocationModel.countDocuments({
        invoiceId: existingInvoice._id,
      }).session(session)

      if (allocationCount > 0) {
        throw new Error(
          'Factura are plăți alocate. Ștergeți alocările (plățile) înainte de a modifica factura.',
        )
      }

      // 5. Pregătire date noi
      const validatedData = CreateSupplierInvoiceSchema.parse(data)

      const companySettings = await getSetting()
      if (!companySettings) throw new Error('Setările companiei lipsesc.')
      const ourCompanySnapshot = buildCompanySnapshot(companySettings)

      // 6. Update
      existingInvoice.supplierId = new Types.ObjectId(validatedData.supplierId)
      existingInvoice.supplierSnapshot = validatedData.supplierSnapshot
      existingInvoice.invoiceType = validatedData.invoiceType
      existingInvoice.invoiceSeries = validatedData.invoiceSeries
      existingInvoice.invoiceNumber = validatedData.invoiceNumber
      existingInvoice.invoiceDate = validatedData.invoiceDate
      existingInvoice.dueDate = validatedData.dueDate
      existingInvoice.items = validatedData.items as any
      existingInvoice.totals = validatedData.totals
      existingInvoice.notes = validatedData.notes
      existingInvoice.ourCompanySnapshot = ourCompanySnapshot

      existingInvoice.paidAmount = 0
      existingInvoice.remainingAmount = validatedData.totals.grandTotal
      existingInvoice.status = 'NEPLATITA'

      await existingInvoice.save({ session })

      return existingInvoice
    })
  } catch (error) {
    console.error('❌ Eroare updateSupplierInvoice:', error)
    return { success: false, message: (error as Error).message }
  } finally {
    await session.endSession()
  }

  if (updatedInvoice) {
    try {
      await recalculateSupplierSummary(
        (updatedInvoice as ISupplierInvoiceDoc).supplierId.toString(),
        'auto-recalc',
        true,
      )
    } catch (recalcError) {
      console.error('Eroare la recalculare sold după update:', recalcError)
    }
  }

  revalidatePath('/admin/management/incasari-si-plati/payables/facturi')
  revalidatePath(`/financial/invoices/${invoiceId}`)

  return {
    success: true,
    message: 'Factura a fost actualizată cu succes.',
  }
}
/**
 * ȘTERGERE FACTURĂ MANUALĂ
 */
export async function deleteSupplierInvoice(
  invoiceId: string,
): Promise<{ success: boolean; message: string }> {
  await connectToDatabase()
  const session = await startSession()
  let supplierIdToRecalc = ''

  try {
    await session.withTransaction(async (session) => {
      // 1. Auth
      const authSession = await auth()
      if (!authSession?.user?.id) throw new Error('Utilizator neautentificat.')

      // 2. Găsire
      const invoice =
        await SupplierInvoiceModel.findById(invoiceId).session(session)
      if (!invoice) throw new Error('Factura nu a fost găsită.')

      supplierIdToRecalc = invoice.supplierId.toString()

      // 3. GUARD: E-Factura
      if (invoice.eFacturaXMLId) {
        throw new Error('Nu puteți șterge o factură importată din e-Factura.')
      }

      if (
        invoice.status === 'PLATITA' ||
        invoice.status === 'PARTIAL_PLATITA'
      ) {
        throw new Error(
          'Nu puteți șterge o factură plătită sau parțial plătită. Vă rugăm să anulați plățile (alocările) aferente înainte de a șterge factura.',
        )
      }

      // 4. GUARD: Alocări
      const allocationCount = await SupplierAllocationModel.countDocuments({
        invoiceId: invoice._id,
      }).session(session)

      if (allocationCount > 0) {
        throw new Error(
          'Factura are plăți alocate. Ștergeți alocările înainte de a șterge factura.',
        )
      }

      // 5. Delete
      await SupplierInvoiceModel.findByIdAndDelete(invoiceId).session(session)
    })

    await session.endSession()

    if (supplierIdToRecalc) {
      await recalculateSupplierSummary(supplierIdToRecalc, 'auto-recalc', true)
    }

    revalidatePath('/admin/management/incasari-si-plati/payables/facturi')

    return { success: true, message: 'Factura a fost ștearsă cu succes.' }
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction()
    await session.endSession()
    console.error('❌ Eroare deleteSupplierInvoice:', error)
    return { success: false, message: (error as Error).message }
  }
}

export async function getSupplierBalances(
  searchQuery?: string,
  filters?: {
    balanceType?: string
    minAmt?: string
    maxAmt?: string
    overdueDays?: string
    onlyOverdue?: boolean
    dateType?: string
    startDate?: string
    endDate?: string
  },
): Promise<{
  data: SupplierBalanceSummary[]
  summary: {
    totalNetBalance: number
    totalUnpaidInvoices: number
    totalUnallocatedAdvances: number
  }
}> {
  try {
    await connectToDatabase()

    // --- Faza 1: Filtrarea Facturilor ---
    const matchConditions: any = {
      remainingAmount: { $ne: 0 },
      status: { $ne: 'ANULATA' },
    }

    // Filtrul de Dată acționează STRICT pe Facturi
    if (filters?.startDate || filters?.endDate) {
      const dateField = filters?.dateType === 'due' ? 'dueDate' : 'invoiceDate'
      matchConditions[dateField] = {}

      if (filters.startDate) {
        matchConditions[dateField].$gte = fromZonedTime(
          `${filters.startDate} 00:00:00.000`,
          TIMEZONE,
        )
      }
      if (filters.endDate) {
        matchConditions[dateField].$lte = fromZonedTime(
          `${filters.endDate} 23:59:59.999`,
          TIMEZONE,
        )
      }
    }

    const pipeline: any[] = [
      // 1. Aducem Facturile Furnizorilor
      { $match: matchConditions },
      // 1.1 Standardizăm formatul
      {
        $project: {
          supplierId: 1,
          supplierSnapshot: 1,
          type: { $literal: 'INVOICE' },
          seriesName: '$invoiceSeries',
          documentNumber: '$invoiceNumber',
          date: '$invoiceDate',
          dueDate: 1,
          grandTotal: '$totals.grandTotal',
          remainingAmount: 1,
          invoiceType: 1,
          status: 1,
          originalCurrency: 1,
          originalCurrencyTotal: '$totals.originalCurrencyTotal',
        },
      },
      // 2. UNION: Turnăm și plățile nealocate
      {
        $unionWith: {
          coll: 'supplierpayments', // Colecția nativă Mongoose pentru plăți
          pipeline: [
            {
              $match: {
                unallocatedAmount: { $ne: 0 },
                status: { $in: ['NEALOCATA', 'PARTIAL_ALOCATA'] },
              },
            },
            {
              $project: {
                supplierId: 1,
                supplierSnapshot: { $literal: null },
                type: { $literal: 'PAYMENT' },
                seriesName: 1,
                documentNumber: '$paymentNumber',
                date: '$paymentDate',
                dueDate: { $literal: null },
                grandTotal: '$totalAmount',
                remainingAmount: '$unallocatedAmount',
                invoiceType: { $literal: null },
                status: 1,
              },
            },
          ],
        },
      },
      // 3. Grupare pe Furnizor
      {
        $group: {
          _id: '$supplierId',
          // Luăm primul snapshot non-null
          supplierSnapshot: { $max: '$supplierSnapshot' },

          // SOLD NET: Adunăm datoriile, scădem creditele
          totalBalance: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'PAYMENT'] },
                { $multiply: ['$remainingAmount', -1] }, // Plata scade datoria
                {
                  $cond: [
                    {
                      // Dacă e STORNO și are sumă pozitivă în DB, trebuie scăzută
                      $and: [
                        { $eq: ['$invoiceType', 'STORNO'] },
                        { $gt: ['$remainingAmount', 0] },
                      ],
                    },
                    { $multiply: ['$remainingAmount', -1] },
                    // Altfel, o adunăm (dacă e deja negativă se va scădea natural)
                    '$remainingAmount',
                  ],
                },
              ],
            },
          },
          invoicesCount: {
            $sum: { $cond: [{ $eq: ['$type', 'INVOICE'] }, 1, 0] },
          },
          paymentsCount: {
            $sum: { $cond: [{ $eq: ['$type', 'PAYMENT'] }, 1, 0] },
          },
          compensationsCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'INVOICE'] },
                    {
                      $or: [
                        { $lt: ['$remainingAmount', 0] },
                        {
                          $and: [
                            { $eq: ['$invoiceType', 'STORNO'] },
                            { $gt: ['$remainingAmount', 0] },
                          ],
                        },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          items: { $push: '$$ROOT' },
        },
      },
      // 4. Aplicăm filtrele globale de sume sau de tip sold
      ...(() => {
        const groupMatchConditions: any = {}
        const totalBalanceQuery: any = {}

        if (filters?.minAmt && !isNaN(Number(filters.minAmt))) {
          totalBalanceQuery.$gte = Number(filters.minAmt)
        }
        if (filters?.maxAmt && !isNaN(Number(filters.maxAmt))) {
          totalBalanceQuery.$lte = Number(filters.maxAmt)
        }

        if (filters?.balanceType === 'DEBT') totalBalanceQuery.$gt = 0
        if (filters?.balanceType === 'ADVANCE') totalBalanceQuery.$lt = 0
        if (filters?.balanceType === 'UNALLOCATED')
          groupMatchConditions.paymentsCount = { $gt: 0 }

        if (Object.keys(totalBalanceQuery).length > 0) {
          groupMatchConditions.totalBalance = totalBalanceQuery
        }

        return Object.keys(groupMatchConditions).length > 0
          ? [{ $match: groupMatchConditions }]
          : []
      })(),
      // 5. Lookup Nume Furnizor
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierDetails',
        },
      },
      // 6. Flatten Nume
      {
        $addFields: {
          computedName: {
            $ifNull: [
              { $arrayElemAt: ['$supplierDetails.name', 0] },
              '$supplierSnapshot.name',
              'Furnizor Necunoscut',
            ],
          },
        },
      },
    ]

    // 7. Căutare Text
    if (searchQuery) {
      pipeline.push({
        $match: {
          computedName: { $regex: searchQuery, $options: 'i' },
        },
      })
    }

    // 8. Sortare Sold
    if (filters?.balanceType === 'ADVANCE') {
      pipeline.push({ $sort: { totalBalance: 1 } })
    } else {
      pipeline.push({ $sort: { totalBalance: -1 } })
    }

    const results = await SupplierInvoiceModel.aggregate(pipeline)
    const now = new Date()
    const todayZoned = toZonedTime(now, TIMEZONE)

    // --- FAZA DE POST-PROCESARE (JS) ---
    let formattedResults: any[] = results.map((group) => {
      let overdueCount = 0

      const processedItems = group.items.map((item: any) => {
        if (item.type === 'INVOICE') {
          // Standardizare: Orice storno devine "minus matematic"
          let actualRemaining = item.remainingAmount
          if (item.invoiceType === 'STORNO' && item.remainingAmount > 0) {
            actualRemaining = -item.remainingAmount
          }

          let daysOverdue = 0
          // Doar o factură cu datorie reală (actualRemaining > 0) poate fi întârziată
          if (actualRemaining > 0 && item.dueDate) {
            const dueDateZoned = toZonedTime(new Date(item.dueDate), TIMEZONE)
            const diff = differenceInCalendarDays(todayZoned, dueDateZoned)
            if (diff > 0) {
              daysOverdue = diff
              overdueCount++
            }
          }

          return {
            _id: item._id.toString(),
            type: item.type,
            seriesName: item.seriesName,
            documentNumber: item.documentNumber,
            date: item.date,
            dueDate: item.dueDate,
            grandTotal: item.grandTotal,
            invoiceType: item.invoiceType,
            remainingAmount: item.remainingAmount, // Păstrăm cum e în DB pentru UI
            mathematicalRemaining: actualRemaining, // Păstrăm o referință clară pentru noi
            daysOverdue: daysOverdue,
            status: item.status,
            originalCurrency: item.originalCurrency,
            originalCurrencyTotal: item.originalCurrencyTotal,
          }
        } else {
          // Este PLATĂ
          const payDateZoned = toZonedTime(new Date(item.date), TIMEZONE)
          const daysSincePayment = Math.max(
            0,
            differenceInCalendarDays(todayZoned, payDateZoned),
          )

          return {
            _id: item._id.toString(),
            type: item.type,
            seriesName: item.seriesName,
            documentNumber: item.documentNumber,
            date: item.date,
            dueDate: null,
            grandTotal: item.grandTotal,
            remainingAmount: item.remainingAmount,
            mathematicalRemaining: -item.remainingAmount,
            daysOverdue: daysSincePayment,
            status: item.status,
          }
        }
      })

      // Sortare după dată (cele mai vechi primele)
      processedItems.sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      )

      return {
        supplierId: group._id.toString(),
        supplierName: group.computedName,
        totalBalance: round2(group.totalBalance),
        invoicesCount: group.invoicesCount,
        paymentsCount: group.paymentsCount,
        compensationsCount: group.compensationsCount,
        overdueCount: overdueCount,
        items: processedItems,
      }
    })

    // Filtre adiționale pentru zile de întârziere
    const isOverdueType = filters?.balanceType === 'OVERDUE'
    const hasOverdueDaysFilter =
      filters?.overdueDays && filters.overdueDays !== 'ALL'

    if (filters?.onlyOverdue) {
      // Păstrează doar clienții care au măcar o factură întârziată,
      // și pe ei curăță-i să aibă DOAR acele facturi afișate
      formattedResults = formattedResults
        .map((client) => {
          const onlyOverdueItems = client.items.filter(
            (i: any) =>
              i.type === 'INVOICE' &&
              i.mathematicalRemaining > 0 &&
              i.daysOverdue > 0,
          )
          const newTotalBalance = onlyOverdueItems.reduce(
            (acc: number, i: any) => acc + i.mathematicalRemaining,
            0,
          )
          return {
            ...client,
            items: onlyOverdueItems,
            totalBalance: round2(newTotalBalance),
          }
        })
        .filter((c) => c.items.length > 0)
    } else if (isOverdueType || hasOverdueDaysFilter) {
      let minDays = 0
      if (hasOverdueDaysFilter) {
        minDays = Number(filters.overdueDays)
      }
      formattedResults = formattedResults.filter((c) => {
        return c.items.some(
          (item: any) =>
            item.type === 'INVOICE' &&
            item.mathematicalRemaining > 0 &&
            item.daysOverdue > minDays,
        )
      })
    }

    // Sortare Finală pe Array (Re-asigurare)
    if (filters?.balanceType === 'ADVANCE') {
      formattedResults.sort((a, b) => a.totalBalance - b.totalBalance)
    } else {
      formattedResults.sort((a, b) => b.totalBalance - a.totalBalance)
    }

    // Calculăm Summary-ul pentru Cardurile din Susul Paginii
    let totalNetBalance = 0
    let totalUnpaidInvoices = 0
    let totalUnallocatedAdvances = 0

    formattedResults.forEach((supplier) => {
      totalNetBalance += supplier.totalBalance

      supplier.items.forEach((item: any) => {
        if (item.type === 'INVOICE') {
          if (item.mathematicalRemaining > 0) {
            totalUnpaidInvoices += item.mathematicalRemaining
          } else {
            // Este Storno (bani blocați ce pot fi compensați)
            totalUnallocatedAdvances += Math.abs(item.mathematicalRemaining)
          }
        } else if (item.type === 'PAYMENT') {
          totalUnallocatedAdvances += item.remainingAmount
        }
      })
    })

    return {
      data: formattedResults,
      summary: {
        totalNetBalance: round2(totalNetBalance),
        totalUnpaidInvoices: round2(totalUnpaidInvoices),
        totalUnallocatedAdvances: round2(totalUnallocatedAdvances),
      },
    }
  } catch (error) {
    console.error('Eroare getSupplierBalances:', error)
    return {
      data: [],
      summary: {
        totalNetBalance: 0,
        totalUnpaidInvoices: 0,
        totalUnallocatedAdvances: 0,
      },
    }
  }
}

export async function updateSupplierInvoiceNotes(
  invoiceId: string,
  notes: string,
): Promise<{ success: boolean; message: string }> {
  await connectToDatabase()
  try {
    const authSession = await auth()
    if (!authSession?.user?.id) throw new Error('Utilizator neautentificat.')

    const invoice = await SupplierInvoiceModel.findById(invoiceId)
    if (!invoice) throw new Error('Factura nu a fost găsită.')

    // Actualizăm exclusiv câmpul de notițe
    invoice.notes = notes
    await invoice.save()

    revalidatePath('/admin/management/incasari-si-plati/payables/facturi')
    revalidatePath(`/financial/invoices/${invoiceId}`)

    return {
      success: true,
      message: 'Mențiunile au fost actualizate cu succes.',
    }
  } catch (error) {
    console.error('❌ Eroare updateSupplierInvoiceNotes:', error)
    return { success: false, message: (error as Error).message }
  }
}
