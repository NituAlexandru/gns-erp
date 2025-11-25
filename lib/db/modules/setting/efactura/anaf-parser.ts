import { XMLParser } from 'fast-xml-parser'
import { ParsedAnafInvoice, UblInvoice, UblInvoiceLine } from './anaf.types'
import { uomToEFacturaMap } from '@/lib/constants/uom.constants'

// Tip helper pentru valorile numerice din XML care pot fi obiecte sau numere
type XmlNumber = number | { '#text': number } | undefined | null

// Construim harta inversă: {'H87': 'bucata'}
const ANAF_TO_INTERNAL_UOM_MAP = Object.entries(uomToEFacturaMap).reduce(
  (acc, [internalKey, anafCode]) => {
    // Forțăm cheia să fie string pentru a evita erorile de indexare
    acc[String(anafCode)] = internalKey
    return acc
  },
  {} as Record<string, string>
)

export const parseAnafXml = (xmlContent: string): ParsedAnafInvoice => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true, 
  })

  const result = parser.parse(xmlContent)

  // Verificare mai strictă folosind unknown pentru siguranță
  if (!result || typeof result !== 'object' || !('Invoice' in result)) {
    throw new Error('Format XML invalid: Lipseste tag-ul rădăcină Invoice.')
  }

  const invoice = result.Invoice as UblInvoice

  // 1. Extragere Furnizor
  const supplierParty = invoice.AccountingSupplierParty?.Party
  const supplierCuiRaw = supplierParty?.PartyTaxScheme?.CompanyID || ''
  const supplierCui =
    typeof supplierCuiRaw === 'string' ? supplierCuiRaw : String(supplierCuiRaw)

  const supplierName =
    supplierParty?.PartyName?.Name ||
    supplierParty?.PartyLegalEntity?.RegistrationName ||
    'Furnizor Necunoscut'

  const addr = supplierParty?.PostalAddress
  const addressParts = [
    addr?.StreetName,
    addr?.CityName,
    addr?.CountrySubentity,
  ]
  const supplierAddress = addressParts
    .filter((p) => p && typeof p === 'string')
    .join(', ')

  // 2. Date Factură
  const rawInvoiceId = String(invoice.ID || '')
  const match = rawInvoiceId.match(/^([A-Za-z]+)(.*)$/)
  const invoiceSeries = match && match[1] ? match[1] : 'SPV'
  const invoiceNumber = match && match[2] ? match[2] : rawInvoiceId
  const issueDateStr = invoice.IssueDate || new Date().toISOString()
  const invoiceDate = new Date(issueDateStr)

  // Scadența
  const dueDateStr = invoice.DueDate || issueDateStr
  const dueDate = new Date(dueDateStr)

  // 3. Totaluri
  const getTotal = (val: XmlNumber): number => {
    if (typeof val === 'number') return val
    if (val && typeof val === 'object' && '#text' in val) return val['#text']
    return 0
  }

  const totalAmount = getTotal(invoice.LegalMonetaryTotal?.TaxInclusiveAmount)
  const currency = invoice.DocumentCurrencyCode || 'RON'

  // 4. Linii
  const rawLines = invoice.InvoiceLine
  const linesArray: UblInvoiceLine[] = Array.isArray(rawLines)
    ? rawLines
    : rawLines
      ? [rawLines]
      : []

  const parsedLines = linesArray.map((line) => {
    const name = line.Item?.Name || 'Produs Fără Nume'

    // Extragere Cantitate și Cod UM
    let quantity = 0
    let unitCode = 'H87'

    if (line.InvoicedQuantity) {
      if (
        typeof line.InvoicedQuantity === 'object' &&
        line.InvoicedQuantity !== null
      ) {
        quantity = parseFloat(String(line.InvoicedQuantity['#text'] || 0))
        unitCode = line.InvoicedQuantity['@_unitCode'] || unitCode
      } else {
        quantity = parseFloat(String(line.InvoicedQuantity))
      }
    }

    const internalUnit = ANAF_TO_INTERNAL_UOM_MAP[unitCode]

    if (!internalUnit) {
      throw new Error(
        `Unitate de măsură ANAF necunoscută: '${unitCode}' (produs: ${name}). Te rog adaug-o în uom.constants.ts`
      )
    }

    // Preț și Valoare
    const price =
      typeof line.Price?.PriceAmount === 'object'
        ? parseFloat(String(line.Price.PriceAmount['#text'] || 0))
        : parseFloat(String(line.Price?.PriceAmount || 0))

    const lineValue =
      typeof line.LineExtensionAmount === 'object'
        ? parseFloat(String(line.LineExtensionAmount['#text'] || 0))
        : parseFloat(String(line.LineExtensionAmount || 0))

    return {
      productName: name,
      quantity,
      price,
      unitOfMeasure: internalUnit,
      unitCode: unitCode,
      lineValue,
    }
  })

  return {
    supplierCui,
    supplierName: String(supplierName),
    supplierAddress,
    invoiceNumber,
    invoiceSeries,
    invoiceDate,
    dueDate,
    totalAmount,
    currency,
    lines: parsedLines,
  }
}
