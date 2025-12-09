import { MongoId } from '@/lib/validator'
import z from 'zod'
import { InventoryLocationSchema } from './validator'

// --- Schema pentru Calitate (Refolosită) ---
const QualityDetailsZod = z
  .object({
    lotNumbers: z.array(z.string()).optional(),
    certificateNumbers: z.array(z.string()).optional(),
    testReports: z.array(z.string()).optional(),
    additionalNotes: z.string().optional(),
  })
  .optional()

// --- Schema pentru Archived Batch ---
export const ArchivedBatchSchema = z.object({
  originalItemId: MongoId, // Link către InventoryItem
  stockableItem: MongoId,
  stockableItemType: z.enum(['ERPProduct', 'Packaging']),
  location: InventoryLocationSchema, // Folosim schema existentă de locații
  quantityOriginal: z.number(),
  unitCost: z.number(),
  entryDate: z.coerce.date(),
  movementId: MongoId.optional(),
  supplierId: MongoId.optional(),
  qualityDetails: QualityDetailsZod,
  archivedAt: z.coerce.date().default(() => new Date()),
})
