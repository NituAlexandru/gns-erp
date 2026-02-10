import { XMLBuilder } from 'fast-xml-parser'
import { format } from 'date-fns'
import {
  getCountyCode,
  PAYMENT_METHOD_TO_ANAF,
  VAT_CATEGORY_CODES,
} from './outgoing.constants'
import { getEFacturaUomCode } from '@/lib/constants/uom.constants'
import { UblInvoiceLine, UblTaxSubtotal } from './outgoing.types'
import { PopulatedInvoice } from '../../../financial/invoices/invoice.types'
import { PaymentMethodKey } from '../../../financial/treasury/payment.constants'

interface BuildXmlOptions {
  invoice: PopulatedInvoice
  paymentMethod?: PaymentMethodKey
}

const formatAnafCity = (city: string, countyCode: string): string => {
  const cleanCity = city.trim().toUpperCase()

  if (countyCode === 'RO-B') {
    // Încercăm să detectăm sectorul din string (ex: "Sector 4", "Bucuresti Sector 1")
    if (cleanCity.includes('1')) return 'SECTOR1'
    if (cleanCity.includes('2')) return 'SECTOR2'
    if (cleanCity.includes('3')) return 'SECTOR3'
    if (cleanCity.includes('4')) return 'SECTOR4'
    if (cleanCity.includes('5')) return 'SECTOR5'
    if (cleanCity.includes('6')) return 'SECTOR6'

    return 'SECTOR1'
  }

  return city
}

export const buildAnafXml = ({
  invoice,
  paymentMethod,
}: BuildXmlOptions): string => {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressBooleanAttributes: false,
  })

  // 1. Determină tipul facturii
  const invoiceTypeCode = invoice.invoiceType === 'STORNO' ? '380' : '380'
  // 2. Mapare Furnizor
  const supplierSnapshot = invoice.companySnapshot
  const supplierCity = supplierSnapshot.address.localitate
  const supplierCounty = getCountyCode(supplierSnapshot.address.judet)
  const supplierStreet = [
    supplierSnapshot.address.strada,
    supplierSnapshot.address.numar
      ? `Nr. ${supplierSnapshot.address.numar}`
      : '',
    supplierSnapshot.address.alteDetalii,
  ]
    .filter(Boolean)
    .join(', ')
  // 3. Mapare Client
  const clientSnapshot = invoice.clientSnapshot
  const clientID = clientSnapshot.cui || clientSnapshot.cnp
  //  Considerăm că e firmă doar dacă are CUI și CUI-ul e scurt (max 12 caractere)
  // CNP-urile au 13 caractere. Astfel eviți ca un CNP pus din greșeală la CUI să fie tratat ca firmă.
  const isCompany = !!clientSnapshot.cui && clientSnapshot.cui.length < 13
  const hasRoPrefix =
    clientSnapshot.cui && clientSnapshot.cui.toUpperCase().startsWith('RO')
  const clientCounty = getCountyCode(clientSnapshot.address.judet)
  const clientCity = formatAnafCity(
    clientSnapshot.address.localitate || '',
    clientCounty,
  )
  const clientStreet = [
    clientSnapshot.address.strada,
    clientSnapshot.address.numar ? `Nr. ${clientSnapshot.address.numar}` : '',
    clientSnapshot.address.alteDetalii,
  ]
    .filter(Boolean)
    .join(', ')

  const globalTaxCategoryCode =
    invoice.vatCategory || VAT_CATEGORY_CODES.STANDARD

  // 4. Linii Factură & Taxe
  const invoiceLines: UblInvoiceLine[] = []
  const taxSubtotalsMap = new Map<
    number,
    { taxableAmount: number; taxAmount: number }
  >()

  for (let i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i]

    // 1. Calculăm conversia pentru descriere
    let descriptionExtension = ''
    if (item.packagingOptions && item.packagingOptions.length > 0) {
      const currentUom = item.unitOfMeasure.toLowerCase()
      const currentOption = item.packagingOptions.find(
        (opt) => opt.unitName.toLowerCase() === currentUom,
      )

      if (currentOption) {
        const candidates = item.packagingOptions
          .filter(
            (opt) => opt.baseUnitEquivalent < currentOption.baseUnitEquivalent,
          )
          .sort((a, b) => b.baseUnitEquivalent - a.baseUnitEquivalent)

        let targetUnitName = item.baseUnit
        let ratio = currentOption.baseUnitEquivalent

        if (candidates.length > 0) {
          const bestSubUnit = candidates[0]
          targetUnitName = bestSubUnit.unitName
          ratio =
            currentOption.baseUnitEquivalent / bestSubUnit.baseUnitEquivalent
        }

        if (ratio > 1) {
          const formattedRatio = Number(ratio.toFixed(2))
          descriptionExtension = `Produs vandut la ${currentOption.unitName} (1 ${currentOption.unitName} = ${formattedRatio} ${targetUnitName})`
        }
      }
    }

    // 2. Definim finalDescription (curățată)
    const finalDescription = descriptionExtension.trim()

    // 3. Pregătim variabilele standard

    // const quantity = Number(item.quantity.toFixed(2))
    // FIX BR-27: Dacă prețul e negativ, mutăm minusul la cantitate
    const quantity = Number(
      (item.unitPrice < 0 ? -item.quantity : item.quantity).toFixed(2),
    )
    const lineValue = Number(item.lineValue.toFixed(2))
    const vatRate = item.vatRateDetails.rate
    const vatValue = Number(item.vatRateDetails.value.toFixed(2))
    const lineId = (i + 1).toString()

    const existing = taxSubtotalsMap.get(vatRate) || {
      taxableAmount: 0,
      taxAmount: 0,
    }
    existing.taxableAmount += lineValue
    existing.taxAmount += vatValue
    taxSubtotalsMap.set(vatRate, existing)

    const mappedCode = getEFacturaUomCode(item.unitOfMeasure)
    const uomCode = item.unitOfMeasureCode || mappedCode || 'H87'

    if (!uomCode) {
      throw new Error(
        `Produsul "${item.productName}" (linie ${lineId}) are unitatea "${item.unitOfMeasure}" care nu poate fi mapată la un cod e-Factura.`,
      )
    }

    // 4. Construim obiectul liniei (AICI FOLOSIM finalDescription)
    invoiceLines.push({
      'cbc:ID': lineId,
      'cbc:InvoicedQuantity': {
        '#text': quantity,
        '@_unitCode': uomCode,
      },
      'cbc:LineExtensionAmount': {
        '#text': lineValue,
        '@_currencyID': invoice.companySnapshot.currency,
      },
      'cac:Item': {
        ...(finalDescription ? { 'cbc:Description': finalDescription } : {}),
        'cbc:Name': item.productName,

        ...(item.productCode
          ? {
              'cac:SellersItemIdentification': {
                'cbc:ID': item.productCode,
              },
            }
          : {}),
        'cac:ClassifiedTaxCategory': {
          'cbc:ID': globalTaxCategoryCode,
          'cbc:Percent': vatRate,
          'cac:TaxScheme': {
            'cbc:ID': 'VAT',
          },
        },
      },
      'cac:Price': {
        'cbc:PriceAmount': {
          // '#text': Number(item.unitPrice.toFixed(4)),
          '#text': Number(Math.abs(item.unitPrice).toFixed(4)),
          '@_currencyID': invoice.companySnapshot.currency,
        },
      },
    })
  }

  // 5. Construire TaxTotal
  const taxSubtotals: UblTaxSubtotal[] = []
  let totalTaxAmount = 0

  taxSubtotalsMap.forEach((val, rate) => {
    totalTaxAmount += val.taxAmount
    const taxCategoryCode = globalTaxCategoryCode

    // Calculăm motivul înainte de a construi obiectul
    const exemptionReason =
      taxCategoryCode !== 'S' && invoice.vatExemptionReason
        ? invoice.vatExemptionReason
        : undefined

    const subtotalObj: UblTaxSubtotal = {
      'cbc:TaxableAmount': {
        '#text': Number(val.taxableAmount.toFixed(2)),
        '@_currencyID': invoice.companySnapshot.currency,
      },
      'cbc:TaxAmount': {
        '#text': Number(val.taxAmount.toFixed(2)),
        '@_currencyID': invoice.companySnapshot.currency,
      },
      'cac:TaxCategory': {
        'cbc:ID': taxCategoryCode,
        'cbc:Percent': rate,

        // 👇 AICI ESTE FIX-UL: Inserăm motivul ÎNAINTE de TaxScheme
        ...(exemptionReason
          ? { 'cbc:TaxExemptionReason': exemptionReason }
          : {}),

        // TaxScheme trebuie să fie ULTIMUL element din TaxCategory
        'cac:TaxScheme': { 'cbc:ID': 'VAT' },
      },
    }

    taxSubtotals.push(subtotalObj)
  })

  // 6. Payment Means
  let paymentMeansCode = '42'
  // Am scos paymentInstruction (InstructionNote) pentru că genera eroare UBL-CR-681

  if (paymentMethod) {
    const anafCode = PAYMENT_METHOD_TO_ANAF[paymentMethod]
    if (anafCode) {
      paymentMeansCode = anafCode
    }
  }

  // --- LOGISTICĂ & LIVRARE ---

  // A. Comenzi (Concatenate cu virgulă)
  const orderRef =
    invoice.logisticSnapshots?.orderNumbers?.filter(Boolean).join(', ') || ''

  // B. Avize (Array de ID-uri)
  // Facem cast la any[] pentru că TS nu știe încă de populate-ul din action, dar datele sunt acolo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkedNotes = (invoice.sourceDeliveryNotes || []) as any[]

  const despatchIds =
    linkedNotes.length > 0
      ? linkedNotes.map((n) => n.seriesName + '-' + n.noteNumber)
      : invoice.logisticSnapshots?.deliveryNoteNumbers?.filter(Boolean) || []

  // C. Adresa de Livrare
  const deliveryAddr = invoice.deliveryAddress
  const hasDelivery =
    deliveryAddr && (!!deliveryAddr.strada || !!deliveryAddr.localitate)

  const deliveryCounty = deliveryAddr?.judet
    ? getCountyCode(deliveryAddr.judet)
    : ''
  const deliveryCity = deliveryAddr?.localitate
    ? formatAnafCity(deliveryAddr.localitate, deliveryCounty)
    : ''
  const deliveryStreet = deliveryAddr
    ? [
        deliveryAddr.strada,
        deliveryAddr.numar ? `Nr. ${deliveryAddr.numar}` : '',
        deliveryAddr.alteDetalii,
      ]
        .filter(Boolean)
        .join(', ')
    : ''

  const deliveryContactName = deliveryAddr?.persoanaContact || ''

  // 7. Obiectul Rădăcină
  const ublObj = {
    Invoice: {
      '@_xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      '@_xmlns:cac':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      '@_xmlns:cbc':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',

      'cbc:CustomizationID':
        'urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1',
      'cbc:ID': `${invoice.seriesName}-${invoice.invoiceNumber}`,
      'cbc:IssueDate': format(new Date(invoice.invoiceDate), 'yyyy-MM-dd'),
      'cbc:DueDate': format(new Date(invoice.dueDate), 'yyyy-MM-dd'),
      'cbc:InvoiceTypeCode': invoiceTypeCode,
      // --- NOU: NOTE / MENȚIUNI (Acum pentru orice tip de factură) ---

      ...(invoice.notes
        ? {
            'cbc:Note': invoice.notes,
          }
        : {}),

      'cbc:DocumentCurrencyCode': invoice.companySnapshot.currency,

      // --- REFERINȚĂ COMANDĂ (0..1) ---
      ...(orderRef
        ? {
            'cac:OrderReference': {
              'cbc:ID': orderRef,
            },
          }
        : {}),

      // --- REFERINȚE AVIZE (0..n) ---
      ...(despatchIds.length > 0
        ? {
            'cac:DespatchDocumentReference': {
              'cbc:ID': despatchIds.join(', '),
            },
          }
        : {}),

      'cac:AccountingSupplierParty': {
        'cac:Party': {
          // 1. Identificare (Nou: Adăugat conform modelului Cemrom)
          'cac:PartyIdentification': {
            'cbc:ID': supplierSnapshot.cui,
          },
          // 2. Nume
          'cac:PartyName': { 'cbc:Name': supplierSnapshot.name },
          // 3. Adresă (Corectată anterior)
          'cac:PostalAddress': {
            'cbc:StreetName': supplierStreet,
            'cbc:CityName': supplierCity,
            'cbc:CountrySubentity': supplierCounty,
            'cac:Country': { 'cbc:IdentificationCode': 'RO' },
          },
          // 4. Regim Fiscal (TVA) -> Aici e OBLIGATORIU CUI-ul cu RO
          'cac:PartyTaxScheme': {
            'cbc:CompanyID': supplierSnapshot.cui,
            'cac:TaxScheme': { 'cbc:ID': 'VAT' },
          },
          // 5. Entitate Legală -> AICI PUNEM J-ul (RegCom)
          'cac:PartyLegalEntity': {
            'cbc:RegistrationName': supplierSnapshot.name,
            'cbc:CompanyID': supplierSnapshot.regCom || supplierSnapshot.cui, // <--- MODIFICAREA CRITICĂ
          },
          'cac:Contact': {
            'cbc:Name': supplierSnapshot.name,
            'cbc:Telephone': supplierSnapshot.phone,
            'cbc:ElectronicMail': supplierSnapshot.email,
          },
        },
      },

      'cac:AccountingCustomerParty': {
        'cac:Party': {
          // 1. Identificare
          'cac:PartyIdentification': {
            'cbc:ID': clientID,
          },
          'cac:PartyName': { 'cbc:Name': clientSnapshot.name },
          'cac:PostalAddress': {
            'cbc:StreetName': clientStreet,
            'cbc:CityName': clientCity,
            'cbc:CountrySubentity': clientCounty,
            'cac:Country': { 'cbc:IdentificationCode': 'RO' },
          },
          // 4. Regim Fiscal -> RO Obligatoriu la TaxScheme
          ...(isCompany && hasRoPrefix
            ? {
                'cac:PartyTaxScheme': {
                  'cbc:CompanyID': clientSnapshot.cui, // Aici folosim strict CUI-ul existent
                  'cac:TaxScheme': { 'cbc:ID': 'VAT' },
                },
              }
            : {}),
          // 5. Entitate Legală -> AICI PUNEM J-ul (RegCom)
          'cac:PartyLegalEntity': {
            'cbc:RegistrationName': clientSnapshot.name,
            'cbc:CompanyID':
              hasRoPrefix && clientSnapshot.regCom
                ? clientSnapshot.regCom
                : clientID,
          },
        },
      },
      // --- DETALII LIVRARE (Dacă există) ---
      ...(hasDelivery
        ? {
            'cac:Delivery': {
              // Nu punem dată dacă nu o știm sigur, lăsăm doar locația
              'cac:DeliveryLocation': {
                'cac:Address': {
                  'cbc:StreetName': deliveryStreet || 'Adresa Livrare',
                  'cbc:CityName': deliveryCity || 'Necunoscut',
                  'cbc:CountrySubentity': deliveryCounty || getCountyCode(),
                  'cac:Country': { 'cbc:IdentificationCode': 'RO' },
                },
              },
              ...(deliveryContactName
                ? {
                    'cac:DeliveryParty': {
                      'cac:PartyName': { 'cbc:Name': deliveryContactName },
                    },
                  }
                : {}),
            },
          }
        : {}),
      'cac:PaymentMeans': {
        'cbc:PaymentMeansCode': paymentMeansCode,
        'cac:PayeeFinancialAccount': {
          'cbc:ID': supplierSnapshot.iban,
          'cbc:Name': supplierSnapshot.bank,
        },
      },

      'cac:TaxTotal': {
        'cbc:TaxAmount': {
          '#text': Number(totalTaxAmount.toFixed(2)),
          '@_currencyID': invoice.companySnapshot.currency,
        },
        'cac:TaxSubtotal': taxSubtotals,
      },

      'cac:LegalMonetaryTotal': {
        'cbc:LineExtensionAmount': {
          '#text': Number(invoice.totals.subtotal.toFixed(2)),
          '@_currencyID': invoice.companySnapshot.currency,
        },
        'cbc:TaxExclusiveAmount': {
          '#text': Number(invoice.totals.subtotal.toFixed(2)),
          '@_currencyID': invoice.companySnapshot.currency,
        },
        'cbc:TaxInclusiveAmount': {
          '#text': Number(invoice.totals.grandTotal.toFixed(2)),
          '@_currencyID': invoice.companySnapshot.currency,
        },
        'cbc:PayableAmount': {
          '#text': Number(invoice.totals.grandTotal.toFixed(2)),
          '@_currencyID': invoice.companySnapshot.currency,
        },
      },

      'cac:InvoiceLine': invoiceLines,
    },
  }

  return builder.build(ublObj)
}
