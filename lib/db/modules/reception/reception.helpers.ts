import mongoose from 'mongoose'
import { IInvoice } from './reception.model'
import { round2 } from '@/lib/utils'

interface DistributableItem {
  quantity: number
  invoicePricePerUnit?: number | null | undefined
}

/**
 * Distribuie un cost total de transport pe o listă de articole,
 * proporțional cu valoarea fiecărui articol.
 * @param items - Un array de produse sau ambalaje.
 * @param totalTransportCost - Costul total de transport de distribuit.
 * @returns Un nou array de articole, fiecare având o nouă proprietate `totalDistributedTransportCost`.
 */
export function distributeTransportCost<T extends DistributableItem>(
  items: T[],
  totalTransportCost: number,
): (T & { totalDistributedTransportCost: number })[] {
  // Verificare explicită la început. Dacă nu sunt articole, ieșim imediat.
  if (!items || items.length === 0) {
    return []
  }

  const totalItemsNetValue = items.reduce((sum, item) => {
    const unitNet = item.invoicePricePerUnit ?? 0
    const qty = item.quantity ?? 0
    return sum + unitNet * qty
  }, 0)

  if (round2(totalTransportCost) === 0 || round2(totalItemsNetValue) === 0) {
    return items.map((item) => ({
      ...item,
      totalDistributedTransportCost: 0,
    }))
  }

  const allocatedTransportCosts = items.map((item) => {
    const unitNet = item.invoicePricePerUnit ?? 0
    const qty = item.quantity ?? 0
    const itemNetValue = unitNet * qty
    const weightShare = itemNetValue / totalItemsNetValue
    const rawAllocation = totalTransportCost * weightShare
    return round2(rawAllocation)
  })

  const allocatedSum = allocatedTransportCosts.reduce(
    (s, v) => round2(s + v),
    0,
  )
  const allocationDifference = round2(totalTransportCost - allocatedSum)

  if (
    Math.abs(allocationDifference) > 0 &&
    allocatedTransportCosts.length > 0
  ) {
    const lastIdx = allocatedTransportCosts.length - 1
    allocatedTransportCosts[lastIdx] = round2(
      allocatedTransportCosts[lastIdx] + allocationDifference,
    )
  }

  return items.map((item, idx) => ({
    ...item,
    totalDistributedTransportCost: allocatedTransportCosts[idx],
  }))
}

export function calculateInvoiceTotals(invoices: IInvoice[]): IInvoice[] {
  return invoices.map((invoice) => {
    const amount = invoice.amount ?? 0
    const vatRate = invoice.vatRate ?? 0

    const vatValue = round2(amount * (vatRate / 100))
    const totalWithVat = round2(amount + vatValue)

    // Returnăm un obiect nou pentru a evita mutațiile directe
    return {
      ...invoice,
      vatValue,
      totalWithVat,
    }
  })
}

export async function runTransactionWithRetry<T>(
  operation: (session: mongoose.ClientSession) => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let attempt = 0
  while (true) {
    const session = await mongoose.startSession()
    try {
      const transactionOptions: mongoose.mongo.TransactionOptions = {
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
      }

      let result: T | undefined

      await session.withTransaction(async () => {
        result = await operation(session)
      }, transactionOptions)

      return result!
    } catch (error: any) {
      attempt++
      const isTransientError =
        error.code === 112 ||
        error.code === 251 ||
        (error.errorLabels &&
          error.errorLabels.includes('TransientTransactionError'))

      if (isTransientError && attempt < maxRetries) {
        console.warn(
          `⚠️ [DB] Tranzacție eșuată (Conflict). Reîncercare ${attempt}/${maxRetries}...`,
        )
        // Așteptăm puțin înainte de retry (backoff exponențial: 200ms, 400ms, etc)
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
        continue
      }

      // Dacă nu e eroare temporară sau am depășit încercările, o aruncăm mai departe
      throw error
    } finally {
      await session.endSession()
    }
  }
}
