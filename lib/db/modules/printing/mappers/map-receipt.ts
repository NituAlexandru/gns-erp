import { ReceiptDTO } from '../../financial/receipts/receipt.types'
import { PdfDocumentData } from '../printing.types'

export const mapReceiptToPdfData = (receipt: ReceiptDTO): PdfDocumentData => {
  // Pregătim lista de facturi pentru a fi afișată
  const invoicesList =
    receipt.invoices && receipt.invoices.length > 0
      ? `(Facturi: ${receipt.invoices.map((id: any) => id.$oid || id).join(', ')})`
      : ''

  // Construim explicația completă: Explicație originală + Facturi
  const fullExplanation = `${receipt.explanation} ${invoicesList}`.trim()

  return {
    type: 'RECEIPT',
    series: receipt.series,
    number: receipt.number,
    date: receipt.date ? String(receipt.date) : new Date().toISOString(),
    status: receipt.status,

    supplier: {
      name: receipt.companySnapshot.name,
      cui: receipt.companySnapshot.cui,
      regCom: receipt.companySnapshot.regCom || '',
      address: {
        strada: receipt.companySnapshot.address.strada || '',
        numar: receipt.companySnapshot.address.numar,
        localitate: receipt.companySnapshot.address.localitate || '',
        judet: receipt.companySnapshot.address.judet || '',
        tara: receipt.companySnapshot.address.tara || 'RO',
        alteDetalii: receipt.companySnapshot.address.alteDetalii,
      },
    },

    client: {
      name: receipt.clientSnapshot.name,
      cui: receipt.clientSnapshot.cui || '',
      regCom: '',
      address: {
        strada: receipt.clientSnapshot.address.strada || '',
        numar: receipt.clientSnapshot.address.numar,
        localitate: receipt.clientSnapshot.address.localitate || '',
        judet: receipt.clientSnapshot.address.judet || '',
        tara: receipt.clientSnapshot.address.tara || 'RO',
        alteDetalii: receipt.clientSnapshot.address.alteDetalii,
      },
    },

    delegate: {
      name: receipt.representative,
    },

    // Notele conțin acum: Explicație + Facturi | Motiv Anulare (dacă e cazul)
    notes:
      receipt.status === 'CANCELLED'
        ? `${fullExplanation} | MOTIV ANULARE: ${receipt.cancellationReason || 'Nespecificat'} (Anulat de: ${receipt.cancelledByName || 'N/A'})`
        : fullExplanation,

    issuerName: receipt.amountInWords,

    logistic: {
      receivedBy: receipt.cashier.name,
    },

    items: [],

    totals: {
      subtotal: receipt.amount,
      vatTotal: 0,
      grandTotal: receipt.amount,
      currency: receipt.currency || 'RON',
    },
  }
}
