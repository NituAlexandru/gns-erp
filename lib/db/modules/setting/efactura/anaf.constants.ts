import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

// STATUSURI PROCESARE MESAJE (INBOX) ---
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

//  TIPURI DE LOGURI ---
export const ANAF_LOG_TYPES = ['INFO', 'SUCCESS', 'ERROR', 'WARNING'] as const
export type AnafLogType = (typeof ANAF_LOG_TYPES)[number]

export const ANAF_LOG_TYPE_MAP: Record<AnafLogType, string> = {
  INFO: 'Info',
  SUCCESS: 'Succes',
  ERROR: 'Eroare',
  WARNING: 'Avertisment',
}

export const PAYMENT_METHODS_MAP: Record<string, string> = {
  '10': 'Numerar',
  '31': 'Ordin de Plată',
  '42': 'Cont Bancar',
  '48': 'Card Bancar',
  '49': 'Direct Debit',
  '20': 'Cec',
  '1': 'Instrument nedefinit',
  '97': 'Compensare',
}

export const getPaymentMethodName = (code?: string) => {
  if (!code) return ''
  return PAYMENT_METHODS_MAP[code] || `Cod ${code}`
}
