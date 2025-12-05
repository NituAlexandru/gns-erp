import { round2 } from '@/lib/utils'
import DeliveryNoteModel, {
  IDeliveryNoteDoc,
  IDeliveryNoteLine,
} from '../delivery-notes/delivery-note.model'
import { InvoiceLineInput, InvoiceTotals } from './invoice.types'
import { ClientSession, Types } from 'mongoose'
import { IInvoiceDoc } from './invoice.model'
import DeliveryModel from '../../deliveries/delivery.model'
import Order, { IOrder } from '../../order/order.model'

// Helper pentru inițializarea totalurilor
function getInitialTotals(): InvoiceTotals {
  return {
    productsSubtotal: 0,
    productsVat: 0,
    productsCost: 0,
    productsProfit: 0,
    productsMargin: 0,
    packagingSubtotal: 0,
    packagingVat: 0,
    packagingCost: 0,
    packagingProfit: 0,
    packagingMargin: 0,
    servicesSubtotal: 0,
    servicesVat: 0,
    servicesCost: 0,
    servicesProfit: 0,
    servicesMargin: 0,
    manualSubtotal: 0,
    manualVat: 0,
    manualCost: 0,
    manualProfit: 0,
    manualMargin: 0,
    subtotal: 0,
    vatTotal: 0,
    grandTotal: 0,
    totalCost: 0,
    totalProfit: 0,
    profitMargin: 0,
  }
}

export function consolidateInvoiceFromNotes(notes: IDeliveryNoteDoc[]): {
  items: InvoiceLineInput[]
  totals: InvoiceTotals
} {
  const invoiceItems: InvoiceLineInput[] = []
  const invoiceTotals = notes.reduce((acc, note) => {
    for (const item of note.items as IDeliveryNoteLine[]) {
      const lineValue = item?.lineValue || 0
      const vatValue = item?.vatRateDetails?.value || 0
      const lineCost = item?.lineCostFIFO || 0
      const lineProfit = round2(lineValue - lineCost)
      const lineMargin =
        lineValue > 0 ? round2((lineProfit / lineValue) * 100) : 0

      invoiceItems.push({
        sourceDeliveryNoteId: note._id.toString(),
        sourceDeliveryNoteLineId: item._id?.toString() || undefined,
        productId: item.productId?.toString(),
        serviceId: item.serviceId?.toString(),
        stockableItemType: item.stockableItemType,
        isManualEntry: item.isManualEntry,
        productName: item.productName,
        productCode: item.productCode,
        productBarcode: item.productBarcode,
        codNC: item.codNC,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitOfMeasureCode: item.unitOfMeasureCode,
        unitPrice: item.priceAtTimeOfOrder,
        vatRateDetails: item.vatRateDetails,
        lineValue: lineValue,
        lineTotal: item.lineTotal,
        baseUnit: item.baseUnit,
        conversionFactor: item.conversionFactor || 1,
        quantityInBaseUnit: item.quantityInBaseUnit,
        priceInBaseUnit: item.priceInBaseUnit,
        minimumSalePrice: item.minimumSalePrice,
        packagingOptions: item.packagingOptions || [],
        lineCostFIFO: lineCost,
        lineProfit: lineProfit,
        lineMargin: lineMargin,
        costBreakdown: (item.costBreakdown || []).map((cb) => ({
          movementId: cb.movementId?.toString(), // Convertim ObjectId în string
          entryDate: new Date(cb.entryDate), // Convertim string-ul Date în obiect Date (Zod o cere)
          quantity: cb.quantity,
          unitCost: cb.unitCost,
          type: cb.type,
        })),
        stornedQuantity: 0,
        relatedAdvanceId: undefined,
      })

      // B. Calculează totalurile agregate
      if (item.isManualEntry) {
        // Caz 1: Este MANUALĂ (prioritatea 1)
        acc.manualSubtotal += lineValue
        acc.manualVat += vatValue
        acc.manualCost += lineCost
        acc.manualProfit += lineProfit
      } else if (item.serviceId) {
        // Caz 2: Este un Serviciu
        acc.servicesSubtotal += lineValue
        acc.servicesVat += vatValue
        acc.servicesCost += lineCost
        acc.servicesProfit += lineProfit
      } else if (item.stockableItemType === 'Packaging') {
        // Caz 3: Este un Ambalaj
        acc.packagingSubtotal += lineValue
        acc.packagingVat += vatValue
        acc.packagingCost += lineCost
        acc.packagingProfit += lineProfit
      } else if (item.productId || item.stockableItemType === 'ERPProduct') {
        // Caz 4: Este un Produs
        acc.productsSubtotal += lineValue
        acc.productsVat += vatValue
        acc.productsCost += lineCost
        acc.productsProfit += lineProfit
      }
    }
    return acc
  }, getInitialTotals())

  // --- Calculăm Totalurile Generale și Marjele ---
  invoiceTotals.subtotal = round2(
    invoiceTotals.productsSubtotal +
      invoiceTotals.servicesSubtotal +
      invoiceTotals.manualSubtotal +
      invoiceTotals.packagingSubtotal
  )
  invoiceTotals.vatTotal = round2(
    invoiceTotals.productsVat +
      invoiceTotals.servicesVat +
      invoiceTotals.manualVat +
      invoiceTotals.packagingVat
  )
  invoiceTotals.grandTotal = round2(
    invoiceTotals.subtotal + invoiceTotals.vatTotal
  )
  invoiceTotals.totalCost = round2(
    invoiceTotals.productsCost +
      invoiceTotals.servicesCost +
      invoiceTotals.manualCost +
      invoiceTotals.packagingCost
  )
  invoiceTotals.totalProfit = round2(
    invoiceTotals.productsProfit +
      invoiceTotals.servicesProfit +
      invoiceTotals.manualProfit +
      invoiceTotals.packagingProfit
  )

  // Marjele %
  invoiceTotals.productsMargin =
    invoiceTotals.productsSubtotal > 0
      ? round2(
          (invoiceTotals.productsProfit / invoiceTotals.productsSubtotal) * 100
        )
      : 0
  invoiceTotals.packagingMargin =
    invoiceTotals.packagingSubtotal > 0
      ? round2(
          (invoiceTotals.packagingProfit / invoiceTotals.packagingSubtotal) *
            100
        )
      : 0
  invoiceTotals.servicesMargin =
    invoiceTotals.servicesSubtotal > 0
      ? round2(
          (invoiceTotals.servicesProfit / invoiceTotals.servicesSubtotal) * 100
        )
      : 0
  invoiceTotals.manualMargin =
    invoiceTotals.manualSubtotal > 0
      ? round2(
          (invoiceTotals.manualProfit / invoiceTotals.manualSubtotal) * 100
        )
      : 0
  invoiceTotals.profitMargin =
    invoiceTotals.subtotal > 0
      ? round2((invoiceTotals.totalProfit / invoiceTotals.subtotal) * 100)
      : 0

  // Rotunjim totul la final
  Object.keys(invoiceTotals).forEach((key) => {
    invoiceTotals[key as keyof InvoiceTotals] = round2(
      invoiceTotals[key as keyof InvoiceTotals]
    )
  })

  return { items: invoiceItems, totals: invoiceTotals }
}
/**
 * Helper 1: Calculează totalurile pe server
 * Sursa Adevărului este 'items' (datele din formular).
 */
export function calculateInvoiceTotals(
  items: InvoiceLineInput[]
): InvoiceTotals {
  const invoiceTotals = items.reduce((acc, item) => {
    const lineValue = item?.lineValue || 0
    const vatValue = item?.vatRateDetails?.value || 0
    const lineCost = item?.lineCostFIFO || 0 // Preluăm costul
    const lineProfit = round2(lineValue - lineCost)

    // Clasificarea corectă
    if (item.isManualEntry) {
      // Caz 1: Este MANUALĂ (prioritatea 1)
      acc.manualSubtotal += lineValue
      acc.manualVat += vatValue
      acc.manualCost += lineCost
      acc.manualProfit += lineProfit
    } else if (item.serviceId) {
      // Caz 2: Este un Serviciu
      acc.servicesSubtotal += lineValue
      acc.servicesVat += vatValue
      acc.servicesCost += lineCost
      acc.servicesProfit += lineProfit
    } else if (item.stockableItemType === 'Packaging') {
      // Caz 3: Este un Ambalaj
      acc.packagingSubtotal += lineValue
      acc.packagingVat += vatValue
      acc.packagingCost += lineCost
      acc.packagingProfit += lineProfit
    } else if (item.productId || item.stockableItemType === 'ERPProduct') {
      // Caz 4: Este un Produs
      acc.productsSubtotal += lineValue
      acc.productsVat += vatValue
      acc.productsCost += lineCost
      acc.productsProfit += lineProfit
    }
    return acc
  }, getInitialTotals())

  // --- Calculăm Totalurile Generale și Marjele ---
  invoiceTotals.subtotal = round2(
    invoiceTotals.productsSubtotal +
      invoiceTotals.servicesSubtotal +
      invoiceTotals.manualSubtotal +
      invoiceTotals.packagingSubtotal
  )
  invoiceTotals.vatTotal = round2(
    invoiceTotals.productsVat +
      invoiceTotals.servicesVat +
      invoiceTotals.manualVat +
      invoiceTotals.packagingVat
  )
  invoiceTotals.grandTotal = round2(
    invoiceTotals.subtotal + invoiceTotals.vatTotal
  )
  invoiceTotals.totalCost = round2(
    invoiceTotals.productsCost +
      invoiceTotals.servicesCost +
      invoiceTotals.manualCost +
      invoiceTotals.packagingCost
  )
  invoiceTotals.totalProfit = round2(
    invoiceTotals.productsProfit +
      invoiceTotals.servicesProfit +
      invoiceTotals.manualProfit +
      invoiceTotals.packagingProfit
  )

  // Marjele %
  invoiceTotals.productsMargin =
    invoiceTotals.productsSubtotal > 0
      ? round2(
          (invoiceTotals.productsProfit / invoiceTotals.productsSubtotal) * 100
        )
      : 0
  invoiceTotals.packagingMargin =
    invoiceTotals.packagingSubtotal > 0
      ? round2(
          (invoiceTotals.packagingProfit / invoiceTotals.packagingSubtotal) *
            100
        )
      : 0
  invoiceTotals.servicesMargin =
    invoiceTotals.servicesSubtotal > 0
      ? round2(
          (invoiceTotals.servicesProfit / invoiceTotals.servicesSubtotal) * 100
        )
      : 0
  invoiceTotals.manualMargin =
    invoiceTotals.manualSubtotal > 0
      ? round2(
          (invoiceTotals.manualProfit / invoiceTotals.manualSubtotal) * 100
        )
      : 0
  invoiceTotals.profitMargin =
    invoiceTotals.subtotal > 0
      ? round2((invoiceTotals.totalProfit / invoiceTotals.subtotal) * 100)
      : 0

  // Rotunjim totul
  Object.keys(invoiceTotals).forEach((key) => {
    invoiceTotals[key as keyof InvoiceTotals] = round2(
      invoiceTotals[key as keyof InvoiceTotals]
    )
  })

  return invoiceTotals
}
/**
 * Helper 2: Actualizează toate documentele conexe (Avize, Livrări, Comenzi)
 * Această funcție rulează ÎN INTERIORUL tranzacției.
 */
export async function updateRelatedDocuments(
  invoice: IInvoiceDoc,
  options: {
    // ID-urile de avize de pe factură ÎNAINTE de salvare
    originalSourceNoteIds?: Types.ObjectId[]
  },
  { session }: { session: ClientSession }
) {
  const invoiceRef = `${invoice.seriesName}-${invoice.invoiceNumber}`

  // 1. Calculăm diferențele (Diff)
  const newNoteIds = new Set(
    invoice.sourceDeliveryNotes.map((id) => id.toString())
  )
  const oldNoteIds = new Set(
    (options.originalSourceNoteIds || []).map((id) => id.toString())
  )

  // A. Găsește avizele care TOCMAI AU FOST ADĂUGATE la factură
  const notesToMarkAsInvoiced = invoice.sourceDeliveryNotes.filter(
    (id) => !oldNoteIds.has(id.toString())
  )

  // B. Găsește avizele care TOCMAI AU FOST ȘTERSE de pe factură
  const notesToRelease = (options.originalSourceNoteIds || []).filter(
    (id) => !newNoteIds.has(id.toString())
  )

  // 2. Actualizăm Avizele (DeliveryNote)
  if (notesToMarkAsInvoiced.length > 0) {
    await DeliveryNoteModel.updateMany(
      { _id: { $in: notesToMarkAsInvoiced } },
      {
        $set: { status: 'INVOICED', isInvoiced: true },
        $push: {
          relatedInvoices: {
            invoiceId: invoice._id,
            invoiceNumber: invoiceRef,
          },
        },
      },
      { session }
    )
  }
  // B. Găsește avizele care TOCMAI AU FOST ȘTERSE de pe factură (Release)
  if (notesToRelease.length > 0) {
    // 1. Resetăm Avizele
    await DeliveryNoteModel.updateMany(
      { _id: { $in: notesToRelease } },
      {
        // 👇 Nu le mai trecem automat pe DELIVERED forțat,
        // ci ar trebui să verificăm dacă mai au alte facturi (dar pt moment e ok așa, sau le lăsăm statusul neatins dacă vrem logică complexă).
        // Pentru simplitate acum, presupunem că dacă scoți factura, devine nefacturat:
        $set: { status: 'DELIVERED', isInvoiced: false },

        // 👇 AICI E SCHIMBAREA: Scoatem factura specifică din array
        $pull: {
          relatedInvoices: { invoiceId: invoice._id },
        },
      },
      { session }
    )

    // 👇 2. Resetăm și Livrările asociate acestor avize (să nu rămână blocate pe INVOICED)
    // Trebuie să aflăm ID-urile livrărilor corespunzătoare avizelor șterse
    const releasedNotesDocs = await DeliveryNoteModel.find({
      _id: { $in: notesToRelease },
    })
      .select('deliveryId')
      .session(session)

    const deliveryIdsToRelease = releasedNotesDocs.map((n) => n.deliveryId)

    if (deliveryIdsToRelease.length > 0) {
      await DeliveryModel.updateMany(
        { _id: { $in: deliveryIdsToRelease } },
        {
          $set: { status: 'DELIVERED', isInvoiced: false },

          $pull: {
            relatedInvoices: { invoiceId: invoice._id },
          },
        },
        { session }
      )
    }
  }

  // 3. Extragem ID-urile unice DIRECT DIN FACTURĂ
  const deliveryIds = invoice.relatedDeliveries
  const orderIds = invoice.relatedOrders

  // 4. Actualizăm Livrările (Delivery)
  if (deliveryIds && deliveryIds.length > 0) {
    await DeliveryModel.updateMany(
      { _id: { $in: deliveryIds } },
      {
        $set: {
          status: 'INVOICED',
          isInvoiced: true,
        },
        // 👇 AICI E SCHIMBAREA: Adăugăm în array
        $push: {
          relatedInvoices: {
            invoiceId: invoice._id,
            invoiceNumber: invoiceRef,
          },
        },
      },
      { session }
    )
  }

  // 5. Actualizăm Comenzile (Order)
  for (const orderId of orderIds) {
    const allDeliveriesForOrder = await DeliveryModel.find({
      orderId: orderId,
      status: { $ne: 'CANCELLED' },
    })
      .select('status')
      .lean()
      .session(session)

    if (allDeliveriesForOrder.length === 0) {
      continue
    }

    const allInvoiced = allDeliveriesForOrder.every(
      (d) => d.status === 'INVOICED'
    )
    const partiallyInvoiced = allDeliveriesForOrder.some(
      (d) => d.status === 'INVOICED'
    )

    let newStatus: IOrder['status']

    if (allInvoiced) {
      newStatus = 'INVOICED'
    } else if (partiallyInvoiced) {
      newStatus = 'PARTIALLY_INVOICED'
    } else {
      // Dacă niciuna nu e facturată (ex: am șters singurul aviz)
      // Ar trebui să ne întoarcem la 'DELIVERED' sau 'PARTIALLY_DELIVERED'
      const allDelivered = allDeliveriesForOrder.every(
        (d) => d.status === 'DELIVERED'
      )
      newStatus = allDelivered ? 'DELIVERED' : 'PARTIALLY_DELIVERED'
    }

    await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: newStatus } },
      { session }
    )
  }
}
