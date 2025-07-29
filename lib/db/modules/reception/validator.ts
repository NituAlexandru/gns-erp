// reception/validator.ts
import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const ReceptionProductSchema = z.object({
  product: MongoId,
  quantity: z.number().int().positive(),
  unitMeasure: z.string().min(1),
  priceAtReception: z.number().nonnegative().nullable().optional(),
})

export const ReceptionPackagingSchema = z.object({
  packaging: MongoId,
  quantity: z.number().int().positive(),
  unitMeasure: z.string().min(1),
  priceAtReception: z.number().nonnegative().nullable().optional(),
})

// Definim o schemă de bază fără .refine()
const BaseReceptionSchema = z.object({
  createdBy: MongoId,
  supplier: MongoId,
  products: z.array(ReceptionProductSchema).optional(),
  packagingItems: z.array(ReceptionPackagingSchema).optional(),
  receptionDate: z.date().default(() => new Date()),
  driverName: z.string().optional(),
  carNumber: z.string().optional(),
  // Placeholder-ele pentru Proiecte
  destinationType: z.enum(['DEPOZIT', 'PROIECT']).optional().default('DEPOZIT'),
  destinationId: MongoId.optional(),
})

// Acum aplicăm .refine() pentru a crea schema de creare
export const ReceptionCreateSchema = BaseReceptionSchema.refine(
  (data) => data.products?.length || data.packagingItems?.length,
  {
    message: 'Recepția trebuie să conțină cel puțin un produs sau ambalaj.',
  }
)
  // Adăugăm o validare condițională
  .refine(
    (data) => {
      if (data.destinationType === 'PROIECT') {
        return !!data.destinationId // Dacă e proiect, ID-ul trebuie să existe
      }
      return true // Altfel, e valid
    },
    {
      message:
        'ID-ul de Proiect este obligatoriu pentru destinația de tip PROIECT.',
      path: ['destinationId'], // Specificăm câmpul care a cauzat eroarea
    }
  )

export const ReceptionUpdateSchema = BaseReceptionSchema.extend({
  _id: MongoId,
  status: z.enum(['DRAFT', 'CONFIRMAT']).optional(),
})
