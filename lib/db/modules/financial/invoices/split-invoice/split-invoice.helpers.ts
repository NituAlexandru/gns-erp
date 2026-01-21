import { round2 } from '@/lib/utils'
import {
  ClientSnapshot,
  InvoiceInput,
  InvoiceLineInput,
} from '../invoice.types'
import { calculateInvoiceTotals } from '../invoice.helpers'

// ==========================================
// 1. DEFINIȚII DE TIPURI
// ==========================================

export interface SplitClientConfig {
  clientId: string
  clientSnapshot: ClientSnapshot
  percentage: number
}

interface ClientBalanceTracker {
  clientId: string
  targetPercentage: number
  accumulatedValue: number // Valoarea totală (RON) acumulată
}

export interface SplitResult {
  success: boolean
  invoicesData?: InvoiceInput[]
  message?: string
}

// ==========================================
// 2. CORE MATHEMATIC LOGIC
// ==========================================

function getTargetTotal(grandTotal: number, percentage: number) {
  return round2(grandTotal * (percentage / 100))
}

/**
 * Împarte o linie conform logicii stricte (Gap Filling - oglindă frontend).
 */
function distributeLineItem(
  originalItem: InvoiceLineInput,
  configs: SplitClientConfig[],
  trackers: Map<string, ClientBalanceTracker>,
  grandTotal: number, // Totalul general al facturii originale (Ținta supremă)
): InvoiceLineInput[] {
  // 1. Date brute
  const totalQty = originalItem.quantity
  const unitPrice = originalItem.unitPrice
  const um = originalItem.unitOfMeasure
  const conversionFactor = originalItem.conversionFactor || 1

  // Estimator valoare unitară (cu tot cu TVA) pentru decizii
  const unitValueEstimator =
    totalQty !== 0 ? originalItem.lineTotal / totalQty : 0

  // Inițializăm distribuția temporară
  const distribution = configs.map((config, index) => ({
    ...config,
    originalIndex: index,
    qty: 0,
  }))

  // ALGORITM: "Greedy Gap Filling"
  for (let i = 0; i < totalQty; i++) {
    const winner = distribution.reduce((prev, curr) => {
      const prevTracker = trackers.get(prev.clientId)!
      const currTracker = trackers.get(curr.clientId)!

      // Ținta totală (RON) pe care trebuie să o atingă fiecare
      const prevTarget = getTargetTotal(grandTotal, prev.percentage)
      const currTarget = getTargetTotal(grandTotal, curr.percentage)

      // Câți bani au acumulat până acum + valoarea noii bucăți potențiale
      const prevCurrentVal =
        prevTracker.accumulatedValue + prev.qty * unitValueEstimator
      const currCurrentVal =
        currTracker.accumulatedValue + curr.qty * unitValueEstimator

      // "Gap" = Câți bani mai au de primit până la țintă
      const prevGap = prevTarget - prevCurrentVal
      const currGap = currTarget - currCurrentVal

      // Câștigă cel care are "Gap-ul" cel mai mare (e cel mai departe de țintă)
      return prevGap > currGap ? prev : curr
    })

    winner.qty += 1
  }

  // D. Construim liniile finale și actualizăm Trackerele Globale
  const results = new Array(configs.length)

  distribution.forEach((dist) => {
    // Actualizăm balanța globală cu valoarea REALĂ a liniei generate
    const lineValNoVat = round2(dist.qty * unitPrice)

    // Calculăm și TVA-ul liniei pentru a updata balanța corect (Net + TVA)
    const vatRate = originalItem.vatRateDetails.rate || 0
    const vatVal = round2((lineValNoVat * vatRate) / 100)
    const lineTotalInOut = lineValNoVat + vatVal

    const tracker = trackers.get(dist.clientId)
    if (tracker) {
      tracker.accumulatedValue += lineTotalInOut
    }

    const newLine = createDerivedLine(
      originalItem,
      dist.qty,
      unitPrice,
      um,
      conversionFactor,
    )
    results[dist.originalIndex] = newLine
  })

  return results
}

/**
 * Helper intern pentru a crea o linie nouă cu valorile recalculate
 */
function createDerivedLine(
  originalItem: InvoiceLineInput,
  qty: number,
  unitPrice: number,
  um: string,
  conversionFactor?: number,
): InvoiceLineInput {
  // 🟢 FIX: Curățăm ID-urile vechi
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, sourceInvoiceLineId, ...cleanItem } = originalItem as any

  // 1. Calcule Financiare
  const lineValue = round2(qty * unitPrice)
  const vatRate = originalItem.vatRateDetails.rate || 0
  const vatValue = round2((lineValue * vatRate) / 100)
  const lineTotal = round2(lineValue + vatValue)

  // 2. Raport pentru scăderea din gestiune
  const ratio = originalItem.quantity !== 0 ? qty / originalItem.quantity : 0

  // 3. Recalculăm Cost Breakdown
  const newCostBreakdown = (originalItem.costBreakdown || []).map((cb: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id: cbId, ...cleanCb } = cb
    return {
      ...cleanCb,
      quantity: round2(cb.quantity * ratio),
      unitCost: cb.unitCost,
    }
  })

  // 4. Recalculăm Cost Total
  let newLineCostFIFO = 0
  if (newCostBreakdown.length > 0) {
    newLineCostFIFO = newCostBreakdown.reduce((sum: number, cb: any) => {
      return sum + round2(cb.quantity * cb.unitCost)
    }, 0)
  } else {
    newLineCostFIFO = round2((originalItem.lineCostFIFO || 0) * ratio)
  }

  const lineProfit = round2(lineValue - newLineCostFIFO)

  return {
    ...cleanItem,
    sourceInvoiceLineId: undefined,
    quantity: qty,
    unitOfMeasure: um,
    unitPrice: unitPrice,
    conversionFactor: conversionFactor || 1,
    lineValue: lineValue,
    lineTotal: lineTotal,
    vatRateDetails: {
      ...originalItem.vatRateDetails,
      value: vatValue,
    },
    lineCostFIFO: newLineCostFIFO,
    lineProfit: lineProfit,
    costBreakdown: newCostBreakdown,
    quantityInBaseUnit: originalItem.quantityInBaseUnit
      ? round2(originalItem.quantityInBaseUnit * ratio)
      : undefined,
  }
}

// ==========================================
// 3. ORCHESTRATOR PRINCIPAL
// ==========================================

export function generateSplitInvoiceInputs(
  commonData: Omit<
    InvoiceInput,
    'clientId' | 'clientSnapshot' | 'items' | 'totals'
  >,
  originalItems: InvoiceLineInput[],
  splitConfigs: SplitClientConfig[],
): InvoiceInput[] {
  // 1. Curățăm ID-ul vechi
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...cleanCommonData } = commonData as any

  // 2. Calculăm Totalul General Original (Ținta noastră)
  // Definim variabila AICI, la începutul funcției
  const grandTotalOriginal = originalItems.reduce(
    (acc, i) => acc + i.lineTotal,
    0,
  )

  // 3. Setup Trackers
  const clientItemsMap = new Map<string, InvoiceLineInput[]>()
  const balanceTrackers = new Map<string, ClientBalanceTracker>()

  splitConfigs.forEach((c) => {
    clientItemsMap.set(c.clientId, [])
    balanceTrackers.set(c.clientId, {
      clientId: c.clientId,
      targetPercentage: c.percentage,
      accumulatedValue: 0,
    })
  })

  // 4. SORTARE CRITICĂ: Cantitate CRESCĂTOARE (a.quantity - b.quantity)
  const sortedItems = [...originalItems].sort((a, b) => a.quantity - b.quantity)

  // 5. Distribuim fiecare linie
  for (const item of sortedItems) {
    const distributedLines = distributeLineItem(
      item,
      splitConfigs,
      balanceTrackers,
      grandTotalOriginal, // Pasăm variabila calculată la pasul 2
    )

    distributedLines.forEach((line, index) => {
      const clientId = splitConfigs[index].clientId
      clientItemsMap.get(clientId)?.push(line)
    })
  }

  // 6. Creăm facturile finale
  const invoices = splitConfigs.map((config) => {
    const items = clientItemsMap.get(config.clientId) || []

    // Eliminăm liniile cu cantitate 0
    const filteredItems = items.filter((i: InvoiceLineInput) => i.quantity > 0)

    const totals = calculateInvoiceTotals(filteredItems)

    return {
      ...cleanCommonData,
      clientId: config.clientId,
      clientSnapshot: config.clientSnapshot,
      items: filteredItems,
      totals,
      notes:
        `${cleanCommonData.notes || ''} (Cota parte: ${config.percentage}%)`.trim(),
    }
  })

  // 7. Global Fail-Safe (Corecția fină de 0.01 RON)
  const generatedGrandTotal = invoices.reduce(
    (acc, inv) => acc + inv.totals.grandTotal,
    0,
  )
  const globalDiff = round2(generatedGrandTotal - grandTotalOriginal)

  if (globalDiff !== 0 && invoices.length > 0) {
    // Corectăm factura cu valoarea cea mai mare
    const targetInvoice = invoices.reduce((prev, current) =>
      prev.totals.grandTotal > current.totals.grandTotal ? prev : current,
    )

    // Găsim o linie eligibilă
    const lineIdx = targetInvoice.items.findIndex(
      (i: InvoiceLineInput) => i.lineTotal > Math.abs(globalDiff),
    )

    if (lineIdx !== -1) {
      const line = targetInvoice.items[lineIdx]
      const newLineTotal = round2(line.lineTotal - globalDiff)
      const newVat = round2(line.vatRateDetails.value - globalDiff)

      targetInvoice.items[lineIdx] = {
        ...line,
        lineTotal: newLineTotal,
        vatRateDetails: { ...line.vatRateDetails, value: newVat },
      }
      targetInvoice.totals = calculateInvoiceTotals(targetInvoice.items)
    }
  }

  return invoices as InvoiceInput[]
}
