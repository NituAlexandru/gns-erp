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

// --- 2. TIPURI DE LOGURI ---
export const ANAF_LOG_TYPES = ['INFO', 'SUCCESS', 'ERROR', 'WARNING'] as const
export type AnafLogType = (typeof ANAF_LOG_TYPES)[number]

export const ANAF_LOG_TYPE_MAP: Record<AnafLogType, string> = {
  INFO: 'Info',
  SUCCESS: 'Succes',
  ERROR: 'Eroare',
  WARNING: 'Avertisment',
}

// --- 3. MAPARE UNITĂȚI DE MĂSURĂ (Reverse Mapping: Cod ANAF -> Intern) ---
// Folosim codurile standard pe care mi le-ai dat anterior
export const EFACTURA_TO_INTERNAL_UOM_MAP: Record<string, string> = {
  H87: 'bucata',
  KGM: 'kg',
  LTR: 'litru',
  MTK: 'm2',
  MTQ: 'm3',
  MLT: 'ml',
  PX: 'palet',
  SET: 'set',
  BX: 'cutie',
  CS: 'bax',
  RO: 'rola',
  BG: 'sac', // sau punga, trebuie decis una. Mapăm pe 'sac' momentan
  BE: 'balot',
  CL: 'colac',
}
