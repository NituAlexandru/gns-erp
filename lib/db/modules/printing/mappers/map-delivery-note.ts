import { PopulatedDeliveryNote } from '../../financial/delivery-notes/delivery-note.types'
import { PdfDocumentData } from '../printing.types'

export function mapDeliveryNoteToPdfData(
  note: PopulatedDeliveryNote
): PdfDocumentData {
  const items = note.items.map((item, i) => {
    let smartDesc = ''
    if (item.packagingOptions && item.packagingOptions.length > 0) {
      const currentUom = item.unitOfMeasure.toLowerCase()
      const currentOption = item.packagingOptions.find(
        (opt: any) => opt.unitName.toLowerCase() === currentUom
      )

      if (currentOption && currentOption.baseUnitEquivalent > 1) {
        const formattedRatio = Number(
          currentOption.baseUnitEquivalent.toFixed(2)
        )
        smartDesc = `Produs livrat la ${currentOption.unitName} (1 ${currentOption.unitName} = ${formattedRatio} ${item.baseUnit || 'buc'})`
      }
    }

    return {
      index: i + 1,
      name: item.productName,
      code: item.productCode,
      barcode: item.productBarcode || undefined,
      uom: item.unitOfMeasure,
      um: item.unitOfMeasure, // Adăugat pentru a rezolva eroarea TS
      quantity: item.quantity,
      details: smartDesc,
      price: 0,
      value: 0,
      vatRate: 0,
      vatValue: 0,
    }
  })

  return {
    type: 'DELIVERY_NOTE',
    series: note.seriesName,
    number: note.noteNumber,
    date: new Date(note.createdAt).toISOString(),
    dueDate: note.deliveryDate
      ? new Date(note.deliveryDate).toISOString()
      : new Date(note.createdAt).toISOString(), // Fallback la data curentă dacă e obligatoriu

    supplier: {
      name: note.companySnapshot.name,
      cui: note.companySnapshot.cui,
      regCom: note.companySnapshot.regCom,
      address: note.companySnapshot.address,
      bank: note.companySnapshot.bank,
      iban: note.companySnapshot.iban,
      phone: note.companySnapshot.phone,
      email: note.companySnapshot.email,
    },

    client: {
      name: note.clientSnapshot.name,
      cui: note.clientSnapshot.cui,
      regCom: note.clientSnapshot.regCom,
      address: {
        strada: note.clientSnapshot.address, // Strada din snapshot
        judet: note.clientSnapshot.judet, // Județul din snapshot
        localitate: '', // Lipsește din snapshot-ul de client, punem string gol
        tara: 'RO',
        numar: '',
      },
      bank: note.clientSnapshot.bank,
      iban: note.clientSnapshot.iban,
    },

    deliveryAddress: {
      strada: note.deliveryAddress.strada,
      numar: note.deliveryAddress.numar,
      localitate: note.deliveryAddress.localitate,
      judet: note.deliveryAddress.judet,
      codPostal: note.deliveryAddress.codPostal,
      tara: note.deliveryAddress.tara || 'RO',
      alteDetalii: note.deliveryAddress.alteDetalii,
      persoanaContact: note.deliveryAddress.persoanaContact,
      telefonContact: note.deliveryAddress.telefonContact,
    },

    logistic: {
      orderNumber: note.orderNumberSnapshot,
      deliveryNoteNumber: `${note.seriesName}-${note.noteNumber}`,
    },
    uitCode: note.uitCode,
    delegate: {
      name: note.driverName || note.deliveryAddress?.persoanaContact || '',
      vehicle: note.vehicleNumber || '',
      trailer: note.trailerNumber || '',
    },

    notes: note.deliveryNotesSnapshot || note.orderNotesSnapshot || '',
    issuerName: note.createdByName,
    items: items,
    totals: {
      subtotal: note.totals.subtotal,
      vatTotal: note.totals.vatTotal,
      grandTotal: note.totals.grandTotal,
      currency: 'RON',
    },
  }
}
