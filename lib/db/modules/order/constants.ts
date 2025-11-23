import { OrderStatusKey } from './types'
import { type VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

export const DELIVERY_METHODS = [
  {
    key: 'DIRECT_SALE',
    label: 'Vânzare Directă',
    requiresVehicle: true, // Necesită selecție vehicul
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
    requiresVehicle: false,
  },
] as const

export type DeliveryMethodKey = (typeof DELIVERY_METHODS)[number]['key']

export const ALLOWED_VEHICLES_FOR_METHOD: Record<string, string[] | 'ALL'> = {
  // Pentru vânzare directă / TIR Complet -> 'Cap Tractor - Tir'
  DIRECT_SALE: ['Cap Tractor - Tir'],

  DELIVERY_FULL_TRUCK: ['Cap Tractor - Tir'],

  // Macaralele mari
  DELIVERY_CRANE: ['Camion cu Macara 22t', 'Camion cu Macara 22t cu Remorca'],

  // Vehicule mici și macarale mici
  DELIVERY_SMALL_VEHICLE_PJ: [
    'Autoturism',
    'Autoutilitara cu Prelata',
    'Camion cu Macara 7t',
    'Camion cu Macara 13t',
  ],

  // Toate (inclusiv Curier, etc.)
  RETAIL_SALE_PF: 'ALL',

  // Niciun vehicul
  PICK_UP_SALE: [],
}

export const ORDER_STATUS_MAP: Record<
  OrderStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  DRAFT: { name: 'Ciornă', variant: 'secondary' },
  CONFIRMED: { name: 'Confirmată', variant: 'default' },
  SCHEDULED: { name: 'Livrare Programată', variant: 'default' },
  PARTIALLY_DELIVERED: { name: 'Livrată Parțial', variant: 'warning' },
  DELIVERED: { name: 'Livrată Integral', variant: 'success' },
  PARTIALLY_INVOICED: { name: 'Facturată Parțial', variant: 'info' },
  INVOICED: { name: 'Facturată', variant: 'info' },
  COMPLETED: { name: 'Finalizată', variant: 'success' },
  CANCELLED: { name: 'Anulată', variant: 'destructive' },
}
