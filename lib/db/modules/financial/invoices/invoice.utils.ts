export function getProfitColorClass(profit: number): string {
  if (profit > 0) return 'text-green-500'
  if (profit < 0) return 'text-red-500'
  return 'text-muted-foreground' // Pentru profit 0
}

/**
 * Returnează clasa de culoare pentru o marjă procentuală.
 * Praguri: >= 20% (bun), >= 5% (mediu), < 5% (slab/pierdere)
 */
export function getMarginColorClass(margin: number): string {
  if (margin >= 20) return 'text-green-500'
  if (margin >= 10) return 'text-yellow-500'
  if (margin >= 5) return 'text-orange-500'
  if (margin < 5 && margin > 0) return 'text-red-400'
  if (margin <= 0) return 'text-red-700'
  return 'text-muted-foreground' // Pentru marjă 0
}
