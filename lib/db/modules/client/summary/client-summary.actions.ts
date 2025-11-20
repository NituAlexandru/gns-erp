'use server'

import { connectToDatabase } from '@/lib/db'
import Client from '../client.model'
import ClientSummary, { IClientSummary } from './client-summary.model'
import mongoose, { PipelineStage, Types } from 'mongoose'
import { ClientLedgerEntry } from './client-summary.types'
import {
  PAYMENT_METHOD_MAP,
  PAYMENT_METHODS,
  PaymentMethodKey,
} from '../../financial/treasury/payment.constants'
import ClientPaymentModel from '../../financial/treasury/receivables/client-payment.model'
import InvoiceModel from '../../financial/invoices/invoice.model'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '../../user/user-roles'

export async function findOrCreateClientSummary(clientId: string) {
  await connectToDatabase()
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    throw new Error('ID Client invalid')
  }

  try {
    let summary = await ClientSummary.findOne({ clientId })

    if (!summary) {
      const client = await Client.findById(clientId)
      if (!client) throw new Error('Clientul nu a fost găsit.')

      summary = await ClientSummary.create({
        clientId,
        creditLimit: 0,
        availableCredit: 0,
      })
    }

    return JSON.parse(JSON.stringify(summary))
  } catch (error) {
    let errorMessage = 'A apărut o eroare necunoscută.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Eroare la findOrCreateClientSummary: ${errorMessage}`)
    throw new Error('Nu s-a putut găsi sau crea sumarul pentru client.')
  }
}

export async function getClientSummary(clientId: string) {
  await connectToDatabase()
  if (!mongoose.Types.ObjectId.isValid(clientId)) return null

  try {
    const summary = await ClientSummary.findOne({ clientId })
    if (!summary) {
      return await findOrCreateClientSummary(clientId)
    }
    return JSON.parse(JSON.stringify(summary))
  } catch (error) {
    let errorMessage = 'A apărut o eroare necunoscută.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Eroare la getClientSummary: ${errorMessage}`)
    return null
  }
}

export async function recalculateClientSummary(
  clientId: string,
  clientSlug: string,
  skipRevalidation: boolean = false
) {
  if (!clientId || !clientSlug) {
    throw new Error('Lipsă ID Client sau Slug Client pentru recalculare.')
  }

  try {
    await connectToDatabase()
    const ledgerResult = await getClientLedger(clientId)

    if (!ledgerResult.success) {
      throw new Error(
        ledgerResult.message || 'Eroare la recalcularea prin ledger.'
      )
    }

    const updatedSummary = await ClientSummary.findOne({ clientId })

    if (!skipRevalidation) {
      try {
        revalidatePath(`/clients/${clientId}/${clientSlug}`)
      } catch {
        // Ignorăm eroarea de revalidare în timpul randării, calculul s-a făcut oricum
      }
    }

    return {
      success: true,
      message: 'Sumarul clientului a fost recalculat cu succes.',
      data: JSON.parse(JSON.stringify(updatedSummary)),
    }
  } catch (error) {
    console.error(`[RECALCULATE_CLIENT_SUMMARY] EROARE:`, error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Eroare necunoscută la recalculare',
    }
  }
}

export async function setClientCreditLimit(
  clientId: string,
  clientSlug: string,
  limit: number | null
) {
  const session = await auth()
  const userRole = session?.user?.role?.toLowerCase() || ''

  // Verificăm dacă rolul este inclus în lista de super admini
  if (!SUPER_ADMIN_ROLES.includes(userRole)) {
    return {
      success: false,
      message: 'Acces neautorizat. Doar administratorii pot seta plafoane.',
    }
  }

  if (!clientId || !clientSlug) {
    return { success: false, message: 'ID Client sau Slug Client lipsă.' }
  }

  const newLimit = limit !== null && limit > 0 ? limit : 0

  try {
    await connectToDatabase()
    const objectId = new mongoose.Types.ObjectId(clientId)

    const summary = await ClientSummary.findOne<IClientSummary>({
      clientId: objectId,
    })

    if (summary) {
      summary.creditLimit = newLimit
      await summary.save()
    } else {
      await ClientSummary.create({
        clientId: objectId,
        creditLimit: newLimit,
      })
    }

    const recalculateResult = await recalculateClientSummary(
      clientId,
      clientSlug
    )

    if (!recalculateResult.success) {
      throw new Error(recalculateResult.message)
    }

    return {
      success: true,
      message: 'Plafonul de credit a fost actualizat.',
      data: recalculateResult.data,
    }
  } catch (error: unknown) {
    let errorMessage = 'Eroare la setarea plafonului de credit.'
    if (error instanceof Error) {
      errorMessage = `Eroare la setarea plafonului: ${error.message}`
    }
    console.error(`[SET_CLIENT_CREDIT_LIMIT] EROARE:`, error)
    return {
      success: false,
      message: errorMessage,
    }
  }
}

export async function getClientLedger(
  clientId: string
): Promise<{ success: boolean; data: ClientLedgerEntry[]; message?: string }> {
  try {
    await connectToDatabase()

    if (!Types.ObjectId.isValid(clientId)) {
      throw new Error('ID Client invalid')
    }

    const id = new Types.ObjectId(clientId)
    const now = new Date()

    // ---------------------------------------------------------
    // 1. Ramura DEBIT (Facturi)
    // ---------------------------------------------------------
    const debitPipeline: PipelineStage[] = [
      {
        $match: {
          clientId: id,
          invoiceType: { $in: ['STANDARD', 'STORNO', 'AVANS'] },
          status: { $in: ['APPROVED', 'PAID', 'PARTIAL_PAID'] },
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
          documentNumber: { $concat: ['$seriesName', '-', '$invoiceNumber'] },
          details: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$invoiceType', 'STORNO'] },
                  then: 'Stornare factură',
                },
                {
                  case: { $eq: ['$invoiceType', 'AVANS'] },
                  then: 'Emitere Factură Avans',
                },
              ],
              default: 'Emitere Factură',
            },
          },
          // Logica: Facturile de AVANS au Debit 0 (nu cresc datoria operațională)
          debit: {
            $cond: {
              if: { $eq: ['$invoiceType', 'AVANS'] },
              then: 0,
              else: { $ifNull: ['$totals.grandTotal', 0] },
            },
          },
          credit: { $literal: 0 },
        },
      },
    ]

    // ---------------------------------------------------------
    // 2. Ramura CREDIT (Încasări) - CU LOGICA NOUĂ PENTRU AVANS
    // ---------------------------------------------------------

    // Pregătim ramurile pentru switch-ul de metodă de plată
    const paymentMethodBranches = (PAYMENT_METHODS as readonly string[]).map(
      (method) => ({
        case: { $eq: ['$paymentMethod', method] },
        then: ` prin ${
          PAYMENT_METHOD_MAP[method as PaymentMethodKey]?.name || method
        }`,
      })
    )

    const creditPipeline: PipelineStage[] = [
      { $match: { clientId: id, status: { $ne: 'ANULATA' } } },
      // 1. Găsim alocările din tabela de legătură (PaymentAllocation)
      {
        $lookup: {
          from: 'paymentallocations',
          localField: '_id',
          foreignField: 'paymentId',
          as: 'allocations',
        },
      },
      // 2. Găsim facturile pe baza ID-urilor din alocări
      {
        $lookup: {
          from: 'invoices',
          localField: 'allocations.invoiceId',
          foreignField: '_id',
          as: 'linkedInvoices',
        },
      },
      // 3. Verificăm dacă vreuna din facturile legate este AVANS
      {
        $addFields: {
          isAdvance: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$linkedInvoices',
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
      // 4. Construim textul final
      {
        $project: {
          _id: 1,
          date: '$paymentDate',
          documentType: 'Încasare',
          documentNumber: {
            $concat: [{ $ifNull: ['$seriesName', ''] }, '-', '$paymentNumber'],
          },
          details: {
            $concat: [
              {
                $cond: [
                  { $eq: ['$isAdvance', true] },
                  'Încasare AVANS',
                  'Încasare',
                ],
              },
              {
                $switch: {
                  branches: paymentMethodBranches,
                  default: '',
                },
              },
            ],
          },
          debit: { $literal: 0 },
          credit: { $multiply: [{ $ifNull: ['$totalAmount', 0] }, -1] },
        },
      },
    ]

    // ---------------------------------------------------------
    // 3. Agregare Finală Ledger
    // ---------------------------------------------------------
    const unionStage = {
      $unionWith: {
        coll: 'invoices',
        pipeline: debitPipeline,
      },
    } as PipelineStage

    const aggregationPipeline: PipelineStage[] = [
      ...creditPipeline,
      unionStage,
      { $sort: { date: 1 } },
      {
        $setWindowFields: {
          sortBy: { date: 1 },
          output: {
            runningBalance: {
              $sum: { $add: ['$debit', '$credit'] },
              window: { documents: ['unbounded', 'current'] },
            },
          },
        },
      },
    ]

    const ledgerEntries =
      await ClientPaymentModel.aggregate<ClientLedgerEntry>(aggregationPipeline)

    ledgerEntries.forEach((entry) => {
      if (entry.runningBalance) {
        entry.runningBalance = Math.round(entry.runningBalance * 100) / 100
      }
    })

    // Determinăm Soldul Operațional
    let operationalBalance = 0
    if (ledgerEntries.length > 0) {
      // Luăm ultimul element pentru soldul curent
      operationalBalance =
        ledgerEntries[ledgerEntries.length - 1].runningBalance || 0
    }

    // ---------------------------------------------------------
    // 5. Metricile Overdue & Salvare
    // ---------------------------------------------------------
    const overduePipeline: PipelineStage[] = [
      {
        $match: {
          client: id,
          status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
          dueDate: { $lt: now },
          invoiceType: { $ne: 'AVANS' },
        },
      },
      {
        $group: {
          _id: null,
          overdueBalance: { $sum: { $ifNull: ['$remainingAmount', 0] } },
          overdueInvoicesCount: { $sum: 1 },
        },
      },
    ]

    const overdueResult = await InvoiceModel.aggregate(overduePipeline)
    const overdueData = overdueResult[0] || {
      overdueBalance: 0,
      overdueInvoicesCount: 0,
    }

    const existingSummary = await ClientSummary.findOne({ clientId: id })
    const summaryToSave = existingSummary || new ClientSummary({ clientId: id })

    summaryToSave.outstandingBalance = operationalBalance
    summaryToSave.overdueBalance = overdueData.overdueBalance
    summaryToSave.overdueInvoicesCount = overdueData.overdueInvoicesCount

    // Verificăm și aici pentru siguranță
    if (isNaN(summaryToSave.outstandingBalance))
      summaryToSave.outstandingBalance = 0

    summaryToSave.availableCredit =
      (summaryToSave.creditLimit || 0) - summaryToSave.outstandingBalance

    const currentLimit = Number(summaryToSave.creditLimit || 0)
    const currentBalance = Number(summaryToSave.outstandingBalance || 0)

    summaryToSave.isBlocked = currentLimit > 0 && currentBalance > currentLimit

    await summaryToSave.save()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(ledgerEntries)),
    }
  } catch (error) {
    console.error('❌ Eroare getClientLedger:', error)
    return { success: false, data: [], message: (error as Error).message }
  }
}
