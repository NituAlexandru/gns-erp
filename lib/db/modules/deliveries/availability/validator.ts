import { z } from 'zod'
import { MongoId } from '@/lib/validator'
import { DELIVERY_SLOTS } from '../constants'

// ✅ FIX: Definim funcția aici, local.
// Aceasta rezolvă eroarea de TypeScript folosind "as readonly string[]"
const areSlotsConsecutive = (slots: string[]) => {
  if (slots.length <= 1) return true

  // 1. Convertim sloturile în indexuri numerice (0, 1, 2...)
  const indices = slots
    .map((slot) => (DELIVERY_SLOTS as readonly string[]).indexOf(slot))
    .sort((a, b) => a - b) // Sortăm numerele crescător

  // 2. Verificăm dacă există "găuri" matematice
  for (let i = 0; i < indices.length - 1; i++) {
    // Dacă diferența dintre indexul actual și următorul nu e 1, nu sunt consecutive
    if (indices[i + 1] !== indices[i] + 1) {
      return false
    }
  }
  return true
}

export const CreateBlockSchema = z.object({
  assignmentId: MongoId,
  date: z.date(),
  slots: z
    .array(z.enum(DELIVERY_SLOTS))
    .min(1, 'Selectează cel puțin un interval.')
    .refine(areSlotsConsecutive, {
      message:
        'Intervalele trebuie să fie consecutive. Pentru intervale separate, creează două notițe distincte.',
    }),
  type: z.enum(['ITP', 'SERVICE', 'CONCEDIU', 'ALTELE']),
  note: z.string().optional(),
})

export type CreateBlockInput = z.infer<typeof CreateBlockSchema>
