import { XMLParser } from 'fast-xml-parser'
import {
  ParsedAnafInvoice,
  UblAllowanceCharge,
  UblInvoice,
  UblInvoiceLine,
  XmlNumberValue,
  XmlTextValue,
} from './anaf.types'
import { getInternalUom } from '@/lib/constants/uom.constants'

function asArray<T>(item: T | T[] | undefined): T[] {
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}

const getText = (val: XmlTextValue): string => {
  if (val === undefined || val === null) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object' && '#text' in val) {
    return String(val['#text'])
  }
  return String(val)
}

const getNumber = (val: XmlNumberValue): number => {
  if (val === undefined || val === null) return 0
  if (typeof val === 'number') return val
  if (typeof val === 'object' && '#text' in val) {
    return Number(val['#text'])
  }
  return 0
}

export const parseAnafXml = (xmlContent: string): ParsedAnafInvoice => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
  })
  const result = parser.parse(xmlContent)
  // Verificăm care este rădăcina documentului
  const invoice = (result.Invoice || result.CreditNote) as UblInvoice

  if (!invoice)
    throw new Error('Format XML invalid (lipsă Invoice sau CreditNote).')

  // Determinăm tipul documentului: dacă are CreditNote, e STORNO
  const docType = result.CreditNote ? 'STORNO' : 'STANDARD'

  const invoiceTypeCode = getText(invoice.InvoiceTypeCode)

  //  FURNIZOR & ADRESA ---
  const supplierParty = invoice.AccountingSupplierParty?.Party
  const supplierCui = getText(supplierParty?.PartyTaxScheme?.CompanyID)
  const supplierRegCom = getText(supplierParty?.PartyLegalEntity?.CompanyID)
  const supplierCapital = getText(
    supplierParty?.PartyLegalEntity?.CompanyLegalForm
  )
  const supplierName =
    getText(supplierParty?.PartyName?.Name) ||
    getText(supplierParty?.PartyLegalEntity?.RegistrationName) ||
    'Furnizor Necunoscut'

  const sAddr = supplierParty?.PostalAddress
  const rawStreet = getText(sAddr?.StreetName)
  const rawCity = getText(sAddr?.CityName)
  const rawCounty = getText(sAddr?.CountrySubentity)
  const rawNumber = getText(sAddr?.BuildingNumber)
  const rawZip = getText(sAddr?.PostalZone)
  const rawCountry = getText(sAddr?.Country?.IdentificationCode) || ''

  const supplierAddressDetails = {
    street: rawStreet,
    city: rawCity,
    county: rawCounty.replace(/^RO-?/i, ''),
    number: rawNumber,
    zip: rawZip,
    country: rawCountry,
  }
  const supplierAddress = [
    rawStreet,
    rawNumber ? `Nr. ${rawNumber}` : '',
    rawCity,
    supplierAddressDetails.county,
    rawZip,
  ]
    .filter(Boolean)
    .join(', ')

  const sContact = supplierParty?.Contact
  const supplierContact = {
    name: getText(sContact?.Name),
    phone: getText(sContact?.Telephone),
    email: getText(sContact?.ElectronicMail),
  }

  //  CLIENT ----------------
  const customerParty = invoice.AccountingCustomerParty?.Party
  const customerCui = getText(customerParty?.PartyTaxScheme?.CompanyID)
  const customerName =
    getText(customerParty?.PartyLegalEntity?.RegistrationName) || 'Client'
  const customerRegCom = getText(customerParty?.PartyLegalEntity?.CompanyID)

  const cAddr = customerParty?.PostalAddress
  const cRawStreet = getText(cAddr?.StreetName)
  const cRawCity = getText(cAddr?.CityName)
  const cRawCounty = getText(cAddr?.CountrySubentity)
  const cRawNumber = getText(cAddr?.BuildingNumber)
  const cRawZip = getText(cAddr?.PostalZone)
  const cRawCountry = getText(cAddr?.Country?.IdentificationCode) || ''

  const customerAddressDetails = {
    street: cRawStreet,
    city: cRawCity,
    county: cRawCounty.replace(/^RO-?/i, ''),
    number: cRawNumber,
    zip: cRawZip,
    country: cRawCountry,
  }

  const cContact = customerParty?.Contact
  const customerContact = {
    name: getText(cContact?.Name),
    phone: getText(cContact?.Telephone),
    email: getText(cContact?.ElectronicMail),
  }

  //  PLATA -----------------------
  const pmArr = asArray(invoice.PaymentMeans)
  const pm = pmArr[0]
  const supplierIban = getText(pm?.PayeeFinancialAccount?.ID)
  const supplierBank = getText(pm?.PayeeFinancialAccount?.Name)
  const supplierBic = getText(
    pm?.PayeeFinancialAccount?.FinancialInstitutionBranch?.ID
  )
  const paymentId = getText(pm?.PaymentID)
  const paymentMethodCode = getText(pm?.PaymentMeansCode)
  const supplierBankAccounts = pmArr
    .map((p) => ({
      iban: getText(p.PayeeFinancialAccount?.ID),
      bank: getText(p.PayeeFinancialAccount?.Name),
      bic: getText(p.PayeeFinancialAccount?.FinancialInstitutionBranch?.ID),
    }))
    .filter((acc) => acc.iban) // Păstrăm doar cele care au IBAN valid
  const billingRefRaw = invoice.BillingReference?.InvoiceDocumentReference
  let billingReference = undefined
  if (billingRefRaw?.ID) {
    billingReference = {
      oldInvoiceNumber: getText(billingRefRaw.ID),
      oldInvoiceDate: billingRefRaw.IssueDate
        ? new Date(getText(billingRefRaw.IssueDate))
        : undefined,
    }
  }

  const exchangeRate = getNumber(invoice.TaxExchangeRate?.CalculationRate)
  //  REFERINTE -------------------
  const notes = asArray(invoice.Note).map((n) => getText(n))
  const contractReference = getText(invoice.ContractDocumentReference?.ID)
  const orderReference = getText(invoice.OrderReference?.ID)
  const salesOrderID = getText(invoice.OrderReference?.SalesOrderID)
  const despatchReference = getText(invoice.DespatchDocumentReference?.ID)
  const buyerReference = getText(invoice.BuyerReference)
  const delArr = asArray(invoice.Delivery)
  const deliveryLocationId = getText(delArr[0]?.DeliveryLocation?.ID)
  const deliveryPartyName = getText(delArr[0]?.DeliveryParty?.PartyName?.Name)
  const rawDeliveryDate = getText(delArr[0]?.ActualDeliveryDate)
  const actualDeliveryDate = rawDeliveryDate
    ? new Date(rawDeliveryDate)
    : undefined
  const ptArr = asArray(invoice.PaymentTerms)
  const paymentTermsNote = getText(ptArr[0]?.Note)

  // DATE ------------------------------
  const rawInvoiceId = String(invoice.ID || '')
  const match = rawInvoiceId.match(/^([A-Za-z\-]+)\s*(\d+)$/)
  const invoiceSeries = match && match[1] ? match[1] : 'SPV'
  const invoiceNumber = match && match[2] ? match[2] : rawInvoiceId

  const invoiceDate = new Date(
    getText(invoice.IssueDate) || new Date().toISOString()
  )
  const dueDate = new Date(
    getText(invoice.DueDate) || invoiceDate.toISOString()
  )
  const taxPointDate = invoice.TaxPointDate
    ? new Date(getText(invoice.TaxPointDate))
    : undefined

  const invoicePeriodRaw = invoice.InvoicePeriod
  let invoicePeriod = undefined
  if (invoicePeriodRaw) {
    const ip = Array.isArray(invoicePeriodRaw)
      ? invoicePeriodRaw[0]
      : invoicePeriodRaw
    if (ip.StartDate && ip.EndDate) {
      invoicePeriod = {
        startDate: new Date(getText(ip.StartDate)),
        endDate: new Date(getText(ip.EndDate)),
      }
    }
  }

  // TOTALURI (TOATE CAMPURILE) --------------------
  const totals = invoice.LegalMonetaryTotal
  const totalAmount = getNumber(totals?.TaxInclusiveAmount)
  let payableAmount = totalAmount // Default fallback
  if (totals && totals.PayableAmount !== undefined) {
    payableAmount = getNumber(totals.PayableAmount)
  }
  const prepaidAmount = getNumber(totals?.PrepaidAmount)
  const totalAllowance = getNumber(totals?.AllowanceTotalAmount)
  const totalCharges = getNumber(totals?.ChargeTotalAmount)
  const currency = getText(invoice.DocumentCurrencyCode) || 'RON'

  // TAXE (Defalcare)
  const taxTotalArr = asArray(invoice.TaxTotal)
  const taxObj = taxTotalArr.find((t) => t.TaxSubtotal) || taxTotalArr[0] // Cautam obiectul care are subtotaluri
  const totalTax = getNumber(taxObj?.TaxAmount)

  const taxSubtotals = asArray(taxObj?.TaxSubtotal).map((sub) => ({
    taxableAmount: getNumber(sub.TaxableAmount),
    taxAmount: getNumber(sub.TaxAmount),
    percent: getNumber(sub.TaxCategory?.Percent),
    categoryCode: getText(sub.TaxCategory?.ID),
    exemptionReason: getText(sub.TaxCategory?.TaxExemptionReason),
  }))

  // LINII ------------------------
  const rawLines = asArray(invoice.InvoiceLine || invoice.CreditNoteLine)
  const parsedLines = rawLines.map((line: UblInvoiceLine) => {
    // Cast temporar intern pt ca TS se incurca la complexitatea UBL
    const name = getText(line.Item?.Name) || 'Produs'
    const rawDesc = getText(line.Item?.Description)
    const rawNote = getText(line.Note)
    const description = [rawDesc, rawNote].filter(Boolean).join(' - ')
    const productCode = getText(
      line.Item?.SellersItemIdentification?.ID ||
        line.Item?.StandardItemIdentification?.ID
    )
    const commodityCode = getText(
      line.Item?.CommodityClassification?.ItemClassificationCode
    )
    const originCountry = getText(line.Item?.OriginCountry?.IdentificationCode)

    let quantity = 0
    let unitCode = 'H87'
    if (line.InvoicedQuantity && typeof line.InvoicedQuantity === 'object') {
      quantity = getNumber(line.InvoicedQuantity)
      unitCode = String(line.InvoicedQuantity['@_unitCode'] || 'H87')
    } else {
      quantity = getNumber(line.InvoicedQuantity)
    }
    const internalUnit = getInternalUom(unitCode) || 'bucata'

    const price = getNumber(line.Price?.PriceAmount)
    const baseQuantity = getNumber(line.Price?.BaseQuantity) || 1
    const lineValue = getNumber(line.LineExtensionAmount)
    const vatRate = getNumber(line.Item?.ClassifiedTaxCategory?.Percent)
    const vatAmount = parseFloat((lineValue * (vatRate / 100)).toFixed(2))

    // Calcul Discount/Taxa pe linie
    let lineAllowanceAmount = 0
    asArray<UblAllowanceCharge>(line.AllowanceCharge).forEach((c) => {
      const indicator = c.ChargeIndicator

      // Verificam daca e string 'true' sau boolean true
      const isCharge =
        String(indicator === 'true' || indicator === true) === 'true'
      const amt = getNumber(c.Amount)
      if (!isCharge) lineAllowanceAmount += amt
    })

    return {
      productName: name,
      productCode,
      productDescription: description,
      commodityCode,
      quantity,
      price,
      baseQuantity,
      unitOfMeasure: internalUnit,
      unitCode,
      vatRate,
      vatAmount,
      lineValue,
      lineAllowanceAmount,
      originCountry,
    }
  })

  return {
    supplierCui,
    supplierName,
    supplierAddress,
    supplierAddressDetails,
    customerAddressDetails,
    supplierIban,
    supplierBank,
    supplierBic,
    supplierBankAccounts,
    supplierContact,
    customerCui,
    customerName,
    customerContact,
    invoiceNumber,
    invoiceSeries,
    invoiceDate,
    dueDate,
    taxPointDate,
    invoicePeriod,
    notes,
    contractReference,
    orderReference,
    salesOrderID,
    despatchReference,
    buyerReference,
    deliveryLocationId,
    deliveryPartyName,
    actualDeliveryDate,
    paymentTermsNote,
    paymentId,
    totalAmount,
    totalTax,
    payableAmount,
    prepaidAmount,
    totalAllowance,
    totalCharges,
    currency,
    taxSubtotals,
    lines: parsedLines,
    supplierRegCom,
    supplierCapital,
    customerRegCom,
    paymentMethodCode,
    billingReference,
    exchangeRate,
    invoiceType: docType,
    invoiceTypeCode: invoiceTypeCode,
  }
}
