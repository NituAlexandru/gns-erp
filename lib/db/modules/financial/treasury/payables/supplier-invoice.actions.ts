'use server'

import { startSession, Types } from 'mongoose'
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

// FIX: Tipul de retur este acum 'OurCompanySnapshot'
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

type SupplierInvoiceActionResult = {
  success: boolean
  message: string
  data?: string // Returnează ID-ul noii facturi
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

    if (!newInvoice) {
      throw new Error('Tranzacția nu a returnat o factură.')
    }

    revalidatePath('/incasari-si-plati/payables')
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

// TODO: Adaugă aici 'getSupplierInvoices' (pentru listare)
// TODO: Adaugă aici 'getSupplierInvoiceById' (pentru detalii)
// TODO: Adaugă aici 'updateSupplierInvoice' (dacă permiți editarea)
