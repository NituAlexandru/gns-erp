import { PdfDocumentData, PdfEntity } from '../printing.types'

export const mapSupplierLedgerToPdfData = (
  supplierData: any, // Datele furnizorului (partenerul)
  myCompanyData: any, // Datele firmei tale (acum tu ești Clientul în relația asta)
  entries: any[],
  summary: any,
): PdfDocumentData => {
  // 1. CALCUL TOTALURI
  const totalDebit = entries.reduce((acc, curr) => acc + (curr.debit || 0), 0)
  const totalCredit = entries.reduce(
    (acc, curr) => acc + (Math.abs(curr.credit) || 0),
    0,
  )
  // Luăm ultimul runningBalance
  const finalBalance =
    entries.length > 0 ? entries[entries.length - 1].runningBalance : 0

  // 2. MAPARE FURNIZOR (Partenerul) - El emite factura, deci el e 'supplier' în PDF
  // Folosim schema ISupplierDoc pe care mi-ai dat-o
  const supplierAddress = {
    strada: supplierData.address.strada || '',
    numar: supplierData.address.numar || '',
    localitate: supplierData.address.localitate || '',
    judet: supplierData.address.judet || '',
    tara: supplierData.address.tara || 'RO',
    alteDetalii: supplierData.address.alteDetalii || '',
  }

  const pdfSupplier: PdfEntity = {
    name: supplierData.name,
    cui: supplierData.fiscalCode || '', // Din ISupplierDoc
    regCom: supplierData.regComNumber || '', // Din ISupplierDoc
    address: supplierAddress,
    bank: supplierData.bankAccountLei?.bankName || '',
    iban: supplierData.bankAccountLei?.iban || '',
    email: supplierData.email,
    phone: supplierData.phone,
    contactPerson: supplierData.address.persoanaContact,
  }

  // 3. MAPARE CLIENT (Firma Ta) - Tu ești beneficiarul
  const defaultBank =
    myCompanyData.bankAccounts?.find((b: any) => b.isDefault) ||
    myCompanyData.bankAccounts?.[0]

  const pdfClient: PdfEntity = {
    name: myCompanyData.name,
    cui: myCompanyData.cui,
    regCom: myCompanyData.regCom,
    address: {
      strada: myCompanyData.address?.strada || '',
      numar: myCompanyData.address?.numar || '',
      localitate: myCompanyData.address?.localitate || '',
      judet: myCompanyData.address?.judet || '',
      tara: myCompanyData.address?.tara || 'RO',
      alteDetalii: myCompanyData.address?.alteDetalii || '',
    },
    bank: defaultBank?.bankName,
    iban: defaultBank?.iban,
    email: myCompanyData.emails?.[0]?.address,
    phone: myCompanyData.phones?.[0]?.number,
  }

  return {
    type: 'SUPPLIER_LEDGER',
    series: '',
    number: '',
    date: new Date().toISOString(),

    // Inversam rolurile fata de Fisa Client:
    // Partenerul este Supplier (sus stanga), Tu esti Client (sus dreapta)
    supplier: pdfSupplier,
    client: pdfClient,

    ledgerData: {
      summary: {
        initialBalance: 0,
        totalDebit,
        totalCredit,
        finalBalance,
      },
      entries: entries.map((entry) => {
        let details = entry.details

        // --- LOGICA COPIATĂ DIN FRONTEND (SupplierLedgerTable) ---
        // Verificăm după numărul documentului, nu după index
        if (entry.documentNumber && entry.documentNumber.startsWith('INIT-F')) {
          // La furnizor:
          // Credit > 0 înseamnă că avem o datorie istorică (Credit)
          // Altfel (dacă e negativ sau pe debit) înseamnă că am dat un avans istoric (Debit)
          if (Number(entry.credit) > 0) {
            details = 'Sold Inițial - Credit'
          } else {
            details = 'Sold Inițial - Debit'
          }
        }

        return {
          date: new Date(entry.date).toISOString(),
          documentNumber: entry.documentNumber,
          details: details, // Textul calculat mai sus
          debit: entry.debit,
          credit: entry.credit,
          balance: entry.runningBalance,
          dueDate: entry.dueDate
            ? new Date(entry.dueDate).toISOString()
            : undefined,
        }
      }),
    },

    items: [],
    totals: {
      subtotal: 0,
      vatTotal: 0,
      grandTotal: finalBalance,
      currency: 'RON',
    },
  }
}
