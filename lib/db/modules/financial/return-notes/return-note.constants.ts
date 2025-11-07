import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

export const RETURN_NOTE_STATUSES = ['DRAFT', 'COMPLETED', 'CANCELLED'] as const
export type ReturnNoteStatusKey = (typeof RETURN_NOTE_STATUSES)[number]

export const RETURN_NOTE_STATUS_MAP: Record<
  ReturnNoteStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  DRAFT: { name: 'Ciornă', variant: 'secondary' },
  COMPLETED: { name: 'Finalizată (Stoc Mișcat)', variant: 'success' },
  CANCELLED: { name: 'Anulată', variant: 'destructive' },
}

// Motivul pentru care se face acest retur
export const RETURN_NOTE_REASONS = [
  'STORNO_INVOICE', // Generat automat de o factură storno
  'DELIVERY_CORRECTION', // Corecție manuală (ex: aviz invers)
  'CLIENT_REFUSAL', // Clientul a refuzat marfa la livrare
  'WARRANTY', // Retur pe garanție
  'OTHER', // Alt motiv
] as const
export type ReturnNoteReasonKey = (typeof RETURN_NOTE_REASONS)[number]


export const RETURN_NOTE_REASON_MAP: Record<
  ReturnNoteReasonKey,
  { name: string }
> = {
  STORNO_INVOICE: { name: 'Stornare Factură' },
  DELIVERY_CORRECTION: { name: 'Corecție Aviz/Livrare' },
  CLIENT_REFUSAL: { name: 'Refuz Marfă Client' },
  WARRANTY: { name: 'Retur Garanție' },
  OTHER: { name: 'Alt Motiv' },
}

