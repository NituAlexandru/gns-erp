interface DistributableItem {
  quantity: number
  invoicePricePerUnit?: number | null | undefined
}

/**
 * Distribuie un cost total de transport pe o listă de articole,
 * proporțional cu valoarea fiecărui articol.
 * @param items - Un array de produse sau ambalaje.
 * @param totalTransportCost - Costul total de transport de distribuit.
 * @returns Un nou array de articole, fiecare având o nouă proprietate `totalDistributedTransportCost`.
 */
export function distributeTransportCost<T extends DistributableItem>(
  items: T[],
  totalTransportCost: number
): (T & { totalDistributedTransportCost: number })[] {
  // 1. Calculăm valoarea totală a tuturor articolelor (baza de calcul).
  const totalItemsValue = items.reduce((sum, item) => {
    const price = item.invoicePricePerUnit ?? 0
    const quantity = item.quantity ?? 0
    return sum + price * quantity
  }, 0)

  // 2. Dacă nu există cost de transport sau valoare totală, returnăm articolele neschimbate.
  if (totalTransportCost === 0 || totalItemsValue === 0) {
    return items.map((item) => ({
      ...item,
      totalDistributedTransportCost: 0,
    }))
  }

  // 3. Iterăm prin fiecare articol și calculăm cota de transport.
  return items.map((item) => {
    const price = item.invoicePricePerUnit ?? 0
    const quantity = item.quantity ?? 0
    const itemValue = price * quantity

    // Calculăm ponderea valorii acestui articol în total.
    const valueWeight = itemValue / totalItemsValue

    // Alocăm costul de transport proporțional cu ponderea.
    const distributedCost = totalTransportCost * valueWeight

    return {
      ...item,
      totalDistributedTransportCost: distributedCost,
    }
  })
}
