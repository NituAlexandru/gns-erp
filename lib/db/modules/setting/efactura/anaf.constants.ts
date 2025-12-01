import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

// --- 1. STATUSURI PROCESARE MESAJE (INBOX) ---
export const ANAF_PROCESSING_STATUSES = [
  'UNPROCESSED',
  'COMPLETED',
  'ERROR_NO_SUPPLIER',
  'ERROR_OTHER',
] as const

export type AnafProcessingStatus = (typeof ANAF_PROCESSING_STATUSES)[number]

export const ANAF_PROCESSING_STATUS_MAP: Record<
  AnafProcessingStatus,
  { label: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  UNPROCESSED: { label: 'Neprocesat', variant: 'secondary' },
  COMPLETED: { label: 'Importat', variant: 'success' },
  ERROR_NO_SUPPLIER: {
    label: 'Eroare: Furnizor Lipsă',
    variant: 'destructive',
  },
  ERROR_OTHER: { label: 'Eroare Procesare', variant: 'destructive' },
}

// --- 2. TIPURI DE LOGURI (Refăcut cu variante de culori) ---
export const ANAF_LOG_TYPES = ['INFO', 'SUCCESS', 'ERROR', 'WARNING'] as const
export type AnafLogType = (typeof ANAF_LOG_TYPES)[number]

export const ANAF_LOG_TYPE_MAP: Record<
  AnafLogType,
  { label: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  INFO: { label: 'Info', variant: 'secondary' },
  SUCCESS: { label: 'Succes', variant: 'success' },
  ERROR: { label: 'Eroare', variant: 'destructive' },
  WARNING: { label: 'Avertisment', variant: 'warning' },
}

// --- 3. ACȚIUNI LOG ---
export const ANAF_ACTION_MAP: Record<string, string> = {
  SYNC: 'Sincronizare Reusită',
  SYNC_CRITICAL: 'Eroare Critică Sincronizare',
  REFRESH_TOKEN: 'Actualizare Token ANAF',
}

// --- 4. METODE DE PLATĂ (Existente) ---
export const PAYMENT_METHODS_MAP: Record<string, string> = {
  '10': 'Numerar',
  '31': 'Ordin de Plată',
  '42': 'Cont Bancar',
  '48': 'Card Bancar',
  '49': 'Direct Debit',
  '20': 'Cec',
  '1': 'Instrument nedefinit',
  '97': 'Compensare',
  ORDIN_DE_PLATA: 'Ordin de Plată',
  NUMERAR: 'Numerar',
  CARD: 'Card Bancar',
  CEC: 'Cec',
  COMPENSARE: 'Compensare',
  CONT_BANCAR: 'Cont Bancar',
}

export const getPaymentMethodName = (code?: string) => {
  if (!code) return ''
  return PAYMENT_METHODS_MAP[code] || `Cod ${code}`
}

// --- 5. CODURI TIP FACTURĂ (BT-3) ---
export const INVOICE_TYPE_CODE_MAP: Record<string, string> = {
  '380': 'Factură Comercială',
  '381': 'Factură Storno (Credit Note)',
  '384': 'Factură Corectată',
  '386': 'Factură de Avans',
  '389': 'Autofactură',
  '751': 'Factură (Info Contabil)',
}

export const getInvoiceTypeName = (code?: string) => {
  if (!code) return ''
  return INVOICE_TYPE_CODE_MAP[code] || `Cod ${code}`
}
