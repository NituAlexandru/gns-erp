import { Document, Types } from 'mongoose'

// --- Tipuri pentru Builder ---
export interface XmlParty {
  name: string
  cui: string
  regCom?: string
  address: {
    street: string
    city: string
    countyCode: string // RO-B
    countryCode: string // RO
    zip?: string
  }
  email?: string
  phone?: string
  bank?: string
  iban?: string
}

export interface XmlLineItem {
  name: string
  quantity: number
  price: number // Fără TVA
  unitCode: string
  vatRate: number
  lineValue: number // Cantitate * Pret
  vatValue: number
}
export interface UblTaxSubtotal {
  'cbc:TaxableAmount': { '#text': number; '@_currencyID': string }
  'cbc:TaxAmount': { '#text': number; '@_currencyID': string }
  'cac:TaxCategory': {
    'cbc:ID': string
    'cbc:Percent': number
    'cbc:TaxExemptionReason'?: string
    'cac:TaxScheme': { 'cbc:ID': string }
  }
}

export interface UblInvoiceLine {
  'cbc:ID': string
  'cbc:InvoicedQuantity': {
    '#text': number
    '@_unitCode': string
  }
  'cbc:LineExtensionAmount': {
    '#text': number
    '@_currencyID': string
  }
  'cac:Item': {
    'cbc:Name': string
    'cbc:Description'?: string
    'cac:ClassifiedTaxCategory': {
      'cbc:ID': string
      'cbc:Percent': number
      'cac:TaxScheme': {
        'cbc:ID': string
      }
    }
  }
  'cac:Price': {
    'cbc:PriceAmount': {
      '#text': number
      '@_currencyID': string
    }
  }
}
// --- Interfața Modelului EfacturaOutgoing ---
export type EfacturaUploadStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED'

export interface EfacturaUploadAttempt {
  date: Date
  status: EfacturaUploadStatus
  uploadIndex?: string // ID-ul primit la upload (index_incarcare)
  xmlContent: string // XML-ul generat la acea încercare
  anafMessages?: string[] // Erori sau mesaje de la ANAF
  downloadId?: string // ID-ul zip-ului de validare (dacă e cazul)
  signedXmlContent?: string // XML-ul final, cu semnătura ANAF
}

export interface IEfacturaOutgoing extends Document {
  invoiceId: Types.ObjectId
  invoiceNumber: string
  // Statusul curent (cel mai recent)
  currentStatus: EfacturaUploadStatus
  // Istoricul tuturor încercărilor
  history: EfacturaUploadAttempt[]
  createdAt: Date
  updatedAt: Date
}
