import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

export const SUPPLIER_ORDER_STATUSES = [
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'SCHEDULED',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const

export type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number]

type BadgeVariant = VariantProps<typeof badgeVariants>['variant']

export const SUPPLIER_ORDER_STATUS_DETAILS: Record<
  SupplierOrderStatus,
  {
    label: string
    variant: BadgeVariant
  }
> = {
  DRAFT: { label: 'Ciornă', variant: 'secondary' },
  SENT: { label: 'Trimisă', variant: 'outline' },
  CONFIRMED: { label: 'Confirmată', variant: 'default' },
  SCHEDULED: { label: 'Livrare Programată', variant: 'info' },
  PARTIALLY_DELIVERED: { label: 'Livrată Parțial', variant: 'warning' },
  DELIVERED: { label: 'Livrată Integral', variant: 'success' },
  COMPLETED: { label: 'Finalizată', variant: 'success' },
  CANCELLED: { label: 'Anulată', variant: 'destructive' },
}

export const getProgressColor = (value: number): string => {
  // 1. COMPLET (Albastru - Info style)
  if (value === 100) return '[&>*]:bg-sky-400'
  // 2. FOARTE BINE (Verde smarald)
  if (value >= 90) return '[&>*]:bg-emerald-600'
  if (value >= 80) return '[&>*]:bg-green-500'
  // 3. BINE / SPRE FINAL (Verde deschis / Lime)
  if (value >= 70) return '[&>*]:bg-lime-300'
  if (value >= 60) return '[&>*]:bg-lime-100'
  // 4. MEDIU (Galben / Chihlimbar)
  if (value >= 50) return '[&>*]:bg-yellow-500'
  if (value >= 40) return '[&>*]:bg-amber-500'
  // 5. ÎNCEPUT / ATENȚIE (Portocaliu / Roșu)
  if (value >= 30) return '[&>*]:bg-orange-500'
  if (value >= 20) return '[&>*]:bg-orange-600'
  if (value >= 10) return '[&>*]:bg-red-600'
  // 6. CRITIC (Roșu închis)
  return '[&>*]:bg-red-700'
}

export const getTextColor = (val: number) => {
  if (val === 100) return 'text-sky-400'
  if (val >= 90) return 'text-emerald-600'
  if (val >= 80) return 'text-green-500'
  if (val >= 70) return 'text-lime-300'
  if (val >= 60) return 'text-lime-100'
  if (val >= 50) return 'text-yellow-500'
  if (val >= 40) return 'text-amber-600'
  if (val >= 30) return 'text-orange-500'
  if (val >= 20) return 'text-orange-600'
  if (val >= 10) return 'text-red-600'
  return 'text-red-600'
}

export const TRANSPORT_TYPE_LABELS = {
  INTERN: 'Transport Intern (Flotă Proprie)',
  EXTERN_FURNIZOR: 'Transport Asigurat de Furnizor',
  TERT: 'Transport Terț / Curier',
} as const
