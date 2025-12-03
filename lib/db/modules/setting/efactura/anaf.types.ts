import { Document } from 'mongoose'
import { AnafLogType, AnafProcessingStatus } from './anaf.constants'

// --- TYPE GUARDS & HELPERS ---
export type XmlTextValue = string | { '#text': string } | undefined
export type XmlNumberValue = number | { '#text': number } | undefined

export interface AnafMessageItem {
  data_creare: string // Format: "YYYYMMDDHHmm"
  id_descarcare: string
  id_solicitare: string
  cui_emitent: string
  tip: 'FACTURA_PRIMITA' | 'FACTURA_TRIMISA' | 'EROARE_FACTURA'
  detalii: string
  titlu: string
  serial: string
  id?: string
  cif_emitent?: string
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
export interface UblTaxSubtotal {
  TaxableAmount?: XmlNumberValue
  TaxAmount?: XmlNumberValue
  TaxCategory?: {
    ID?: XmlTextValue
    Percent?: XmlNumberValue
    TaxExemptionReason?: XmlTextValue
    TaxScheme?: { ID?: XmlTextValue }
  }
}

export interface UblAllowanceCharge {
  ChargeIndicator?: XmlTextValue | boolean
  Amount?: XmlNumberValue
  BaseAmount?: XmlNumberValue
}

export interface UblInvoicePeriod {
  StartDate?: XmlTextValue
  EndDate?: XmlTextValue
}
// Interfața pentru documentul din baza noastră de date
export interface IAnafToken extends Document {
  iv: string // Vectorul de inițializare pentru decriptare AccessToken
  encryptedAccessToken: string
  encryptedRefreshToken: string
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
  related_invoice_id?: string
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

// Structura unui rând din XML (Raw)
export interface UblInvoiceLine {
  AllowanceCharge?: UblAllowanceCharge | UblAllowanceCharge[]
  Item?: {
    Name?: string
    Description?: string
    CommodityClassification?: {
      ItemClassificationCode?: { '#text': string } | string
    }
    SellersItemIdentification?: { ID?: string | { '#text': string } }
    StandardItemIdentification?: { ID?: string | { '#text': string } }
    ClassifiedTaxCategory?: {
      Percent?: number | { '#text': number }
    }
    OriginCountry?: { IdentificationCode?: string | { '#text': string } }
  }
  InvoicedQuantity?:
    | number
    | {
        '#text': number
        '@_unitCode': string
      }
  Price?: {
    PriceAmount?: number | { '#text': number }
    BaseQuantity?: number | { '#text': number }
  }
  LineExtensionAmount?:
    | number
    | {
        '#text': number
        '@_currencyID': string
      }
  Note?: XmlTextValue
}

// Structura Facturii din XML (Raw)
export interface UblInvoice {
  ID?: XmlTextValue
  IssueDate?: string
  DueDate?: string
  TaxPointDate?: XmlTextValue // Data exigibilitatii
  InvoiceTypeCode?: XmlTextValue
  Note?: XmlTextValue | XmlTextValue[]
  DocumentCurrencyCode?: XmlTextValue
  BuyerReference?: XmlTextValue
  InvoicePeriod?: UblInvoicePeriod
  ContractDocumentReference?: { ID?: XmlTextValue }
  OrderReference?: { ID?: XmlTextValue; SalesOrderID?: XmlTextValue }
  DespatchDocumentReference?: { ID?: XmlTextValue }
  BillingReference?: {
    InvoiceDocumentReference?: {
      ID?: XmlTextValue
      IssueDate?: XmlTextValue
    }
  }
  TaxExchangeRate?: {
    CalculationRate?: XmlNumberValue
    SourceCurrencyCode?: XmlTextValue
    TargetCurrencyCode?: XmlTextValue
  }
  AccountingSupplierParty?: {
    Party?: {
      PartyName?: { Name?: XmlTextValue }
      PartyLegalEntity?: {
        RegistrationName?: XmlTextValue
        CompanyID?: XmlTextValue
        CompanyLegalForm?: XmlTextValue
      }
      PartyTaxScheme?: { CompanyID?: XmlTextValue }
      PostalAddress?: {
        StreetName?: XmlTextValue
        CityName?: XmlTextValue
        CountrySubentity?: XmlTextValue
        BuildingNumber?: XmlTextValue
        PostalZone?: XmlTextValue
        Country?: { IdentificationCode?: XmlTextValue }
      }
      Contact?: {
        Name?: XmlTextValue
        Telephone?: XmlTextValue
        ElectronicMail?: XmlTextValue
      }
    }
  }
  AccountingCustomerParty?: {
    Party?: {
      PartyName?: { Name?: XmlTextValue }
      PartyLegalEntity?: {
        RegistrationName?: XmlTextValue
        CompanyID?: XmlTextValue
      }
      PartyTaxScheme?: { CompanyID?: XmlTextValue }
      PostalAddress?: {
        StreetName?: XmlTextValue
        CityName?: XmlTextValue
        CountrySubentity?: XmlTextValue
        BuildingNumber?: XmlTextValue
        PostalZone?: XmlTextValue
        Country?: { IdentificationCode?: XmlTextValue }
      }
      Contact?: {
        Name?: XmlTextValue
        Telephone?: XmlTextValue
        ElectronicMail?: XmlTextValue
      }
    }
  }
  Delivery?:
    | {
        DeliveryLocation?: { ID?: XmlTextValue }
        DeliveryParty?: { PartyName?: { Name?: XmlTextValue } }

        ActualDeliveryDate?: string | XmlTextValue
      }
    | Array<{
        DeliveryLocation?: { ID?: XmlTextValue }
        DeliveryParty?: { PartyName?: { Name?: XmlTextValue } }
        ActualDeliveryDate?: string | XmlTextValue
      }>
  PaymentMeans?:
    | {
        PaymentMeansCode?: XmlTextValue
        PaymentID?: XmlTextValue
        PayeeFinancialAccount?: {
          ID?: XmlTextValue
          Name?: XmlTextValue
          FinancialInstitutionBranch?: { ID?: XmlTextValue }
        }
      }
    | Array<{
        PaymentMeansCode?: XmlTextValue
        PayeeFinancialAccount?: {
          ID?: XmlTextValue
          Name?: XmlTextValue
          FinancialInstitutionBranch?: { ID?: XmlTextValue }
        }
        PaymentID?: XmlTextValue
      }>
  PaymentTerms?: { Note?: XmlTextValue } | Array<{ Note?: XmlTextValue }>
  TaxTotal?:
    | {
        TaxAmount?: XmlNumberValue
        TaxSubtotal?: UblTaxSubtotal | UblTaxSubtotal[]
      }
    | Array<{
        TaxAmount?: XmlNumberValue
        TaxSubtotal?: UblTaxSubtotal | UblTaxSubtotal[]
      }>
  LegalMonetaryTotal?: {
    LineExtensionAmount?: XmlNumberValue
    TaxExclusiveAmount?: XmlNumberValue
    TaxInclusiveAmount?: XmlNumberValue
    PayableAmount?: XmlNumberValue
    PrepaidAmount?: XmlNumberValue
    AllowanceTotalAmount?: XmlNumberValue
    ChargeTotalAmount?: XmlNumberValue
  }
  InvoiceLine?:
    | (UblInvoiceLine & {
        AllowanceCharge?: UblAllowanceCharge | UblAllowanceCharge[]
        Price?: { PriceAmount?: XmlNumberValue; BaseQuantity?: XmlNumberValue }
        Item?: { OriginCountry?: { IdentificationCode?: XmlTextValue } }
      })
    | Array<
        UblInvoiceLine & {
          AllowanceCharge?: UblAllowanceCharge | UblAllowanceCharge[]
          Price?: {
            PriceAmount?: XmlNumberValue
            BaseQuantity?: XmlNumberValue
          }
          Item?: { OriginCountry?: { IdentificationCode?: XmlTextValue } }
        }
      >
  CreditNoteLine?:
    | (UblInvoiceLine & {
        AllowanceCharge?: UblAllowanceCharge | UblAllowanceCharge[]
        Price?: { PriceAmount?: XmlNumberValue; BaseQuantity?: XmlNumberValue }
        Item?: { OriginCountry?: { IdentificationCode?: XmlTextValue } }
      })
    | Array<
        UblInvoiceLine & {
          AllowanceCharge?: UblAllowanceCharge | UblAllowanceCharge[]
          Price?: {
            PriceAmount?: XmlNumberValue
            BaseQuantity?: XmlNumberValue
          }
          Item?: { OriginCountry?: { IdentificationCode?: XmlTextValue } }
        }
      >
}

export interface ParsedAnafInvoice {
  supplierCui: string
  supplierName: string
  supplierRegCom?: string
  supplierCapital?: string
  supplierAddress: string
  supplierAddressDetails: {
    street: string
    number: string
    city: string
    county: string
    zip: string
    country: string
  }
  customerAddressDetails?: {
    street: string
    number: string
    city: string
    county: string
    zip: string
    country: string
  }
  supplierIban: string
  supplierBank: string
  supplierBic?: string
  supplierBankAccounts?: Array<{
    bank: string
    iban: string
    bic: string
  }>
  supplierContact?: { name?: string; phone?: string; email?: string }
  customerCui: string
  customerName: string
  customerContact?: { name?: string; phone?: string; email?: string }
  customerRegCom?: string
  paymentMethodCode?: string
  invoiceNumber: string
  invoiceSeries: string
  invoiceTypeCode: string
  invoiceDate: Date
  dueDate: Date
  taxPointDate?: Date
  invoicePeriod?: {
    startDate: Date
    endDate: Date
  }
  billingReference?: {
    oldInvoiceNumber: string
    oldInvoiceDate?: Date
  }
  exchangeRate?: number
  invoiceType: 'STANDARD' | 'STORNO'
  notes: string[]
  contractReference: string
  orderReference: string
  despatchReference: string
  salesOrderID?: string
  buyerReference?: string
  deliveryLocationId?: string
  deliveryPartyName?: string
  actualDeliveryDate?: Date
  paymentTermsNote?: string
  paymentId?: string
  totalAmount: number
  totalTax: number
  payableAmount: number
  prepaidAmount: number
  totalAllowance: number
  totalCharges: number
  currency: string
  taxSubtotals: Array<{
    taxableAmount: number
    taxAmount: number
    percent: number
    categoryCode: string
    exemptionReason?: string
  }>
  lines: Array<{
    productName: string
    productCode: string
    productDescription?: string
    commodityCode?: string
    quantity: number
    price: number
    baseQuantity: number
    unitOfMeasure: string
    unitCode: string
    vatRate: number
    vatAmount: number
    lineValue: number
    lineAllowanceAmount: number
    originCountry?: string
  }>
}
