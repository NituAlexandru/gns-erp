'use server'

import { connectToDatabase } from '@/lib/db'
import Supplier from '../supplier.model'
import SupplierSummary from './supplier-summary.model'
import mongoose, { PipelineStage, Types } from 'mongoose'
import SupplierPaymentModel from '../../financial/treasury/payables/supplier-payment.model'
import SupplierInvoiceModel from '../../financial/treasury/payables/supplier-invoice.model'
import { revalidatePath } from 'next/cache'
import {
  PAYMENT_METHOD_MAP,
  PAYMENT_METHODS,
  PaymentMethodKey,
} from '../../financial/treasury/payment.constants'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { TIMEZONE } from '@/lib/constants'

export interface SupplierLedgerEntry {
  _id: string
  date: Date
  dueDate?: Date
  documentType: string
  documentTypeRaw?: string
  documentNumber: string
  details: string
  debit: number
  credit: number
  runningBalance: number
  isAdvance?: boolean
  remainingAmount?: number
}

export interface SupplierLedgerTotals {
  initialDebit: number
  initialCredit: number
  initialBalance: number
  totalDebit: number
  totalCredit: number
  finalBalance: number
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
        outstandingBalance: 0,
        overdueBalance: 0,
      })
    }

    return JSON.parse(JSON.stringify(summary))
  } catch (error) {
    console.error(`Eroare la findOrCreateSupplierSummary:`, error)
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
    console.error(`Eroare la getSupplierSummary:`, error)
    return null
  }
}

export async function recalculateSupplierSummary(
  supplierId: string,
  supplierSlug: string,
  skipRevalidation: boolean = false,
) {
  if (!supplierId) throw new Error('Lipsă ID Furnizor.')

  try {
    await connectToDatabase()
    // Calculăm ledger-ul (fără revalidate intern)
    const result = await getSupplierLedger(supplierId)

    if (!result.success) {
      throw new Error(result.message || 'Eroare necunoscută la ledger.')
    }

    if (!skipRevalidation && supplierSlug) {
      try {
        revalidatePath(
          `/admin/management/suppliers/${supplierId}/${supplierSlug}`,
        )
      } catch {
        // Ignorăm eroarea de render pass
      }
    }

    return { success: true, message: 'Recalculat.' }
  } catch (error) {
    console.error('Eroare recalculateSupplierSummary:', error)
    return { success: false, message: 'Eroare la recalculare.' }
  }
}
/**
 * Calculează Ledger-ul Furnizorului și actualizează cache-ul SupplierSummary.
 * Debit = Plăți (scade datoria)
 * Credit = Facturi (crește datoria)
 */
export async function getSupplierLedger(
  supplierId: string,
  fromDate?: string,
  toDate?: string,
): Promise<{
  success: boolean
  data:
    | { entries: SupplierLedgerEntry[]; totals: SupplierLedgerTotals }
    | never[]
  message?: string
}> {
  try {
    await connectToDatabase()

    if (!Types.ObjectId.isValid(supplierId)) {
      throw new Error('ID Furnizor invalid')
    }

    const id = new Types.ObjectId(supplierId)
    const now = new Date()

    const paymentMethodBranches = (PAYMENT_METHODS as readonly string[]).map(
      (method) => ({
        case: { $eq: ['$paymentMethod', method] },
        then: ` prin ${
          PAYMENT_METHOD_MAP[method as PaymentMethodKey]?.name || method
        }`,
      }),
    )

    // 1. Ramura DEBIT (Plăți)
    const debitPipeline: PipelineStage[] = [
      {
        $match: {
          supplierId: id,
          status: { $ne: 'ANULATA' },
          paymentMethod: { $ne: 'COMPENSARE' },
        },
      },
      // Lookup Robust pentru Avans
      {
        $lookup: {
          from: 'supplierinvoices',
          let: { paymentInvoiceIds: { $ifNull: ['$invoices.invoiceId', []] } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [
                    '$_id',
                    {
                      $map: {
                        input: '$$paymentInvoiceIds',
                        as: 'pid',
                        in: {
                          $convert: {
                            input: '$$pid',
                            to: 'objectId',
                            onError: null,
                            onNull: null,
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
            { $project: { invoiceType: 1 } },
          ],
          as: 'paidInvoicesDetails',
        },
      },
      {
        $addFields: {
          isAdvance: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$paidInvoicesDetails',
                    as: 'inv',
                    cond: { $eq: ['$$inv.invoiceType', 'AVANS'] },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          date: '$paymentDate',
          dueDate: { $literal: null }, // Plățile nu au scadență
          remainingAmount: { $literal: 0 },
          documentType: { $literal: 'Plată' },
          documentTypeRaw: { $literal: 'PLATA' },
          documentNumber: {
            $concat: [
              { $ifNull: ['$seriesName', ''] },
              ' ',
              { $ifNull: ['$paymentNumber', ''] },
            ],
          },
          details: {
            $concat: [
              {
                $cond: [{ $eq: ['$isAdvance', true] }, 'Plată AVANS', 'Plată'],
              },
              {
                $switch: {
                  branches: paymentMethodBranches,
                  default: ' (Metodă necunoscută)',
                },
              },
            ],
          },
          debit: '$totalAmount',
          credit: { $literal: 0 },
          isAdvance: '$isAdvance',
        },
      },
    ]

    // 2. Ramura CREDIT (Facturi)
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
          dueDate: '$dueDate', // <--- Aducem data scadenței
          remainingAmount: { $ifNull: ['$remainingAmount', 0] },
          documentTypeRaw: '$invoiceType', // <--- Aducem tipul brut pentru UI
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
                  then: 'Emitere Factură Avans',
                  else: 'Factură furnizor',
                },
              },
            },
          },
          debit: { $literal: 0 },
          credit: {
            $cond: {
              // Dacă e STORNO, gestionăm semnul corect
              if: { $eq: ['$invoiceType', 'STORNO'] },
              then: {
                $cond: {
                  // Dacă e introdusă cu plus, o facem negativă
                  if: { $gt: ['$totals.grandTotal', 0] },
                  then: { $multiply: ['$totals.grandTotal', -1] },
                  // Dacă vine deja negativă din SPV, o lăsăm așa
                  else: '$totals.grandTotal',
                },
              },
              // Pentru STANDARD și AVANS luăm valoarea brută
              else: '$totals.grandTotal',
            },
          },
        },
      },
    ]

    // 3. Agregare Finală
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
      finalPipeline,
    )) as SupplierLedgerEntry[]

    ledgerEntries.forEach((entry) => {
      if (entry.runningBalance) {
        entry.runningBalance = Math.round(entry.runningBalance * 100) / 100
      }
    })

    let operationalBalance = 0
    if (ledgerEntries.length > 0) {
      operationalBalance =
        ledgerEntries[ledgerEntries.length - 1].runningBalance || 0
    }
    operationalBalance = Math.round(operationalBalance * 100) / 100

    // --- 4. CALCUL OVERDUE (Corectat: Fără Storno și Avans) ---
    const overdueResult = await SupplierInvoiceModel.aggregate([
      {
        $match: {
          supplierId: id,
          status: { $in: ['NEPLATITA', 'PARTIAL_PLATITA'] },
          dueDate: { $lt: now },
          // Excludem AVANS și STORNO de la datorii scadente
          invoiceType: { $nin: ['AVANS', 'STORNO'] },
          remainingAmount: { $ne: 0 },
        },
      },
      {
        $group: {
          _id: null,
          overdueBalance: { $sum: '$remainingAmount' },
          overdueInvoicesCount: { $sum: 1 },
        },
      },
    ])
    const overdueBalance = overdueResult[0]?.overdueBalance || 0
    const overdueCount = overdueResult[0]?.overdueInvoicesCount || 0

    // --- 5. CALCUL TOTAL ACHIZIȚII ---
    const purchaseStats = await SupplierInvoiceModel.aggregate([
      {
        $match: {
          supplierId: id,
          status: { $ne: 'ANULATA' },
          invoiceType: { $in: ['STANDARD', 'STORNO', 'AVANS'] },
        },
      },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: {
              $cond: {
                // 1. Dacă e STORNO
                if: { $eq: ['$invoiceType', 'STORNO'] },
                then: {
                  // Aplicăm logica ROBUSTĂ (ca la Ledger)
                  $cond: {
                    // Dacă e pozitiv (Manual) -> Îl facem negativ
                    if: { $gt: ['$totals.grandTotal', 0] },
                    then: { $multiply: ['$totals.grandTotal', -1] },
                    // Dacă e deja negativ (SPV) -> Îl lăsăm așa
                    else: '$totals.grandTotal',
                  },
                },
                // 2. Dacă e STANDARD -> Luăm valoarea brută
                else: '$totals.grandTotal',
              },
            },
          },
        },
      },
    ])
    const totalPurchaseValue = purchaseStats[0]?.totalValue || 0

    // Salvare
    const existingSummary = await SupplierSummary.findOne({ supplierId: id })
    const summaryToSave =
      existingSummary || new SupplierSummary({ supplierId: id })

    summaryToSave.outstandingBalance = operationalBalance
    summaryToSave.overdueBalance = overdueBalance
    summaryToSave.overdueInvoicesCount = overdueCount
    summaryToSave.totalPurchaseValue = totalPurchaseValue

    if (isNaN(summaryToSave.outstandingBalance))
      summaryToSave.outstandingBalance = 0

    await summaryToSave.save()

    // 1. Setăm datele folosind date-fns-tz pentru a respecta strict fusul orar
    const currentDate = new Date()
    const currentYearStr = formatInTimeZone(currentDate, TIMEZONE, 'yyyy')

    const start = fromDate
      ? fromZonedTime(`${fromDate}T00:00:00.000`, TIMEZONE)
      : fromZonedTime(`${currentYearStr}-01-01T00:00:00.000`, TIMEZONE)

    const end = toDate
      ? fromZonedTime(`${toDate}T23:59:59.999`, TIMEZONE)
      : fromZonedTime(`${currentYearStr}-12-31T23:59:59.999`, TIMEZONE)

    // 2. Calculăm Soldul Inițial și totalurile aferente
    const initialEntries = ledgerEntries.filter((e) => new Date(e.date) < start)
    const initialBalance =
      initialEntries.length > 0
        ? initialEntries[initialEntries.length - 1].runningBalance
        : 0
    const initialDebit = initialEntries.reduce(
      (sum, e) => sum + (e.debit || 0),
      0,
    )
    const initialCredit = initialEntries.reduce(
      (sum, e) => sum + Math.abs(e.credit || 0),
      0,
    )

    // 3. Filtrăm doar tranzacțiile din perioada selectată
    const periodEntries = ledgerEntries.filter((e) => {
      const d = new Date(e.date)
      return d >= start && d <= end
    })

    // 4. Calculăm totalurile strict pentru perioada filtrată
    const totalDebit = periodEntries.reduce((sum, e) => sum + (e.debit || 0), 0)
    const totalCredit = periodEntries.reduce(
      (sum, e) => sum + Math.abs(e.credit || 0),
      0,
    )

    // 5. Soldul final
    const finalBalance =
      periodEntries.length > 0
        ? periodEntries[periodEntries.length - 1].runningBalance
        : initialBalance

    const totals: SupplierLedgerTotals = {
      initialDebit,
      initialCredit,
      initialBalance,
      totalDebit,
      totalCredit,
      finalBalance,
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify({ entries: periodEntries, totals })),
    }
  } catch (error) {
    console.error('❌ Eroare getSupplierLedger:', error)
    return { success: false, data: [], message: (error as Error).message }
  }
}
