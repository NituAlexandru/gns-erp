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
  // ALGORITM DE DISTRIBUȚIE (Hibrid: Întregi vs Zecimale)
  const isIntegerQty = Number.isInteger(totalQty)

  if (!isIntegerQty) {
    // A. Dacă avem zecimale (m3, kg, etc.) tăiem direct din cantitate, nu numărăm
    let remainingQty = totalQty

    distribution.forEach((dist, index) => {
      if (index === distribution.length - 1) {
        dist.qty = round2(remainingQty)
      } else {
        const calculatedQty = round2(totalQty * (dist.percentage / 100))
        dist.qty = calculatedQty
        remainingQty -= calculatedQty
      }
    })
  } else {
    // B. Dacă avem numere întregi (paleți, bucăți) folosim distribuția bucată cu bucată
    for (let i = 0; i < totalQty; i++) {
      const winner = distribution.reduce((prev, curr) => {
        const prevTracker = trackers.get(prev.clientId)!
        const currTracker = trackers.get(curr.clientId)!

        const prevTarget = getTargetTotal(grandTotal, prev.percentage)
        const currTarget = getTargetTotal(grandTotal, curr.percentage)

        const prevCurrentVal =
          prevTracker.accumulatedValue + prev.qty * unitValueEstimator
        const currCurrentVal =
          currTracker.accumulatedValue + curr.qty * unitValueEstimator

        const prevGap = prevTarget - prevCurrentVal
        const currGap = currTarget - currCurrentVal

        return prevGap > currGap ? prev : curr
      })

      winner.qty += 1
    }
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

  const sumNet = round2(results.reduce((acc, l) => acc + l.lineValue, 0))
  const diffNet = round2(originalItem.lineValue - sumNet)

  if (diffNet !== 0) {
    // Punem diferența pe bucata cu cantitatea cea mai mare (impact minim la prețul unitar)
    const targetLine = results.reduce((prev, current) =>
      prev.quantity > current.quantity ? prev : current,
    ) // 1. Ajustăm DOAR suma Netă (adunăm/scădem banul pierdut)

    targetLine.lineValue = round2(targetLine.lineValue + diffNet) // 2. Recalculăm TVA-ul normal din noul Net

    const vatRate = targetLine.vatRateDetails.rate || 0
    targetLine.vatRateDetails.value = round2(
      (targetLine.lineValue * vatRate) / 100,
    ) // 3. Recalculăm Totalul liniei

    targetLine.lineTotal = round2(
      targetLine.lineValue + targetLine.vatRateDetails.value,
    ) // 4. Ajustăm prețul unitar cu 4 zecimale, ca să valideze perfect e-Factura

    if (targetLine.quantity > 0) {
      targetLine.unitPrice =
        Math.round((targetLine.lineValue / targetLine.quantity) * 10000) / 10000
    }
  }

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

  // 2. CLASIFICARE: Separăm Ambalajele de Restul
  const packagingItems = originalItems.filter(
    (i) => i.stockableItemType === 'Packaging',
  )
  // "Orice nu e Packaging" intră aici (Produse, Servicii, Manuale, etc.)Asta garantează că nu pierdem nimic.
  const otherItems = originalItems.filter(
    (i) => i.stockableItemType !== 'Packaging',
  )

  // 3. CALCUL TOTALURI PENTRU ȚINTE
  // Ținta Faza 1: Doar valoarea ambalajelor
  const totalPackagingValue = packagingItems.reduce(
    (acc, i) => acc + i.lineTotal,
    0,
  )
  // Ținta Faza 2 (Finală): Valoarea întregii facturi
  const grandTotalOriginal = originalItems.reduce(
    (acc, i) => acc + i.lineTotal,
    0,
  )

  // 4. Setup Trackers
  const clientItemsMap = new Map<string, InvoiceLineInput[]>()
  const balanceTrackers = new Map<string, ClientBalanceTracker>()

  splitConfigs.forEach((c) => {
    clientItemsMap.set(c.clientId, [])
    balanceTrackers.set(c.clientId, {
      clientId: c.clientId,
      targetPercentage: c.percentage,
      accumulatedValue: 0, // Pornim de la 0
    })
  })

  // =========================================================
  // FAZA 1: DISTRIBUIREA AMBALAJELOR
  // Prioritate maximă: Împărțim paletii echitabil conform cotelor
  // =========================================================
  if (packagingItems.length > 0) {
    // Sortăm cantitate crescătoare
    const sortedPackaging = [...packagingItems].sort(
      (a, b) => a.quantity - b.quantity,
    )

    for (const item of sortedPackaging) {
      const distributedLines = distributeLineItem(
        item,
        splitConfigs,
        balanceTrackers,
        totalPackagingValue, // <--- ȚINTA ESTE DOAR VALOAREA AMBALAJELOR
      )

      distributedLines.forEach((line, index) => {
        const clientId = splitConfigs[index].clientId
        clientItemsMap.get(clientId)?.push(line)
      })
    }
  }

  // La finalul Fazei 1, `balanceTrackers` au acumulat valoarea ambalajelor.
  // Dacă Client A are 50% și a primit fix 50% din ambalaje, e perfect.
  // Dacă a primit mai mult (că nu s-a putut împărți paletul), va avea un surplus
  // pe care îl vom compensa în Faza 2.

  // =========================================================
  // FAZA 2: DISTRIBUIREA RESTULUI (PRODUSE, SERVICII, ETC.)
  // Scop: Echilibrarea Totalului General
  // =========================================================
  if (otherItems.length > 0) {
    // Sortăm cantitate crescătoare
    const sortedOthers = [...otherItems].sort((a, b) => a.quantity - b.quantity)

    for (const item of sortedOthers) {
      const distributedLines = distributeLineItem(
        item,
        splitConfigs,
        balanceTrackers,
        grandTotalOriginal, // <--- ȚINTA ESTE TOTALUL GENERAL (Include și ce s-a dat la amb)
      )

      distributedLines.forEach((line, index) => {
        const clientId = splitConfigs[index].clientId
        clientItemsMap.get(clientId)?.push(line)
      })
    }
  }

  // 5. Creăm facturile finale
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

  // 6. Global Fail-Safe (Corecția fină de 0.01 RON)
  // const generatedGrandTotal = invoices.reduce(
  //   (acc, inv) => acc + inv.totals.grandTotal,
  //   0,
  // )
  // const globalDiff = round2(generatedGrandTotal - grandTotalOriginal)

  // if (globalDiff !== 0 && Math.abs(globalDiff) <= 2 && invoices.length > 0) {
  //   // Corectăm factura cu valoarea cea mai mare
  //   const targetInvoice = invoices.reduce((prev, current) =>
  //     prev.totals.grandTotal > current.totals.grandTotal ? prev : current,
  //   ) // Găsim o linie eligibilă

  //   const lineIdx = targetInvoice.items.findIndex(
  //     (i: InvoiceLineInput) => i.lineTotal > Math.abs(globalDiff),
  //   )

  //   if (lineIdx !== -1) {
  //     const line = targetInvoice.items[lineIdx] // 1. Scădem/Adunăm banul DOAR pe suma Netă
  //     const newLineValue = round2(line.lineValue - globalDiff) // 2. Lăsăm TVA-ul să se calculeze NORMAL din noua sumă Netă
  //     const vatRate = line.vatRateDetails.rate || 0
  //     const newVat = round2((newLineValue * vatRate) / 100) // 3. Calculăm noul total al liniei (Net + TVA)
  //     const newLineTotal = round2(newLineValue + newVat) // 4. Recalculăm prețul unitar (4 zecimale) ca să treacă de validarea ANAF e-Factura

  //     let newUnitPrice = line.unitPrice
  //     if (line.quantity > 0) {
  //       newUnitPrice =
  //         Math.round((newLineValue / line.quantity) * 10000) / 10000
  //     }

  //     targetInvoice.items[lineIdx] = {
  //       ...line,
  //       unitPrice: newUnitPrice,
  //       lineValue: newLineValue,
  //       lineTotal: newLineTotal,
  //       vatRateDetails: { ...line.vatRateDetails, value: newVat },
  //     } // Recalculăm totalurile facturii după modificare
  //     targetInvoice.totals = calculateInvoiceTotals(targetInvoice.items)
  //   }
  // }

  return invoices as InvoiceInput[]
}
