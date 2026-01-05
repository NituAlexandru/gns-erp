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
  clientSnapshot: ClientSnapshot // Avem nevoie de snapshot-ul complet pentru fiecare client
  percentage: number // ex: 33.33 (reprezentând %)
}

export interface SplitResult {
  success: boolean
  invoicesData?: InvoiceInput[]
  message?: string
}

// ==========================================
// 2. CORE MATHEMATIC LOGIC
// ==========================================

/**
 * Împarte o linie conform logicii stricte:
 * - Produse/Ambalaje: Se împarte CANTITATEA (numere întregi), preț fix.
 * - Servicii/Manuale: Se împarte VALOAREA (preț recalculat), cantitate fixă.
 */
function distributeLineItem(
  originalItem: InvoiceLineInput,
  configs: SplitClientConfig[]
): InvoiceLineInput[] {
  // 1. Identificare Tip Articol (Oglindă Frontend)
  const isStockable =
    !originalItem.isManualEntry &&
    !originalItem.serviceId && // Dacă are serviceId, e Serviciu, chiar dacă scrie ERPProduct
    (originalItem.stockableItemType === 'ERPProduct' ||
      originalItem.stockableItemType === 'Packaging')

  // 2. Pregătire Conversii (doar pentru stocabile)
  const shouldConvertToBase =
    isStockable &&
    originalItem.conversionFactor &&
    originalItem.conversionFactor > 1 &&
    originalItem.baseUnit

  const totalQty = shouldConvertToBase
    ? originalItem.quantity * (originalItem.conversionFactor || 1)
    : originalItem.quantity

  // Prețul unitar de referință (Bază sau Original)
  const refUnitPrice = shouldConvertToBase
    ? originalItem.priceInBaseUnit ||
      originalItem.unitPrice / (originalItem.conversionFactor || 1)
    : originalItem.unitPrice

  const refUM = shouldConvertToBase
    ? originalItem.baseUnit || originalItem.unitOfMeasure
    : originalItem.unitOfMeasure

  const refConversionFactor = shouldConvertToBase
    ? 1
    : originalItem.conversionFactor

  // Sortăm config-urile descrescător (cei cu % mare au prioritate la resturi)
  // Adăugăm indexul original pentru a păstra ordinea la final
  const sortedConfigsWithIndex = configs
    .map((c, i) => ({ ...c, originalIndex: i }))
    .sort((a, b) => b.percentage - a.percentage)

  // Array temporar pentru rezultate
  const results = new Array(configs.length)

  // ============================================================
  // CAZ 1: STOCABILE (Split Cantitate - Numere Întregi)
  // ============================================================
  if (isStockable) {
    let allocatedQty = 0

    // A. Calculăm cantitățile brute
    const distribution = sortedConfigsWithIndex.map((config) => {
      const qty = Math.floor(totalQty * (config.percentage / 100))
      allocatedQty += qty
      return { ...config, qty }
    })

    // B. Gestionăm restul (bucățile rămase)
    let remainder = Math.round(totalQty - allocatedQty)
    let i = 0
    while (remainder > 0) {
      // Adăugăm 1 bucată la clienții cu procentul cel mai mare
      distribution[i % distribution.length].qty += 1
      remainder -= 1
      i++
    }

    // C. Construim liniile finale
    distribution.forEach((dist) => {
      const newLine = createDerivedLine(
        originalItem,
        dist.qty,
        refUnitPrice,
        refUM,
        refConversionFactor
      )
      results[dist.originalIndex] = newLine
    })
  }

  // ============================================================
  // CAZ 2: SERVICII/MANUALE (Split Valoare - Fail Safe Bani)
  // ============================================================
  else {
    let allocatedTotal = 0

    // A. Calculăm valorile nete brute
    const distribution = sortedConfigsWithIndex.map((config) => {
      const splitNetValue = round2(
        (originalItem.lineValue * config.percentage) / 100
      )
      allocatedTotal += splitNetValue
      return { ...config, splitNetValue }
    })

    // B. Gestionăm restul de bani (0.01 RON)
    const remainder = round2(originalItem.lineValue - allocatedTotal)

    // Adăugăm restul la primul client (cel cu procentul cel mai mare)
    if (remainder !== 0) {
      distribution[0].splitNetValue = round2(
        distribution[0].splitNetValue + remainder
      )
    }

    // C. Construim liniile finale
    distribution.forEach((dist) => {
      // Recalculăm prețul unitar: Preț = ValoareNetă / CantitateOriginală
      // Cantitatea rămâne 1 (sau cât era original) la toți
      const newUnitPrice = dist.splitNetValue / totalQty

      const newLine = createDerivedLine(
        originalItem,
        totalQty, // Cantitate neschimbată
        newUnitPrice, // Preț recalculat
        refUM,
        refConversionFactor
      )
      results[dist.originalIndex] = newLine
    })
  }

  return results
}

/**
 * Helper intern pentru a crea o linie nouă cu valorile recalculate (Total, TVA etc.)
 */
function createDerivedLine(
  originalItem: InvoiceLineInput,
  qty: number,
  unitPrice: number,
  um: string,
  conversionFactor?: number
): InvoiceLineInput {
  // 1. Calcule Financiare Vânzare
  const lineValue = round2(qty * unitPrice)
  const vatRate = originalItem.vatRateDetails.rate || 0
  const vatValue = round2((lineValue * vatRate) / 100)
  const lineTotal = round2(lineValue + vatValue)

  // 2. Calculăm Raportul de Split (Cât la % reprezintă noua linie din cea veche)
  // Folosim raportul valoric (cel mai sigur pentru ambele cazuri: produse și servicii)
  const ratio =
    originalItem.lineValue !== 0 ? lineValue / originalItem.lineValue : 0

  // 3. Recalculăm Cost Breakdown (Loturile)
  // Păstrăm unitCost INTACT. Modificăm doar cantitatea consumată din lot.
  const newCostBreakdown = (originalItem.costBreakdown || []).map((cb) => ({
    ...cb,
    // Cantitatea din lot se reduce proporțional cu cât ia clientul
    quantity: round2(cb.quantity * ratio),
    // unitCost rămâne FIX (ex: 31.25)
    unitCost: cb.unitCost,
  }))

  // 4. Recalculăm Costul Total (lineCostFIFO) prin ADUNARE
  // Asta garantează că matematica bate cu unitCost-ul.
  let newLineCostFIFO = 0

  if (newCostBreakdown.length > 0) {
    // Dacă avem breakdown (Produse), adunăm: cantitate * cost_unitar
    newLineCostFIFO = newCostBreakdown.reduce((sum, cb) => {
      return sum + round2(cb.quantity * cb.unitCost)
    }, 0)
  } else {
    // Dacă NU avem breakdown (Servicii/Manuale), aplicăm ratio pe costul total anterior
    newLineCostFIFO = round2((originalItem.lineCostFIFO || 0) * ratio)
  }

  // 5. Recalculăm Profitul
  const lineProfit = round2(lineValue - newLineCostFIFO)

  return {
    ...originalItem,
    sourceInvoiceLineId: undefined, // Resetăm ID-ul liniei
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

    // Datele recalculate corect:
    lineCostFIFO: newLineCostFIFO,
    lineProfit: lineProfit,

    // Actualizăm breakdown-ul cu noile cantități
    costBreakdown: newCostBreakdown,

    // Dacă e produs, recalculăm și quantityInBaseUnit
    quantityInBaseUnit: originalItem.quantityInBaseUnit
      ? round2(originalItem.quantityInBaseUnit * ratio)
      : undefined,
  }
}

// ==========================================
// 3. ORCHESTRATOR LOGIC (Global Fail-Safe)
// ==========================================

export function generateSplitInvoiceInputs(
  commonData: Omit<
    InvoiceInput,
    'clientId' | 'clientSnapshot' | 'items' | 'totals'
  >,
  originalItems: InvoiceLineInput[],
  splitConfigs: SplitClientConfig[]
): InvoiceInput[] {
  // 1. Inițializăm map-ul de itemi
  const clientItemsMap = new Map<string, InvoiceLineInput[]>()
  splitConfigs.forEach((c) => clientItemsMap.set(c.clientId, []))

  // 2. Distribuim fiecare linie
  for (const item of originalItems) {
    const distributedLines = distributeLineItem(item, splitConfigs)

    // Le punem în coșul fiecărui client (ordinea din distributedLines corespunde cu splitConfigs)
    distributedLines.forEach((line, index) => {
      const clientId = splitConfigs[index].clientId
      clientItemsMap.get(clientId)?.push(line)
    })
  }

  // 3. Creăm facturile inițiale
  const invoices = splitConfigs.map((config) => {
    const items = clientItemsMap.get(config.clientId) || []
    const totals = calculateInvoiceTotals(items)

    return {
      ...commonData,
      clientId: config.clientId,
      clientSnapshot: config.clientSnapshot,
      items,
      totals,
      notes:
        `${commonData.notes || ''} (Cota parte: ${config.percentage}%)`.trim(),
    }
  })

  // ==========================================
  // GLOBAL FAIL-SAFE (Corecția de 0.01 RON la Total General)
  // ==========================================

  // A. Calculăm totalul original
  const originalGrandTotal = originalItems.reduce(
    (acc, i) => acc + i.lineTotal,
    0
  )

  // B. Calculăm totalul facturilor generate
  const generatedGrandTotal = invoices.reduce(
    (acc, inv) => acc + inv.totals.grandTotal,
    0
  )

  // C. Verificăm diferența
  const globalDiff = round2(generatedGrandTotal - originalGrandTotal)

  if (globalDiff !== 0) {
    // Găsim factura clientului cu procentul cel mai mare
    // Sortăm descrescător după procent
    const sortedIndices = splitConfigs
      .map((c, i) => ({ index: i, pct: c.percentage }))
      .sort((a, b) => b.pct - a.pct)

    const targetIndex = sortedIndices[0].index
    const targetInvoice = invoices[targetIndex]

    // Căutăm o linie potrivită pentru ajustare
    // Prioritizăm: Servicii/Manuale (unde prețul e flexibil) -> Produse scumpe
    let lineIdx = targetInvoice.items.findIndex(
      (i) => !i.stockableItemType || i.isManualEntry || i.serviceId
    )

    // Dacă nu avem servicii, luăm linia cu valoarea cea mai mare
    if (lineIdx === -1) {
      lineIdx = targetInvoice.items.reduce(
        (maxI, item, i, arr) =>
          item.lineTotal > arr[maxI].lineTotal ? i : maxI,
        0
      )
    }

    if (lineIdx !== -1) {
      const line = targetInvoice.items[lineIdx]

      // Corectăm Totalul Liniei
      const newLineTotal = round2(line.lineTotal - globalDiff)
      // Corectăm TVA-ul Liniei (aproximativ, diferența se duce de obicei în bază sau tva, o punem în TVA aici pt simplificare la ultima centimă)
      const newVat = round2(line.vatRateDetails.value - globalDiff)

      // Actualizăm linia
      targetInvoice.items[lineIdx] = {
        ...line,
        lineTotal: newLineTotal,
        vatRateDetails: {
          ...line.vatRateDetails,
          value: newVat,
        },
        // Notă: lineValue rămâne tehnic neschimbat sau se ajustează infim,
        // dar pentru consistență contabilă "Total = Net + TVA" e sfânt.
      }

      // Recalculăm totalurile facturii afectate
      targetInvoice.totals = calculateInvoiceTotals(targetInvoice.items)
    }
  }

  return invoices
}
