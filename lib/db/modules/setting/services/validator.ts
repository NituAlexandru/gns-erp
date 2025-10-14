import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const ServiceInputSchema = z.object({
  name: z.string().min(3, 'Numele trebuie să aibă cel puțin 3 caractere.'),
  code: z.string().min(3, 'Codul trebuie să aibă cel puțin 3 caractere.'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Prețul trebuie să fie un număr pozitiv.'),
  cost: z.coerce.number().min(0, 'Costul trebuie să fie un număr pozitiv.'),
  category: z.enum(['Serviciu', 'Autorizatie'], {
    required_error: 'Categoria este obligatorie.',
  }),
  unitOfMeasure: z.string().min(1, 'Unitatea de măsură este obligatorie.'),
  vatRate: MongoId,
  isActive: z.boolean().optional(),
})
export const ServiceUpdateSchema = ServiceInputSchema.extend({
  _id: MongoId,
})
