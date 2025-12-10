import { z } from 'zod'
import {
  INVENTORY_LOCATIONS,
  MANUAL_ADJUSTMENT_TYPES,
  STOCK_MOVEMENT_TYPES,
} from './constants'
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
  specificBatchId: z.string().optional(),
})

export const adjustStockSchema = z.object({
  inventoryItemId: z.string().min(1, 'ID-ul stocului este necesar'), 
  batchId: z.string().optional(),
  adjustmentType: z.enum(MANUAL_ADJUSTMENT_TYPES, {
    errorMap: () => ({ message: 'Tipul ajustării de stoc este invalid' }),
  }),
  quantity: z.coerce 
    .number()
    .positive('Cantitatea trebuie să fie pozitivă'),
  unitCost: z.coerce.number().nonnegative().optional(),
  reason: z.string().min(3, 'Motivul/Nota este obligatorie pentru ajustări'),
})

// Folosită când gestionarul apasă "Transferă" pe un lot
export const transferStockSchema = z.object({
  sourceInventoryItemId: z.string().min(1, 'Sursa este necesară'),
  batchId: z.string().min(1, 'Lotul este necesar'),
  targetLocation: z.enum(INVENTORY_LOCATIONS, {
    errorMap: () => ({ message: 'Locația de destinație este invalidă' }),
  }),
  quantity: z.coerce.number().positive('Cantitatea trebuie să fie pozitivă'),
})

export type InventoryItemAdjustInput = z.infer<typeof InventoryItemAdjustSchema>
export type StockMovementInput = z.infer<typeof StockMovementSchema>
export type AdjustStockInput = z.infer<typeof adjustStockSchema>
export type TransferStockInput = z.infer<typeof transferStockSchema>
