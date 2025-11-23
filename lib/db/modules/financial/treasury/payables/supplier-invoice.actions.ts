'use server'

import mongoose, { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import SupplierInvoiceModel from './supplier-invoice.model'
import {
  CreateSupplierInvoiceInput,
  ISupplierInvoiceDoc,
  OurCompanySnapshot,
} from './supplier-invoice.types'
import { CreateSupplierInvoiceSchema } from './supplier-invoice.validator'
import { revalidatePath } from 'next/cache'
import { getSetting } from '../../../setting/setting.actions'
import { ISettingInput } from '../../../setting/types'
import { connectToDatabase } from '@/lib/db'
import Supplier from '../../../suppliers/supplier.model'
import { SupplierInvoiceStatus } from './supplier-invoice.constants'
import { CLIENT_DETAIL_PAGE_SIZE } from '@/lib/constants'
import { recalculateSupplierSummary } from '../../../suppliers/summary/supplier-summary.actions'

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
  totals: {
    grandTotal: number
  }
}

export type SupplierInvoicesPage = {
  data: SupplierInvoiceListItem[]
  totalPages: number
  total: number
}
function buildCompanySnapshot(settings: ISettingInput): OurCompanySnapshot {
  const defaultEmail = settings.emails.find((e) => e.isDefault)
  const defaultPhone = settings.phones.find((p) => p.isDefault)
  const defaultBank = settings.bankAccounts.find((b) => b.isDefault)

  if (!defaultEmail || !defaultPhone || !defaultBank) {
    throw new Error(
      'Setările implicite (email, telefon, bancă) nu sunt configurate.'
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
  data: CreateSupplierInvoiceInput
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
        { session }
      )

      return createdInvoice
    })

    await session.endSession()

    if (newInvoice) {
      try {
        await recalculateSupplierSummary(
          newInvoice.supplierId.toString(),
          'auto-recalc',
          true
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

export async function getSupplierInvoices() {
  try {
    await connectToDatabase()

    const invoices = await SupplierInvoiceModel.find()
      .populate({
        path: 'supplierId',
        model: Supplier,
        select: 'name',
      })
      .sort({ invoiceDate: -1 })
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(invoices)),
    }
  } catch (error) {
    console.error('❌ Eroare getSupplierInvoices:', error)
    return { success: false, data: [] }
  }
}

export async function getSupplierInvoiceById(
  invoiceId: string
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
  page: number = 1
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
        'invoiceSeries invoiceNumber invoiceDate dueDate status totals.grandTotal'
      )
      .sort({ invoiceDate: -1 })
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
