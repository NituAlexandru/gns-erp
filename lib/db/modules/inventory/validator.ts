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
  stockableItemType: z.enum(['Product', 'Packaging']),
  location: InventoryLocationSchema,
  quantityOnHandDelta: z.number(),
  quantityReservedDelta: z.number(),
})

export const StockMovementSchema = z.object({
  stockableItem: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid item ID'),
  stockableItemType: z.enum(['Product', 'Packaging']),
  movementType: z.enum(STOCK_MOVEMENT_TYPES, {
    errorMap: () => ({ message: 'Unknown movement type' }),
  }),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .positive('Quantity must be > 0'),
  locationFrom: LocationOrProjectIdSchema.optional(),
  locationTo: LocationOrProjectIdSchema.optional(),
  referenceId: z.string().optional(),
  note: z.string().optional(),
  unitCost: z.number().nonnegative().optional(),
  timestamp: z
    .date()
    .optional()
    .default(() => new Date()),
})

export type InventoryItemAdjustInput = z.infer<typeof InventoryItemAdjustSchema>
export type StockMovementInput = z.infer<typeof StockMovementSchema>
