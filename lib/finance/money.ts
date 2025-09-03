export function roundToTwoDecimals(value: number): number {
  const factor = 100
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** Adună valori rotunjind fiecare termen la 2 zecimale, 
apoi rotunjește rezultatul. */
export function sumToTwoDecimals(values: number[]): number {
  const partial = values.reduce((acc, v) => acc + roundToTwoDecimals(v || 0), 0)
  return roundToTwoDecimals(partial)
}

/** Convertește o sumă în RON. Dacă moneda e RON, doar rotunjește. */
export function convertAmountToRON(
  amount: number,
  currency: 'RON' | 'EUR' | 'USD',
  exchangeRateOnIssueDate?: number
): number {
  if (currency === 'RON') return roundToTwoDecimals(amount)
  if (!exchangeRateOnIssueDate || exchangeRateOnIssueDate <= 0) {
    throw new Error('Lipsește cursul valutar (exchangeRateOnIssueDate).')
  }
  return roundToTwoDecimals(amount * exchangeRateOnIssueDate)
}
