import { z } from 'zod'
import { UNITS } from './constants'
import { formatNumberWithDecimal } from './utils'

// Common
const MongoId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: 'ID MongoDB invalid' })

const Price = (field: string) =>
  z.coerce
    .number()
    .refine(
      (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(value)),
      `${field} trebuie să aibă exact două zecimale (ex: 49.99)`
    )

export const ReviewInputSchema = z.object({
  product: MongoId,
  user: MongoId,
  isVerifiedPurchase: z.boolean(),
  title: z.string().min(5, 'Titlul trebuie să aibă cel puțin 5 caractere'),
  comment: z
    .string()
    .min(10, 'Comentariul trebuie să aibă cel puțin 10 caractere'),
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Rating-ul trebuie să fie minim 1')
    .max(5, 'Rating-ul trebuie să fie maxim 5'),
})

export const ProductInputSchema = z.object({
  name: z.string().min(3, 'Numele trebuie să aibă cel puțin 3 caractere'),
  slug: z.string().min(3, 'Slug-ul trebuie să aibă cel puțin 3 caractere'),
  category: z.string().min(1, 'Categoria este obligatorie'),
  mainCategory: z.string().min(1, 'Categoria principală este obligatorie'),
  productCode: z.string().min(1, 'Codul de produs este obligatoriu'),
  unit: z.enum(UNITS, {
    errorMap: () => ({ message: 'Unitatea de măsură este obligatorie' }),
  }),
  packagingUnit: z.enum(UNITS, {
    errorMap: () => ({ message: 'Unitatea de ambalare este obligatorie' }),
  }),
  packagingQuantity: z.coerce
    .number({
      invalid_type_error: 'Ambalaj / Cantitate trebuie să fie un număr',
    })
    .positive('Trebuie să fie un număr pozitiv')
    .refine((v) => Number.isInteger(v * 1000), {
      message: 'Maxim 3 zecimale permise',
    }),
  length: z.coerce.number().positive('Lungimea trebuie să fie > 0'),
  width: z.coerce.number().positive('Lățimea trebuie să fie > 0'),
  height: z.coerce.number().positive('Înălțimea trebuie să fie > 0'),
  volume: z.coerce
    .number()
    .positive('Volumul trebuie să fie > 0')
    .describe('Calculat ca (L×W×H)/1e6, in m³'),
  weight: z.coerce.number().positive('Greutatea trebuie să fie > 0'),
  entryPrice: Price('Prețul de intrare'),
  specifications: z.array(z.string()).default([]),
  images: z
    .array(z.string())
    .min(1, 'Produsul trebuie să aibă cel puțin o imagine'),
  brand: z.string().min(3, 'Marca este obligatorie'),
  description: z.string().min(20, 'Descrierea este obligatorie'),
  isPublished: z.boolean(),
  price: Price('Preț'),
  listPrice: Price('Preț de listă'),
  countInStock: z.coerce
    .number()
    .int()
    .nonnegative('Stocul trebuie să fie un număr pozitiv'),
  tags: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  avgRating: z.coerce
    .number()
    .min(0, 'Rating-ul mediu trebuie să fie minim 0')
    .max(5, 'Rating-ul mediu trebuie să fie maxim 5'),
  numReviews: z.coerce
    .number()
    .int()
    .nonnegative('Numărul de recenzii trebuie să fie un număr pozitiv'),
  ratingDistribution: z
    .array(z.object({ rating: z.number(), count: z.number() }))
    .max(5),
  reviews: z.array(ReviewInputSchema).default([]),
  numSales: z.coerce
    .number()
    .int()
    .nonnegative('Numărul de vânzări trebuie să fie un număr pozitiv'),
  itemsPerPallet: z.coerce
    .number()
    .int()
    .positive(
      'Cantitatea de articole pe palet trebuie să fie un număr întreg pozitiv'
    ),
  palletTypeId: z.string().optional(),
})
