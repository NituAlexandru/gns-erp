import { PopulatedInvoice } from '../../financial/invoices/invoice.types'
import { PdfDocumentData } from '../printing.types'

export function mapInvoiceToPdfData(
  invoice: PopulatedInvoice
): PdfDocumentData {
  const items = invoice.items.map((item: any, i: number) => {
    let smartDesc = ''

    if (item.packagingOptions && item.packagingOptions.length > 0) {
      const currentUom = item.unitOfMeasure.toLowerCase()

      // 1. Găsim opțiunea curentă
      const currentOption = item.packagingOptions.find(
        (opt: any) => opt.unitName.toLowerCase() === currentUom
      )

      if (currentOption) {
        // 2. Căutăm candidați mai mici (sub-unități)
        const candidates = item.packagingOptions
          .filter(
            (opt: any) =>
              opt.baseUnitEquivalent < currentOption.baseUnitEquivalent
          )
          .sort((a: any, b: any) => b.baseUnitEquivalent - a.baseUnitEquivalent)

        // Verificăm dacă merită afișat (nu afișăm pt unitatea de bază 1:1)
        const isWorthShowing =
          candidates.length > 0 || currentOption.baseUnitEquivalent > 1

        if (isWorthShowing) {
          let targetUnitName = item.baseUnit
          let ratio = currentOption.baseUnitEquivalent

          // Dacă avem sub-unități intermediare (ex: Palet -> Sac -> Buc), alegem Sacul
          if (candidates.length > 0) {
            const bestSubUnit = candidates[0]
            targetUnitName = bestSubUnit.unitName
            ratio =
              currentOption.baseUnitEquivalent / bestSubUnit.baseUnitEquivalent
          }

          // Construim textul doar dacă raportul e supraunitar
          if (ratio > 1) {
            const formattedRatio = Number(ratio.toFixed(2))
            smartDesc = `Produs vândut la ${currentOption.unitName} (1 ${currentOption.unitName} = ${formattedRatio} ${targetUnitName})`
          }
        }
      }
    }

    return {
      index: i + 1,
      name: item.productName,
      uom: item.unitOfMeasure,
      um: item.unitOfMeasure,
      quantity: item.quantity,
      price: item.unitPrice,
      value: item.lineValue,
      vatRate: item.vatRateDetails?.rate,
      vatValue: item.vatRateDetails?.value,
      code: item.productCode,
      details: smartDesc,
    }
  })

  return {
    type: 'INVOICE',
    series: invoice.seriesName,
    number: invoice.invoiceNumber,
    date: new Date(invoice.invoiceDate).toISOString(),
    dueDate: new Date(invoice.dueDate).toISOString(),
    notes: invoice.notes,
    // --- MAPARE FURNIZOR ---
    supplier: {
      name: invoice.companySnapshot.name,
      cui: invoice.companySnapshot.cui,
      regCom: invoice.companySnapshot.regCom,
      address: invoice.companySnapshot.address,
      bank: invoice.companySnapshot.bank,
      iban: invoice.companySnapshot.iban,
      capitalSocial: (invoice.companySnapshot as any).capitalSocial,
      phone: invoice.companySnapshot.phone,
      email: invoice.companySnapshot.email,
    },

    // --- MAPARE CLIENT ---
    client: {
      name: invoice.clientSnapshot.name,
      cui: invoice.clientSnapshot.cui || invoice.clientSnapshot.cnp || '',
      regCom: invoice.clientSnapshot.regCom || '-',
      address: invoice.clientSnapshot.address,
      bank: invoice.clientSnapshot.bank,
      iban: invoice.clientSnapshot.iban,
      contactPerson: invoice.deliveryAddress?.persoanaContact,
      phone: invoice.deliveryAddress?.telefonContact,
    },
    deliveryAddress: invoice.deliveryAddress,
    // --- MAPARE LOGISTICĂ ---
    logistic: {
      orderNumber: invoice.logisticSnapshots?.orderNumbers?.join(', '),
      deliveryNumber: invoice.logisticSnapshots?.deliveryNumbers?.join(', '),
      deliveryNoteNumber:
        invoice.logisticSnapshots?.deliveryNoteNumbers?.join(', '),
    },

    // --- MAPARE EXPEDIȚIE ---
    delegate: {
      name: invoice.driverName || invoice.deliveryAddress?.persoanaContact,
      vehicle: invoice.vehicleNumber,
      trailer: invoice.trailerNumber,
    },

    issuerName: invoice.salesAgentSnapshot?.name || invoice.createdByName,
    invoiceType: invoice.invoiceType,
    items: items,

    // 2. CORECAT: Totalurile sunt în obiectul 'totals', nu pe rădăcină
    // Verifică în invoice.types.ts -> InvoiceDTO -> totals: InvoiceTotals
    totals: {
      subtotal: invoice.totals.subtotal,
      vatTotal: invoice.totals.vatTotal,
      grandTotal: invoice.totals.grandTotal,
      currency: 'RON',
    },
  }
}
