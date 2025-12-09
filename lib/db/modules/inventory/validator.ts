import { z } from 'zod'
import { INVENTORY_LOCATIONS, STOCK_MOVEMENT_TYPES } from './constants'
import { MongoId } from '@/lib/validator'

export const InventoryLocationSchema = z.enum(INVENTORY_LOCATIONS)
export const LocationOrProjectIdSchema = z.union([
  InventoryLocationSchema,
  MongoId,
])
export const InventoryItemAdjustSchema = z.object({
  stockableItem: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid item ID'),
  stockableItemType: z.enum(['ERPProduct', 'Packaging']),
  location: InventoryLocationSchema,
  quantityOnHandDelta: z.number(),
  quantityReservedDelta: z.number(),
})
const QualityDetailsZod = z
  .object({
    lotNumbers: z.array(z.string()).optional(),
    certificateNumbers: z.array(z.string()).optional(),
    testReports: z.array(z.string()).optional(),
    additionalNotes: z.string().optional(),
  })
  .optional()

export const StockMovementSchema = z.object({
  stockableItem: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid item ID'),
  stockableItemType: z.enum(['ERPProduct', 'Packaging']),
  movementType: z.enum(STOCK_MOVEMENT_TYPES, {
    errorMap: () => ({ message: 'Unknown movement type' }),
  }),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be > 0'),
  locationFrom: LocationOrProjectIdSchema.optional(),
  locationTo: LocationOrProjectIdSchema.optional(),
  referenceId: z.string(),
  note: z.string().optional(),
  unitCost: z.number().nonnegative().optional(),
  unitMeasure: z.string().optional(),
  responsibleUser: z.string().optional(),
  timestamp: z
    .date()
    .optional()
    .default(() => new Date()),
  supplierId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid supplier ID')
    .optional(),
  clientId: z.string().optional(),
  documentNumber: z.string().optional(),
  qualityDetails: QualityDetailsZod,
})

export type InventoryItemAdjustInput = z.infer<typeof InventoryItemAdjustSchema>
export type StockMovementInput = z.infer<typeof StockMovementSchema>
