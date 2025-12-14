import { z } from 'zod'
import { MongoId } from '@/lib/validator'
import { SUPPLIER_ORDER_STATUSES } from './supplier-order.constants'
import { INVENTORY_LOCATIONS } from '../inventory/constants'
import { TertiaryTransporterSchema } from '../reception/validator'

export const OrderTransportSchema = z.object({
  transportType: z.enum(['INTERN', 'EXTERN_FURNIZOR', 'TERT']),
  transportCost: z.number().nonnegative().default(0),
  tertiaryTransporterDetails: TertiaryTransporterSchema.optional(),
  driverName: z.string().optional(),
  carNumber: z.string().optional(),
  notes: z.string().optional(),
  estimatedTransportCount: z.number().int().min(1).default(1), // Minim 1 cursă
  totalTransportCost: z.number().nonnegative().default(0),
  transportVatRate: z.number().nonnegative().default(0),
  transportVatValue: z.number().nonnegative().default(0),
  transportTotalWithVat: z.number().nonnegative().default(0),
  distanceInKm: z.number().nonnegative().optional(),
  travelTimeInMinutes: z.number().nonnegative().optional(),
})

export const SupplierOrderItemSchema = z.object({
  _id: z.string().optional(),
  product: MongoId,
  productName: z.string().min(1, 'Numele produsului este obligatoriu'),
  productCode: z.string().optional(),
  quantityOrdered: z
    .number()
    .positive('Cantitatea comandată trebuie să fie pozitivă'),
  quantityReceived: z.number().nonnegative().default(0),
  unitMeasure: z.string().min(1),
  pricePerUnit: z.number().nonnegative(),
  originalQuantity: z.number().positive().optional(),
  originalUnitMeasure: z.string().min(1).optional(),
  originalPricePerUnit: z.number().nonnegative().optional(),
  vatRate: z.number().nonnegative().default(0),
  vatValuePerUnit: z.number().nonnegative().optional(),
  lineTotal: z.number().optional(),
})

export const SupplierOrderPackagingSchema = z.object({
  _id: z.string().optional(),
  packaging: MongoId,
  packagingName: z.string().min(1, 'Numele ambalajului este obligatoriu'),
  productCode: z.string().optional(),
  quantityOrdered: z
    .number()
    .positive('Cantitatea comandată trebuie să fie pozitivă'),
  quantityReceived: z.number().nonnegative().default(0),
  unitMeasure: z.string().min(1),
  pricePerUnit: z.number().nonnegative(),
  originalQuantity: z.number().positive().optional(),
  originalUnitMeasure: z.string().min(1).optional(),
  originalPricePerUnit: z.number().nonnegative().optional(),
  vatRate: z.number().nonnegative().default(0),
  vatValuePerUnit: z.number().nonnegative().optional(),
  lineTotal: z.number().optional(),
})

const LinkedReceptionSchema = z.object({
  receptionId: MongoId,
  receptionNumber: z.string(),
  receptionDate: z.coerce.date(),
  totalValue: z.number(),
})

// 1. DEFINIM BAZA
const BaseSupplierOrderSchema = z.object({
  supplier: MongoId,
  orderDate: z.coerce.date().default(() => new Date()),
  supplierOrderNumber: z.string().optional(),
  supplierOrderDate: z.coerce.date().optional(),
  destinationType: z.enum(['DEPOZIT', 'PROIECT']).default('DEPOZIT'),
  destinationLocation: z
    .enum(INVENTORY_LOCATIONS, {
      errorMap: () => ({ message: 'Locația selectată nu este validă.' }),
    })
    .default('DEPOZIT'),
  destinationId: MongoId.optional().nullable(),
  currency: z.enum(['RON', 'EUR', 'USD']).default('RON'),
  exchangeRate: z.number().positive().default(1),
  transportDetails: OrderTransportSchema.optional(),
  products: z.array(SupplierOrderItemSchema).default([]),
  packagingItems: z.array(SupplierOrderPackagingSchema).default([]),
  receptions: z.array(LinkedReceptionSchema).default([]),
  notes: z.string().optional(),
  status: z.enum(SUPPLIER_ORDER_STATUSES).default('DRAFT'),
})

// 2. DEFINIM CREATE SCHEMA (Aplicăm .refine aici)
export const SupplierOrderCreateSchema = BaseSupplierOrderSchema.refine(
  (data) => data.products.length > 0 || data.packagingItems.length > 0,
  {
    message: 'Comanda trebuie să conțină cel puțin un produs sau un ambalaj.',
  }
)

// 3. DEFINIM UPDATE SCHEMA (Folosim BAZA pentru .partial)
export const SupplierOrderUpdateSchema =
  BaseSupplierOrderSchema.partial().extend({
    _id: MongoId,
    status: z.enum(SUPPLIER_ORDER_STATUSES).optional(),
  })

export type SupplierOrderCreateInput = z.infer<typeof SupplierOrderCreateSchema>
export type SupplierOrderUpdateInput = z.infer<typeof SupplierOrderUpdateSchema>
