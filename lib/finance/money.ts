import { round2 } from '../utils'

/** Adună valori rotunjind fiecare termen la 2 zecimale, 
apoi rotunjește rezultatul. */
export function sumToTwoDecimals(values: number[]): number {
  // Folosim round2 definit mai sus
  const partial = values.reduce((acc, v) => acc + round2(v || 0), 0)
  return round2(partial)
}

/** Convertește o sumă în RON. Dacă moneda e RON, doar rotunjește. */
export function convertAmountToRON(
  amount: number,
  currency: 'RON' | 'EUR' | 'USD',
  exchangeRateOnIssueDate?: number
): number {
  if (currency === 'RON') return round2(amount)
  if (!exchangeRateOnIssueDate || exchangeRateOnIssueDate <= 0) {
    throw new Error('Lipsește cursul valutar (exchangeRateOnIssueDate).')
  }
  return round2(amount * exchangeRateOnIssueDate)
}
