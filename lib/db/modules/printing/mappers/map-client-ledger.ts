import { PdfDocumentData, PdfEntity } from '../printing.types'

export const mapClientLedgerToPdfData = (
  clientData: any,
  settingData: any,
  entries: any[],
  summary: any,
): PdfDocumentData => {
  // --- 1. CALCUL TOTALURI ---
  const totalDebit = entries.reduce((acc, curr) => acc + (curr.debit || 0), 0)
  const totalCredit = entries.reduce(
    (acc, curr) => acc + (Math.abs(curr.credit) || 0),
    0,
  )
  const finalBalance =
    entries.length > 0 ? entries[entries.length - 1].runningBalance : 0

  // --- 2. MAPARE FURNIZOR (Din Settings) ---
  const defaultBank =
    settingData.bankAccounts?.find((b: any) => b.isDefault) ||
    settingData.bankAccounts?.[0]
  const defaultEmail =
    settingData.emails?.find((e: any) => e.isDefault) || settingData.emails?.[0]
  const defaultPhone =
    settingData.phones?.find((p: any) => p.isDefault) || settingData.phones?.[0]

  const supplier: PdfEntity = {
    name: settingData.name,
    cui: settingData.cui,
    regCom: settingData.regCom,
    address: {
      strada: settingData.address?.strada || '',
      numar: settingData.address?.numar || '',
      localitate: settingData.address?.localitate || '',
      judet: settingData.address?.judet || '',
      tara: settingData.address?.tara || 'RO',
      alteDetalii: settingData.address?.alteDetalii || '',
    },
    bank: defaultBank?.bankName,
    iban: defaultBank?.iban,
    email: defaultEmail?.address,
    phone: defaultPhone?.number,
  }

  // --- 3. MAPARE CLIENT (Conform ClientModel) ---
  // Adresa clientului
  const clientAddrSource = clientData.address || {}
  const clientAddress = {
    strada: clientAddrSource.strada || '',
    numar: clientAddrSource.numar || '',
    localitate: clientAddrSource.localitate || '',
    judet: clientAddrSource.judet || '',
    tara: clientAddrSource.tara || 'RO',
    alteDetalii: clientAddrSource.alteDetalii || '',
  }

  const client: PdfEntity = {
    name: clientData.name,
    // Folosim vatId (PJ) sau cnp (PF)
    cui: clientData.vatId || clientData.cnp || '',
    // Folosim nrRegComert
    regCom: clientData.nrRegComert || '',
    address: clientAddress,
    // Accesăm obiectul bankAccountLei
    bank: clientData.bankAccountLei?.bankName || '',
    iban: clientData.bankAccountLei?.iban || '',
    email: clientData.email,
    phone: clientData.phone,
    contactPerson: clientAddrSource.persoanaContact,
  }

  return {
    type: 'CLIENT_LEDGER',
    series: '', // Lăsăm gol pentru a nu afișa în header
    number: '', // Lăsăm gol
    date: new Date().toISOString(),

    supplier,
    client,

    ledgerData: {
      summary: {
        initialBalance: 0,
        totalDebit,
        totalCredit,
        finalBalance,
      },
      entries: entries.map((entry) => {
        let details = entry.details
        if (entry.documentNumber && entry.documentNumber.startsWith('INIT-C')) {
          // La CLIENT e invers față de furnizor:
          // Debit > 0  => Clientul are de dat bani (Sold Initial - Debit)
          // Credit > 0 => Clientul a dat avans (Sold Initial - Credit)
          if (Number(entry.debit) > 0) {
            details = 'Sold Inițial - Debit'
          } else {
            details = 'Sold Inițial - Credit'
          }
        }
        return {
          date: new Date(entry.date).toISOString(),
          documentNumber: entry.documentNumber,
          details: details, // Folosim textul calculat
          debit: entry.debit,
          credit: entry.credit,
          balance: entry.runningBalance,
          dueDate: entry.dueDate
            ? new Date(entry.dueDate).toISOString()
            : undefined,
        }
      }),
    },

    // Date obligatorii pentru interfață (nefolosite vizual aici)
    items: [],
    totals: {
      subtotal: 0,
      vatTotal: 0,
      grandTotal: finalBalance,
      currency: 'RON',
    },
  }
}
