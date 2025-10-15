import { OrderStatusKey } from './types'
import { type VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

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

export const ORDER_STATUS_MAP: Record<
  OrderStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  DRAFT: { name: 'Ciornă', variant: 'secondary' },
  CONFIRMED: { name: 'Confirmată', variant: 'default' },
  IN_DELIVERY: { name: 'În livrare', variant: 'warning' },
  PARTIALLY_DELIVERED: { name: 'Livrată Parțial', variant: 'warning' },
  DELIVERED: { name: 'Livrată Integral', variant: 'success' },
  INVOICED: { name: 'Facturată', variant: 'info' },
  COMPLETED: { name: 'Finalizată', variant: 'success' },
  CANCELLED: { name: 'Anulată', variant: 'destructive' },
}
