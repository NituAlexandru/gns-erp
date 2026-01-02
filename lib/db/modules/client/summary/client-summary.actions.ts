'use server'

import { connectToDatabase } from '@/lib/db'
import Client from '../client.model'
import ClientSummary from './client-summary.model'
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

export async function updateClientFinancialSettings(
  clientId: string,
  clientSlug: string,
  data: {
    limit: number | null
    lockingStatus: 'AUTO' | 'MANUAL_BLOCK' | 'MANUAL_UNBLOCK'
    lockingReason?: string
  }
) {
  const session = await auth()
  const userRole = session?.user?.role?.toLowerCase() || ''

  if (!SUPER_ADMIN_ROLES.includes(userRole)) {
    return { success: false, message: 'Acces neautorizat.' }
  }

  try {
    await connectToDatabase()

    // 1. Găsim sau creăm sumarul
    let summary = await ClientSummary.findOne({ clientId })
    if (!summary) {
      // Logica de creare dacă nu există (copiată din findOrCreate)
      summary = await ClientSummary.create({
        clientId,
        creditLimit: 0,
        availableCredit: 0,
        lockingStatus: 'AUTO',
      })
    }

    // 2. AICI SE SETEAZĂ PLAFONUL + STATUSUL
    // Setăm plafonul (exact ce făcea funcția veche)
    summary.creditLimit = data.limit !== null && data.limit > 0 ? data.limit : 0

    // Setăm noile câmpuri
    summary.lockingStatus = data.lockingStatus
    summary.lockingReason = data.lockingReason || ''

    await summary.save()

    // 3. Recalculăm ca să vedem dacă e blocked sau nu pe baza noilor setări
    return await recalculateClientSummary(clientId, clientSlug)
  } catch (error: unknown) {
    let errorMessage = 'Eroare la actualizare setări.'

    if (error instanceof Error) {
      errorMessage = error.message
    }

    console.error(`Eroare la update settings:`, error)
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
          clientId: id,
          status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
          dueDate: { $lt: now },
          invoiceType: { $ne: 'AVANS' },
          remainingAmount: { $gt: 0.01 },
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

    const limitExceeded = currentLimit > 0 && currentBalance > currentLimit

    // Verificăm statusul (folosim string-uri direct ca să nu importăm constante dacă nu vrei)
    const status = summaryToSave.lockingStatus || 'AUTO'

    if (status === 'MANUAL_BLOCK') {
      summaryToSave.isBlocked = true
    } else if (status === 'MANUAL_UNBLOCK') {
      summaryToSave.isBlocked = false
    } else {
      // Cazul AUTO
      summaryToSave.isBlocked = limitExceeded
    }

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
