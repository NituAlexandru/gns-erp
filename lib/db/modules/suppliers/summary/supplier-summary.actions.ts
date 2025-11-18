'use server'

import { connectToDatabase } from '@/lib/db'
import Supplier from '../supplier.model'
import SupplierSummary, { ISupplierSummary } from './supplier-summary.model'
import mongoose, { PipelineStage, Types } from 'mongoose'
import SupplierPaymentModel from '../../financial/treasury/payables/supplier-payment.model'
import SupplierInvoiceModel from '../../financial/treasury/payables/supplier-invoice.model'
import { revalidatePath } from 'next/cache'
import {
  PAYMENT_METHOD_MAP,
  PAYMENT_METHODS,
  PaymentMethodKey,
} from '../../financial/treasury/payment.constants'

export interface SupplierLedgerEntry {
  _id: string
  date: Date
  documentType: string
  documentNumber: string
  details: string
  debit: number
  credit: number
  runningBalance: number
}

export async function findOrCreateSupplierSummary(supplierId: string) {
  await connectToDatabase()
  if (!mongoose.Types.ObjectId.isValid(supplierId)) {
    throw new Error('ID Furnizor invalid')
  }

  try {
    let summary = await SupplierSummary.findOne({ supplierId })

    if (!summary) {
      const supplier = await Supplier.findById(supplierId)
      if (!supplier) throw new Error('Furnizorul nu a fost găsit.')

      summary = await SupplierSummary.create({
        supplierId,
        paymentBalance: 0,
        overduePaymentBalance: 0,
      })
    }

    return JSON.parse(JSON.stringify(summary))
  } catch (error) {
    let errorMessage = 'A apărut o eroare necunoscută.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Eroare la findOrCreateSupplierSummary: ${errorMessage}`)
    throw new Error('Nu s-a putut găsi sau crea sumarul pentru furnizor.')
  }
}

export async function getSupplierSummary(supplierId: string) {
  await connectToDatabase()
  if (!mongoose.Types.ObjectId.isValid(supplierId)) return null

  try {
    const summary = await SupplierSummary.findOne({ supplierId })
    if (!summary) {
      return await findOrCreateSupplierSummary(supplierId)
    }
    return JSON.parse(JSON.stringify(summary))
  } catch (error) {
    let errorMessage = 'A apărut o eroare necunoscută.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Eroare la getSupplierSummary: ${errorMessage}`)
    return null
  }
}

/**
 * Calculează Ledger-ul Furnizorului și actualizează cache-ul SupplierSummary.
 * Debit = Plăți (scade datoria)
 * Credit = Facturi (crește datoria)
 */
export async function getSupplierLedger(
  supplierId: string,
  supplierSlug?: string
): Promise<{
  success: boolean
  data: SupplierLedgerEntry[]
  message?: string
}> {
  try {
    await connectToDatabase()

    if (!Types.ObjectId.isValid(supplierId)) {
      throw new Error('ID Furnizor invalid')
    }

    const id = new Types.ObjectId(supplierId)
    const now = new Date()

    // Construim dinamic condițiile pentru a afișa numele frumos
    const paymentMethodBranches = (PAYMENT_METHODS as readonly string[]).map(
      (method) => ({
        case: { $eq: ['$paymentMethod', method] },
        then: `Plată prin ${
          PAYMENT_METHOD_MAP[method as PaymentMethodKey]?.name || method
        }`,
      })
    )

    // 1. Ramura DEBIT (Plăți -> Scad datoria)
    const debitPipeline: PipelineStage[] = [
      {
        $match: {
          supplierId: id,
          status: { $ne: 'ANULATA' },
        },
      },
      {
        $project: {
          _id: 1,
          date: '$paymentDate',
          documentType: { $literal: 'Plată' },
          documentNumber: {
            $concat: [
              { $ifNull: ['$seriesName', ''] },
              ' ',
              { $ifNull: ['$paymentNumber', ''] },
            ],
          },
        
          details: {
            $switch: {
              branches: paymentMethodBranches,
              default: 'Plată (Altă Metodă)',
            },
          },
          debit: '$totalAmount',
          credit: { $literal: 0 },
        },
      },
    ]

    // 2. Ramura CREDIT (Facturi -> Cresc datoria)
    const creditPipeline: PipelineStage[] = [
      {
        $match: {
          supplierId: id,
          status: { $ne: 'ANULATA' },
        },
      },
      {
        $project: {
          _id: 1,
          date: '$invoiceDate',
          documentType: {
            $cond: {
              if: { $eq: ['$invoiceType', 'STORNO'] },
              then: 'Storno',
              else: {
                $cond: {
                  if: { $eq: ['$invoiceType', 'AVANS'] },
                  then: 'Factură Avans',
                  else: 'Factură',
                },
              },
            },
          },
          documentNumber: {
            $concat: ['$invoiceSeries', ' ', '$invoiceNumber'],
          },
          details: {
            $cond: {
              if: { $eq: ['$invoiceType', 'STORNO'] },
              then: 'Stornare factură furnizor',
              else: {
                $cond: {
                  if: { $eq: ['$invoiceType', 'AVANS'] },
                  then: 'Factură Avans furnizor',
                  else: 'Factură furnizor',
                },
              },
            },
          },
          debit: { $literal: 0 },
          credit: '$totals.grandTotal',
        },
      },
    ]

    // 3. Agregare Principală
    // Construim pipeline-ul final.
    // Folosim 'as PipelineStage' la $unionWith pentru a satisface TypeScript fără 'any' global.
    const finalPipeline: PipelineStage[] = [
      ...debitPipeline,
      {
        $unionWith: {
          coll: 'supplierinvoices', 
          pipeline: creditPipeline,
        },
      } as PipelineStage,
      { $sort: { date: 1 } },
      {
        $setWindowFields: {
          sortBy: { date: 1 },
          output: {
            runningBalance: {
              $sum: { $subtract: ['$credit', '$debit'] },
              window: { documents: ['unbounded', 'current'] },
            },
          },
        },
      },
    ]

    const ledgerEntries = (await SupplierPaymentModel.aggregate(
      finalPipeline
    )) as SupplierLedgerEntry[]

   
    let newPaymentBalance = 0
    if (ledgerEntries.length > 0) {
      newPaymentBalance = ledgerEntries[ledgerEntries.length - 1].runningBalance
    }

    // Calculăm Overdue
    const overdueResult = await SupplierInvoiceModel.aggregate([
      {
        $match: {
          supplierId: id,
          status: { $in: ['NEPLATITA', 'PARTIAL_PLATITA'] },
          dueDate: { $lt: now },
        },
      },
      {
        $group: {
          _id: null,
          overdueBalance: { $sum: '$remainingAmount' },
        },
      },
    ])
    const overdueBalance = overdueResult[0]?.overdueBalance || 0

    const existingSummary = await SupplierSummary.findOne({ supplierId: id })
    let summaryToSave: ISupplierSummary

    if (existingSummary) {
      summaryToSave = existingSummary
    } else {
      summaryToSave = new SupplierSummary({ supplierId: id })
    }

    summaryToSave.paymentBalance = newPaymentBalance
    summaryToSave.overduePaymentBalance = overdueBalance

    await summaryToSave.save()

    if (supplierSlug) {
      revalidatePath(
        `/admin/management/suppliers/${supplierId}/${supplierSlug}`
      )
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(ledgerEntries)),
    }
  } catch (error) {
    console.error('❌ Eroare getSupplierLedger:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'A apărut o eroare la generarea fișei furnizorului.'
    return { success: false, data: [], message: message }
  }
}
// Funcție simplă de recalculare care apelează Ledger-ul (pentru Page Load)
export async function recalculateSupplierSummary(
  supplierId: string,
  supplierSlug: string,
  skipRevalidation: boolean = false
) {
  try {
   
    const result = await getSupplierLedger(
      supplierId,
      skipRevalidation ? undefined : supplierSlug
    )

    if (!result.success) {
      throw new Error(result.message || 'Eroare necunoscută la ledger.')
    }
  

    return { success: true, message: 'Recalculat.' }
  } catch {
    return { success: false, message: 'Eroare la recalculare.' }
  }
}
