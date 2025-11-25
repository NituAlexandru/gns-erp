import { Document } from 'mongoose'
import { AnafLogType, AnafProcessingStatus } from './anaf.constants'

export interface AnafMessageItem {
  data_creare: string // Format: "YYYYMMDDHHmm"
  id_descarcare: string
  id_solicitare: string
  cui_emitent: string
  tip: 'FACTURA_PRIMITA' | 'FACTURA_TRIMISA' | 'EROARE_FACTURA'
  detalii: string
  titlu: string
  serial: string
}

export interface AnafMessagesResponse {
  mesaje: AnafMessageItem[]
  serial: string
  cui: string
  titlu: string
}

// Interfața pentru răspunsul venit de la serverul ANAF (OAuth)
export interface AnafAuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  token_type: string
}

// Interfața pentru documentul din baza noastră de date
export interface IAnafToken extends Document {
  iv: string // Vectorul de inițializare pentru decriptare AccessToken
  encryptedAccessToken: string
  encryptedRefreshToken: string // Aici vom stoca formatul "data:iv" pentru simplitate
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
  updatedAt: Date
  createdAt: Date
}
export interface IAnafMessage extends Document {
  id_descarcare: string
  cui_emitent: string
  titlu: string
  tip: 'FACTURA_PRIMITA' | 'FACTURA_TRIMISA' | 'EROARE_FACTURA'
  data_creare: Date
  serial: string
  detalii?: string
  is_downloaded: boolean
  processing_status: AnafProcessingStatus
  processing_error?: string
  related_invoice_id?: string // ObjectId as string
  createdAt: Date
  updatedAt: Date
}

export interface IAnafLog extends Document {
  type: AnafLogType
  action: string
  message: string
  details?: unknown
  createdAt: Date
}

// --- INTERFEȚE PARSARE XML (UBL 2.1 Subset) ---

// Structura unui rând din XML (Raw)
export interface UblInvoiceLine {
  Item?: {
    Name?: string
  }
  InvoicedQuantity?:
    | number
    | {
        '#text': number
        '@_unitCode': string
      }
  Price?: {
    PriceAmount?: number
  }
  LineExtensionAmount?:
    | number
    | {
        '#text': number
        '@_currencyID': string
      }
}

// Structura Facturii din XML (Raw)
export interface UblInvoice {
  ID?: string | number
  IssueDate?: string
  DueDate?: string
  DocumentCurrencyCode?: string
  AccountingSupplierParty?: {
    Party?: {
      PartyTaxScheme?: {
        CompanyID?: string
      }
      PartyName?: {
        Name?: string
      }
      PartyLegalEntity?: {
        RegistrationName?: string
      }
      PostalAddress?: {
        StreetName?: string
        CityName?: string
        CountrySubentity?: string
      }
    }
  }
  LegalMonetaryTotal?: {
    TaxInclusiveAmount?: number | { '#text': number } // Total cu TVA
    TaxExclusiveAmount?: number | { '#text': number } // Total fara TVA
  }
  InvoiceLine?: UblInvoiceLine | UblInvoiceLine[] // Poate fi un obiect sau array
}

// Rezultatul Parsat (Clean)
export interface ParsedAnafInvoice {
  supplierCui: string
  supplierName: string
  supplierAddress: string
  invoiceNumber: string
  invoiceSeries: string
  invoiceDate: Date
  dueDate: Date
  totalAmount: number
  currency: string
  lines: Array<{
    productName: string
    quantity: number
    price: number
    unitOfMeasure: string // Unitatea internă (ex: 'bucata')
    unitCode: string // Codul original (ex: 'H87')
    lineValue: number
  }>
}
