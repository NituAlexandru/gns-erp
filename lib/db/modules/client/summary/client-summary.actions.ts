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

interface IOverdueMetricsResult {
  overdueBalance: number
  overdueInvoicesCount: number
}
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

export async function getClientLedger(
  clientId: string
): Promise<{ success: boolean; data: ClientLedgerEntry[]; message?: string }> {
  try {
    await connectToDatabase()

    if (!Types.ObjectId.isValid(clientId)) {
      throw new Error('ID Client invalid')
    }

    const id = new Types.ObjectId(clientId)

    // --- 1. Pregătim ramura de DEBIT (Facturi: Standard, Avans, Storno) ---
    //  Storno este un debit negativ, Avansul este un debit.
    const debitPipeline = [
      {
        $match: {
          clientId: id,
          // Includem Avans și Storno
          invoiceType: { $in: ['STANDARD', 'STORNO', 'AVANS'] },
          //  Includem doar documentele finalizate
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
              else: 'Factură',
            },
          },
          documentNumber: { $concat: ['$seriesName', '-', '$invoiceNumber'] },
          details: {
            $cond: {
              if: { $eq: ['$invoiceType', 'STORNO'] },
              then: 'Stornare factură',
              else: {
                $cond: {
                  if: { $eq: ['$invoiceType', 'AVANS'] },
                  then: 'Emitere Factură Avans',
                  else: 'Emitere Factură',
                },
              },
            },
          },
          debit: '$totals.grandTotal',
          credit: { $literal: 0 },
        },
      },
    ]

    // --- 2. Pregătim ramura de CREDIT (Încasări) ---
    const paymentMethodBranches = (PAYMENT_METHODS as readonly string[]).map(
      (method) => ({
        case: { $eq: ['$paymentMethod', method] },
        then: `Încasare prin ${PAYMENT_METHOD_MAP[method as PaymentMethodKey].name}`,
      })
    )

    const creditPipeline = [
      {
        $match: {
          clientId: id,
          status: { $ne: 'ANULATA' },
        },
      },
      {
        $project: {
          _id: 1,
          date: '$paymentDate',
          documentType: 'Încasare',
          documentNumber: {
            $concat: [{ $ifNull: ['$seriesName', ''] }, '-', '$paymentNumber'],
          },
          details: {
            $switch: {
              branches: paymentMethodBranches,
              default: 'Încasare (Altă Metodă)',
            },
          },
          debit: { $literal: 0 },
          credit: { $multiply: ['$totalAmount', -1] },
        },
      },
    ]

    // --- 3. Rulăm Agregarea Principală ---
    // FIX: Pornim pe ÎNCASĂRI (ClientPaymentModel) și unim cu Facturile
    const ledgerEntries = await ClientPaymentModel.aggregate([
      // Aducem toate încasările
      ...creditPipeline,

      // Unim cu toate facturile
      {
        $unionWith: {
          coll: 'invoices', // Colecția de facturi
          pipeline: debitPipeline,
        },
      },

      // Sortăm toate documentele (facturi + încasări) cronologic
      {
        $sort: { date: 1 },
      },

      // --- 4. Calculăm Soldul Curent (Running Total) ---
      {
        $setWindowFields: {
          sortBy: { date: 1 },
          output: {
            runningBalance: {
              $sum: { $add: ['$debit', '$credit'] },
              window: {
                documents: ['unbounded', 'current'],
              },
            },
          },
        },
      },
    ])

    return {
      success: true,
      data: JSON.parse(JSON.stringify(ledgerEntries)),
    }
  } catch (error) {
    console.error('❌ Eroare getClientLedger:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'A apărut o eroare la generarea fișei de client.'
    return { success: false, data: [], message: message }
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
    const objectId = new mongoose.Types.ObjectId(clientId)

    // --- Partea 1: Obținem Soldul Contabil Real (apelând funcția curată) ---
    const ledgerResult = await getClientLedger(clientId)
    if (!ledgerResult.success) {
      throw new Error('Eroare la obținerea fișei contabile (ledger).')
    }
    const ledgerEntries = ledgerResult.data
    let newOutstandingBalance = 0
    if (ledgerEntries.length > 0) {
      newOutstandingBalance =
        ledgerEntries[ledgerEntries.length - 1].runningBalance
    }

    // --- Partea 2: Obținem Metricile Scadente ---
    const now = new Date()
    const overduePipeline: PipelineStage[] = [
      {
        $match: {
          client: objectId,
          status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
          dueDate: { $lt: now },
        },
      },
      {
        $group: {
          _id: null,
          overdueBalance: { $sum: '$remainingAmount' },
          overdueInvoicesCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          overdueBalance: '$overdueBalance',
          overdueInvoicesCount: '$overdueInvoicesCount',
        },
      },
    ]
    const overdueResult: IOverdueMetricsResult[] =
      await InvoiceModel.aggregate(overduePipeline)
    const overdueData = overdueResult[0] || {
      overdueBalance: 0,
      overdueInvoicesCount: 0,
    }

    // --- Partea 3: Actualizarea ClientSummary ---
    const existingSummary = await ClientSummary.findOne<IClientSummary>({
      clientId: objectId,
    })
    let summaryToSave: IClientSummary
    if (existingSummary) {
      summaryToSave = existingSummary
    } else {
      summaryToSave = new ClientSummary({ clientId: objectId })
    }
    summaryToSave.outstandingBalance = newOutstandingBalance
    summaryToSave.overdueBalance = overdueData.overdueBalance
    summaryToSave.overdueInvoicesCount = overdueData.overdueInvoicesCount
    summaryToSave.availableCredit =
      summaryToSave.creditLimit - summaryToSave.outstandingBalance
    summaryToSave.isBlocked =
      summaryToSave.outstandingBalance > summaryToSave.creditLimit
    await summaryToSave.save()

    // --- 2. VERIFICĂM STEAGUL ---
    if (!skipRevalidation) {
      revalidatePath(`/clients/${clientId}/${clientSlug}`)
    }

    return {
      success: true,
      message: 'Sumarul clientului a fost recalculat cu succes.',
      data: summaryToSave,
    }
  } catch (error: unknown) {
    let errorMessage = 'Eroare la recalcularea sumarului'
    if (error instanceof Error) {
      errorMessage = `Eroare la recalcularea sumarului: ${error.message}`
    }
    console.error(`[RECALCULATE_CLIENT_SUMMARY] EROARE:`, error)
    return {
      success: false,
      message: errorMessage,
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
