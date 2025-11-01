export function getStockMovementTypeForLocation(
  location: string
): 'VANZARE_DEPOZIT' | 'VANZARE_DIRECTA' {
  switch (location) {
    case 'DEPOZIT':
    case 'CUSTODIE_GNS':
      return 'VANZARE_DEPOZIT'
    case 'CUSTODIE_PENTRU_CLIENT':
    case 'LIVRARE_DIRECTA':
    case 'IN_TRANZIT':
    default:
      return 'VANZARE_DIRECTA'
  }
}
