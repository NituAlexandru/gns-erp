import { UNITS } from '@/lib/constants'
import { z } from 'zod'

const PackagingSupplierSchema = z.object({
  supplier: z.string().length(24),
  supplierProductCode: z.string().optional(),
  lastPurchasePrice: z.number().optional(),
  isMain: z.boolean().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const packagingZod = z.object({
  slug: z.string().nonempty(),
  name: z.string().nonempty(),
  description: z.string().optional(),
  suppliers: z.array(PackagingSupplierSchema).default([]),
  mainCategory: z.string().length(24).nullable().optional(),
  countInStock: z.number().min(0).optional(),
  images: z.array(z.string().url()).optional(),
  entryPrice: z.number().min(0).optional(),
  listPrice: z.number().min(0).optional(),
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
  packagingQuantity: z.number().min(1).optional(),
  packagingUnit: z.enum(UNITS, {
    errorMap: () => ({ message: 'Unitatea de măsură este obligatorie' }),
  }),
  productCode: z.string().nonempty(),
  isPublished: z.boolean().optional(),
  length: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
  volume: z.number().min(0),
  weight: z.number().min(0),
})

export const packagingUpdateZod = packagingZod.extend({
  _id: z.string().length(24, 'ID ambalaj invalid'),
})
