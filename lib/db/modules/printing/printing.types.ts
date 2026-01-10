// Structura standard pentru Adresă în PDF
export interface PdfAddress {
  judet: string
  localitate: string
  strada: string
  numar?: string
  codPostal?: string
  tara?: string
  alteDetalii?: string
}

// Structura standard pentru Companie/Partener
export interface PdfEntity {
  name: string
  cui: string
  regCom: string
  address: {
    strada: string
    numar?: string
    localitate: string
    judet: string
    tara: string
    alteDetalii?: string
  }
  bank?: string
  iban?: string
  capitalSocial?: string
  phone?: string
  email?: string
  // Adăugăm câmpuri opționale pentru Client
  contactPerson?: string
}

// Structura standard pentru Liniile din Tabel
export interface PdfLineItem {
  index: number
  name: string
  uom: string
  um: string
  quantity: number
  docQty?: number // Cantitate document
  recQty?: number // Cantitate recepționată
  diffQty?: number // Diferență
  price?: number // Poate lipsi la Aviz
  value?: number
  vatRate?: number
  vatValue?: number
  total?: number
  code?: string
  barcode?: string
  details?: string
}

// Totaluri Standard
export interface PdfTotals {
  subtotal: number
  vatTotal: number
  grandTotal: number
  transportValue?: number
  currency: string
  // Defalcare TVA (Opțional, pt facturi)
  vatBreakdown?: {
    rate: number
    base: number
    vat: number
  }[]
}

// Interfața Generic DTO pentru Printare
// Orice document (Invoice, Nir, etc) va fi convertit în asta.
export interface PdfDocumentData {
  type: 'INVOICE' | 'NOTICE' | 'RECEIPT' | 'DELIVERY_NOTE' | 'NIR'
  series: string
  number: string
  date: string
  dueDate?: string
  supplier: PdfEntity
  client: PdfEntity
  invoiceType?: string
  // Câmpuri noi pentru Logistică și Expediție
  logistic?: {
    orderNumber?: string
    deliveryNumber?: string
    deliveryNoteNumber?: string
    location?: string
    accompanyingDocs?: string
    receivedBy?: string
    carNumber?: string
    driverName?: string
  }
  notes?: string
  uitCode?: string
  delegate?: {
    name?: string
    vehicle?: string
    trailer?: string
  }
  issuerName?: string // Întocmit de
  deliveryAddress?: {
    judet: string
    localitate: string
    strada: string
    numar?: string
    codPostal: string
    tara: string
    alteDetalii?: string
    persoanaContact?: string
    telefonContact?: string
  }
  items: PdfLineItem[]
  totals: PdfTotals
  status?: string
}
