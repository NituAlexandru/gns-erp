export const DELIVERY_METHODS = [
  {
    key: 'DIRECT_SALE',
    label: 'Vânzare Directă',
    requiresVehicle: false, // Nu necesită selecție vehicul
  },
  {
    key: 'DELIVERY_FULL_TRUCK',
    label: 'Livrare Depozit (TIR Complet)',
    requiresVehicle: true, // Necesită selecție vehicul
  },
  {
    key: 'DELIVERY_CRANE',
    label: 'Livrare Depozit (Macara)',
    requiresVehicle: true, // Necesită selecție vehicul
  },
  {
    key: 'DELIVERY_SMALL_VEHICLE_PJ',
    label: 'Livrare Depozit (Vehicul Mic PJ)',
    requiresVehicle: true, // Necesită selecție vehicul
  },
  {
    key: 'RETAIL_SALE_PF',
    label: 'Vânzare Retail (PF)',
    requiresVehicle: true, // Poate necesita un vehicul mic
  },
  {
    key: 'PICK_UP_SALE',
    label: 'Ridicare Comanda de Client',
    requiresVehicle: false, // Nu necesită selecție vehicul
  },
] as const

export type DeliveryMethodKey = (typeof DELIVERY_METHODS)[number]['key']
