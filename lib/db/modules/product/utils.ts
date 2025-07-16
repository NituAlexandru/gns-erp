export function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// tipul pentru procente
export type Markups = {
  markupDirectDeliveryPrice: number
  markupFullTruckPrice: number
  markupSmallDeliveryBusinessPrice: number
  markupRetailPrice: number
}

// helper central pentru toate calculurile de preț de vânzare
export function computeSalePrices(base: number, markups?: Markups) {
  // default all % to 0 if markups is undefined or any value is missing
  const {
    markupDirectDeliveryPrice = 0,
    markupFullTruckPrice = 0,
    markupSmallDeliveryBusinessPrice = 0,
    markupRetailPrice = 0,
  } = markups || {}

  return {
    directPrice: base * (1 + markupDirectDeliveryPrice / 100),
    fullTruckPrice: base * (1 + markupFullTruckPrice / 100),
    smallBizPrice: base * (1 + markupSmallDeliveryBusinessPrice / 100),
    retailPrice: base * (1 + markupRetailPrice / 100),
  }
}
