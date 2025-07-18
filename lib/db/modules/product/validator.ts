import { UNITS } from '@/lib/constants'
import { z } from 'zod'

export const ProductInputSchema = z
  .object({
    name: z.string().min(3, 'Numele trebuie să aibă cel puțin 3 caractere'),
    slug: z.string().min(3, 'Slug-ul trebuie să aibă cel puțin 3 caractere'),
    category: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Categoria trebuie să fie un ObjectID valid'),
    mainCategory: z
      .string()
      .regex(
        /^[0-9a-fA-F]{24}$/,
        'Categoria principală trebuie să fie un ObjectID valid'
      ),
    barCode: z.string().optional(),
    productCode: z.string().min(1, 'Codul de produs este obligatoriu'),
    images: z
      .array(z.string())
      .min(1, 'Produsul trebuie să aibă cel puțin o imagine'),
    description: z.string().min(20, 'Descrierea este obligatorie'),
    mainSupplier: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'ID furnizor invalid')
      .optional(),
    brand: z.string().optional(),

    // stocuri și costuri
    minStock: z.coerce.number().int().nonnegative().default(0),
    countInStock: z.coerce.number().int().nonnegative().default(0),
    firstOrderDate: z.coerce.date().optional(),
    lastOrderDate: z.coerce.date().optional(),
    numSales: z.coerce.number().int().nonnegative().default(0),
    averagePurchasePrice: z.coerce.number().nonnegative().default(0),

    // marje comerciale
    defaultMarkups: z
      .object({
        markupDirectDeliveryPrice: z.coerce.number().nonnegative().default(0),
        markupFullTruckPrice: z.coerce.number().nonnegative().default(0),
        markupSmallDeliveryBusinessPrice: z.coerce
          .number()
          .nonnegative()
          .default(0),
        markupRetailPrice: z.coerce.number().nonnegative().default(0),
      })
      .optional()
      .default({}),

    clientMarkups: z
      .array(
        z.object({
          clientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID client invalid'),
          markups: z.object({
            markupDirectDeliveryPrice: z.coerce.number().optional(),
            markupFullTruckPrice: z.coerce.number().optional(),
            markupSmallDeliveryBusinessPrice: z.coerce.number().optional(),
          }),
        })
      )
      .optional()
      .default([]),

    // ambalare
    unit: z.enum(UNITS, {
      errorMap: () => ({ message: 'Unitatea de măsură este obligatorie' }),
    }),
    packagingUnit: z.enum(UNITS).optional(),
    packagingQuantity: z.coerce
      .number({
        invalid_type_error: 'Ambalaj / Cantitate trebuie să fie un număr',
      })
      .positive('Trebuie să fie un număr pozitiv')
      .refine((v) => Number.isInteger(v * 1000), {
        message: 'Maxim 3 zecimale permise',
      })
      .optional(),

    length: z.coerce.number().positive('Lungimea trebuie să fie > 0'),
    width: z.coerce.number().positive('Lățimea trebuie să fie > 0'),
    height: z.coerce.number().positive('Înălțimea trebuie să fie > 0'),
    volume: z.coerce
      .number()
      .positive('Volumul trebuie să fie > 0')
      .describe('Calculat ca (L×W×H)/1e6, in m³'),
    weight: z.coerce.number().positive('Greutatea trebuie să fie > 0'),

    specifications: z.array(z.string()).default([]),

    palletTypeId: z.string().optional(),
    itemsPerPallet: z.coerce.number().int().positive().default(1),

    isPublished: z.boolean().default(true),
  })
  .strict()

export const ProductUpdateSchema = ProductInputSchema.extend({
  _id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID produs invalid'),
})
