import { ReceiptAddress } from './receipt.types'

/**
 * Convertește un număr în text (limba română) pentru chitanțe.
 * Ex: 123.50 -> "o sută douăzeci și trei lei și cincizeci bani"
 */
export function numberToWordsRo(amount: number): string {
  if (amount === 0) return 'zero lei'

  const units = [
    '',
    'unu',
    'doi',
    'trei',
    'patru',
    'cinci',
    'șase',
    'șapte',
    'opt',
    'nouă',
  ]
  const unitsFem = [
    '',
    'una',
    'două',
    'trei',
    'patru',
    'cinci',
    'șase',
    'șapte',
    'opt',
    'nouă',
  ] // pt sute/mii
  const teens = [
    'zece',
    'unsprezece',
    'doisprezece',
    'treisprezece',
    'paisprezece',
    'cincisprezece',
    'șaisprezece',
    'șaptesprezece',
    'optsprezece',
    'nouăsprezece',
  ]
  const tens = [
    '',
    'zece',
    'douăzeci',
    'treizeci',
    'patruzeci',
    'cincizeci',
    'șaizeci',
    'șaptezeci',
    'optzeci',
    'nouăzeci',
  ]

  const getGroupText = (n: number, isFem = false): string => {
    if (n === 0) return ''
    if (n < 10) return isFem ? unitsFem[n] : units[n]
    if (n < 20) return teens[n - 10]
    if (n < 100) {
      const t = Math.floor(n / 10)
      const u = n % 10
      return `${tens[t]}${u > 0 ? ' și ' + (isFem ? unitsFem[u] : units[u]) : ''}`
    }
    // Sute
    const h = Math.floor(n / 100)
    const rest = n % 100
    const hText = h === 1 ? 'o sută' : `${h === 2 ? 'două' : unitsFem[h]} sute`
    const restText = rest > 0 ? ' ' + getGroupText(rest, isFem) : ''
    return hText + restText
  }

  // Separăm partea întreagă de zecimale
  const integerPart = Math.floor(amount)
  const decimalPart = Math.round((amount - integerPart) * 100)

  let words = ''

  // Miliarde, Milioane, Mii, Unități
  const billions = Math.floor(integerPart / 1000000000)
  const millions = Math.floor((integerPart % 1000000000) / 1000000)
  const thousands = Math.floor((integerPart % 1000000) / 1000)
  const rest = integerPart % 1000

  if (billions > 0) {
    words +=
      billions === 1
        ? 'un miliard '
        : getGroupText(billions, true) +
          (billions >= 20 ? ' de' : '') +
          ' miliarde '
  }
  if (millions > 0) {
    words +=
      millions === 1
        ? 'un milion '
        : getGroupText(millions, true) +
          (millions >= 20 ? ' de' : '') +
          ' milioane '
  }
  if (thousands > 0) {
    words +=
      thousands === 1
        ? 'o mie '
        : getGroupText(thousands, true) +
          (thousands >= 20 ? ' de' : '') +
          ' mii '
  }
  if (rest > 0) {
    words += getGroupText(rest, false) + ' '
  }

  if (integerPart === 0) words = 'zero '

  // Adăugăm "Lei"
  // Regula "de": dacă numărul se termină în intervalul 01-19 NU punem "de", altfel (20-99, 00) punem "de"
  // Simplificare: pentru marea majoritate a cazurilor de business:
  const lastTwo = integerPart % 100
  const needsDe = lastTwo >= 20 || (lastTwo === 0 && integerPart > 0)

  words += needsDe ? 'de lei' : 'lei'

  // Adăugăm Bani
  if (decimalPart > 0) {
    words += ` și ${getGroupText(decimalPart, false)} bani`
  }

  return words.trim()
}

export function formatAddress(addr?: ReceiptAddress): string {
  if (!addr) return ''

  // Construim string-ul din părți, ignorând ce e gol
  const parts = [
    addr.strada ? `Str. ${addr.strada}` : null,
    addr.numar ? `Nr. ${addr.numar}` : null,
    addr.localitate ? `Loc. ${addr.localitate}` : null,
    addr.judet ? `Jud. ${addr.judet}` : null,
  ]

  return parts.filter(Boolean).join(', ')
}
