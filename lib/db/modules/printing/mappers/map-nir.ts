// lib/db/modules/printing/mappers/map-nir.ts
import { NirDTO } from '../../financial/nir/nir.types'
import { PdfDocumentData } from '../printing.types'

export const mapNirToPdfData = (nir: NirDTO): PdfDocumentData => {
  // Combinăm facturile și avizele furnizorului într-un singur string pentru header
  const docInvoices = nir.invoices
    ?.map(
      (i) =>
        `Factura ${i.series || ''} ${i.number} / ${new Date(i.date).toLocaleDateString('ro-RO')}`,
    )
    .join(', ')
  const docDeliveries = nir.deliveries
    ?.map(
      (d) =>
        `Aviz ${d.dispatchNoteSeries || ''} ${d.dispatchNoteNumber} / ${new Date(d.dispatchNoteDate).toLocaleDateString('ro-RO')}`,
    )
    .join(', ')

  const allCars = [
    ...new Set(nir.deliveries?.map((d) => d.carNumber).filter(Boolean)),
  ].join(', ')
  const allDrivers = [
    ...new Set(nir.deliveries?.map((d) => d.driverName).filter(Boolean)),
  ].join(', ')

  return {
    type: 'NIR',
    series: nir.seriesName,
    number: nir.nirNumber,
    date: nir.nirDate,
    supplier: {
      name: nir.supplierSnapshot.name,
      cui: nir.supplierSnapshot.cui,
      address: { strada: '', localitate: '', judet: '', tara: '' },
    } as any,
    client: nir.companySnapshot as any,
    items: nir.items.map((item, idx) => ({
      id: item.productId?.toString() || item.packagingId?.toString() || '',
      index: idx + 1,
      name: item.productName,
      code: item.productCode || '-',
      uom: item.unitMeasure, // SĂ FIE 'uom', NU 'um'
      um: item.unitMeasure,
      quantity: item.quantity,
      // Date specifice NIR:
      docQty: item.documentQuantity,
      recQty: item.quantity,
      diffQty: item.quantityDifference,
      invoicePricePerUnit: item.invoicePricePerUnit,
      distributedTransportCostPerUnit: item.distributedTransportCostPerUnit,
      // landedCostPerUnit: item.landedCostPerUnit,
      vatRate: item.vatRate,
      lineValue: item.lineValue,
      lineVatValue: item.lineVatValue,
      total: item.lineTotal,
    })),
    totals: {
      subtotal: nir.totals.subtotal - nir.totals.transportSubtotal, // Scădem transportul din Net
      vatTotal: nir.totals.vatTotal - nir.totals.transportVat, // Scădem transportul din TVA
      grandTotal:
        nir.totals.grandTotal -
        (nir.totals.transportSubtotal + nir.totals.transportVat), // Scădem transportul din Brut
      transportValue: 0, // Îl facem 0 ca să nu mai apară nicăieri
      currency: 'RON',
    },
    logistic: {
      location: nir.destinationLocation,
      receivedBy: nir.receivedBy.name,
      accompanyingDocs: [docInvoices, docDeliveries].filter(Boolean).join('; '),
      carNumber: allCars || '-',
      driverName: allDrivers || '-',
    },
  }
}
