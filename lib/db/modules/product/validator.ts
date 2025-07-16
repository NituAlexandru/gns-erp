import { UNITS } from '@/lib/constants'
import { z } from 'zod'

export const ProductInputSchema = z.object({
  price: z.coerce.number().positive('Prețul trebuie să fie > 0'),
  name: z.string().min(3, 'Numele trebuie să aibă cel puțin 3 caractere'),
  slug: z.string().min(3, 'Slug-ul trebuie să aibă cel puțin 3 caractere'),
  category: z.string().regex(/^[0-9a-fA-F]{24}$/, {
    message: 'Categoria trebuie să fie un ObjectID valid',
  }),
  mainCategory: z.string().regex(/^[0-9a-fA-F]{24}$/, {
    message: 'Categoria principală trebuie să fie un ObjectID valid',
  }),
  barCode: z.string().optional(),
  productCode: z.string().min(1, 'Codul de produs este obligatoriu'),
  images: z
    .array(z.string())
    .min(1, 'Produsul trebuie să aibă cel puțin o imagine'),
  description: z.string().min(20, 'Descrierea este obligatorie'),
  specifications: z.array(z.string()).default([]),
  mainSupplier: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, { message: 'ID furnizor invalid' })
    .optional(),
  brand: z.string().optional(),

  unit: z.enum(UNITS, {
    errorMap: () => ({ message: 'Unitatea de măsură este obligatorie' }),
  }),
  packagingUnit: z
    .enum(UNITS, {
      errorMap: () => ({ message: 'Unitatea de ambalare este obligatorie' }),
    })
    .optional(),
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
  // Stocuri
  minStock: z.coerce.number().int().nonnegative().optional().default(0),
  countInStock: z.coerce.number().int().nonnegative().optional().default(0),
  // Date comenzi
  firstOrderDate: z.coerce.date().optional(),
  lastOrderDate: z.coerce.date().optional(),
  // Vânzări și preț mediu
  numSales: z.coerce.number().int().nonnegative().optional().default(0),
  averagePurchasePrice: z.coerce.number().nonnegative().optional().default(0),
  // Markup-uri
  defaultMarkups: z
    .object({
      markupDirectDeliveryPrice: z.coerce.number().optional().default(0),
      markupFullTruckPrice: z.coerce.number().optional().default(0),
      markupSmallDeliveryBusinessPrice: z.coerce.number().optional().default(0),
      markupRetailPrice: z.coerce.number().optional().default(0),
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
  // Paletizare și active
  palletTypeId: z.string().optional(),
  itemsPerPallet: z.coerce.number().int().positive().optional().default(1),
  isPublished: z.boolean().optional().default(true),
})

export const ProductUpdateSchema = ProductInputSchema.extend({
  _id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID produs invalid'),
})
