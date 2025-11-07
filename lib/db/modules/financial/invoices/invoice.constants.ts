import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge' // Presupunem calea corectă

// --- Statusurile Principale ale Facturii ---
export const INVOICE_STATUSES = [
  'CREATED', // Creată de utilizator, așteaptă validare
  'APPROVED', // Verificată de admin, blocată, gata de trimitere e-Factura
  'REJECTED', // Respinsă de admin, deblocată pt editare
  'PAID', // Plătită
  'CANCELLED', // Anulată (ex: înainte de a fi trimisă)
] as const

export type InvoiceStatusKey = (typeof INVOICE_STATUSES)[number]

export const INVOICE_STATUS_MAP: Record<
  InvoiceStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  CREATED: { name: 'Creată', variant: 'default' },
  APPROVED: { name: 'Aprobată', variant: 'success' },
  REJECTED: { name: 'Respinsă-Necesita-Modificari', variant: 'destructive' },
  PAID: { name: 'Plătită', variant: 'success' },
  CANCELLED: { name: 'Anulată', variant: 'destructive' },
}

// --- Statusurile e-Factura ---
export const EFACTURA_STATUSES = [
  'NOT_REQUIRED', // Pt. clienți non-RO / persoane fizice
  'PENDING', // Aprobată, așteaptă trimiterea
  'SENT', // Trimisă la ANAF, așteaptă răspuns
  'ACCEPTED', // Confirmată de ANAF (cu ID de descărcare)
  'REJECTED_ANAF', // Respinsă de ANAF (cu eroare)
] as const

export type EFacturaStatusKey = (typeof EFACTURA_STATUSES)[number]

export const EFACTURA_STATUS_MAP: Record<
  EFacturaStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  NOT_REQUIRED: { name: 'Nu e necesară', variant: 'secondary' },
  PENDING: { name: 'Așteaptă Trimitere', variant: 'default' },
  SENT: { name: 'Trimisă (ANAF)', variant: 'info' },
  ACCEPTED: { name: 'Acceptată (ANAF)', variant: 'success' },
  REJECTED_ANAF: { name: 'Respinsă (ANAF)', variant: 'destructive' },
}

export const ADVANCE_SCOPES = ['GLOBAL', 'ADDRESS_SPECIFIC'] as const

export type AdvanceScopeKey = (typeof ADVANCE_SCOPES)[number]

export const ADVANCE_SCOPE_MAP: Record<
  AdvanceScopeKey,
  { name: string; description: string }
> = {
  GLOBAL: {
    name: 'Avans Pentru Toate Adresele',
    description:
      'Acest avans poate fi folosit pentru orice adresă a clientului.',
  },
  ADDRESS_SPECIFIC: {
    name: 'Avans Specific Unei Adrese',
    description: 'Acest avans poate fi folosit DOAR pentru adresa selectată.',
  },
}
