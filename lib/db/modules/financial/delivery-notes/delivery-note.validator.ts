import { z } from 'zod'
import {
  DELIVERY_NOTE_STATUSES,
  E_TRANSPORT_STATUSES,
} from './delivery-note.constants'
import { MongoId } from '@/lib/validator' 

// -------------------------------------------------------------
// Subschemas
// -------------------------------------------------------------

export const DeliveryNoteLineSchema = z.object({
  orderLineItemId: MongoId.optional(),
  productId: MongoId.optional(),
  serviceId: MongoId.optional(),
  stockableItemType: z.enum(['ERPProduct', 'Packaging']).optional(),
  isManualEntry: z.boolean(),
  isPerDelivery: z.boolean().optional(),
  productName: z.string().min(1),
  productCode: z.string().min(1),
  quantity: z.number().positive(),
  unitOfMeasure: z.string().min(1),
  unitOfMeasureCode: z.string().optional(),
  priceAtTimeOfOrder: z.number().nonnegative(),
  minimumSalePrice: z.number().optional(),
  lineValue: z.number().nonnegative(),
  lineVatValue: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
  vatRateDetails: z.object({
    rate: z.number().nonnegative(),
    value: z.number().nonnegative(),
  }),
  baseUnit: z.string().optional(),
  conversionFactor: z.number().optional(),
  quantityInBaseUnit: z.number().optional(),
  priceInBaseUnit: z.number().optional(),
  packagingOptions: z
    .array(
      z.object({
        unitName: z.string(),
        baseUnitEquivalent: z.number().positive(),
      })
    )
    .default([]),
})

export const DeliveryNoteTotalsSchema = z.object({
  productsSubtotal: z.number().nonnegative(),
  productsVat: z.number().nonnegative(),
  servicesSubtotal: z.number().nonnegative(),
  servicesVat: z.number().nonnegative(),
  manualSubtotal: z.number().nonnegative(),
  manualVat: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  vatTotal: z.number().nonnegative(),
  grandTotal: z.number().nonnegative(),
})

// -------------------------------------------------------------
// Main Schemas
// -------------------------------------------------------------

export const CreateDeliveryNoteSchema = z.object({
  deliveryId: MongoId,
  orderId: MongoId,
  clientId: MongoId,
  createdBy: MongoId,
  createdByName: z.string().min(1),
  seriesName: z.string().min(1).max(10),
  items: z
    .array(DeliveryNoteLineSchema)
    .min(1, 'Cel puțin un produs este necesar.'),
  totals: DeliveryNoteTotalsSchema,
})

export const UpdateDeliveryNoteStatusSchema = z.object({
  deliveryNoteId: MongoId,
  status: z.enum(DELIVERY_NOTE_STATUSES),
  updatedBy: MongoId,
  updatedByName: z.string().min(1),
})

export const ETransportSchema = z.object({
  eTransportStatus: z.enum(E_TRANSPORT_STATUSES),
  eTransportCode: z.string().optional(),
  vehicleRegistration: z.string().optional(),
  transportCompany: z.string().optional(),
})

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

export type DeliveryNoteLineInput = z.infer<typeof DeliveryNoteLineSchema>
export type DeliveryNoteTotalsInput = z.infer<typeof DeliveryNoteTotalsSchema>
export type CreateDeliveryNoteInput = z.infer<typeof CreateDeliveryNoteSchema>
export type UpdateDeliveryNoteStatusInput = z.infer<
  typeof UpdateDeliveryNoteStatusSchema
>
export type ETransportInput = z.infer<typeof ETransportSchema>
