import { z } from 'zod'
import { INVENTORY_LOCATIONS, STOCK_MOVEMENT_TYPES } from './constants'

export const InventoryLocationSchema = z.enum(INVENTORY_LOCATIONS)

export const InventoryItemAdjustSchema = z.object({
  product: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  location: InventoryLocationSchema,
  quantityOnHandDelta: z.number(),
  quantityReservedDelta: z.number(),
})

export const StockMovementSchema = z.object({
  product: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ObjectId'),
  movementType: z.enum(STOCK_MOVEMENT_TYPES, {
    errorMap: () => ({ message: 'Unknown movement type' }),
  }),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .positive('Quantity must be > 0'),
  locationFrom: InventoryLocationSchema.optional(),
  locationTo: InventoryLocationSchema.optional(),
  referenceId: z.string().optional(),
  note: z.string().optional(),
  timestamp: z
    .date()
    .optional()
    .default(() => new Date()),
})

export type InventoryItemAdjustInput = z.infer<typeof InventoryItemAdjustSchema>
export type StockMovementInput = z.infer<typeof StockMovementSchema>
