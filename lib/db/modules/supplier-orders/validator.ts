import { z } from 'zod'
import { MongoId } from '@/lib/validator'
import { SUPPLIER_ORDER_STATUSES, PRODUCT_TYPES } from './constants'

export const SupplierOrderItemSchema = z.object({
  product: MongoId,
  productType: z.enum(PRODUCT_TYPES).default('ERPProduct'),
  quantityOrdered: z
    .number()
    .positive('Cantitatea comandată trebuie să fie pozitivă'),
  quantityReceived: z.number().min(0).default(0),
  pricePerUnit: z.number().nonnegative().optional().default(0),
})

export const SupplierOrderCreateSchema = z.object({
  series: z.string().default('CMD'),
  number: z.string().min(1, 'Numărul comenzii este obligatoriu'),
  supplier: MongoId,
  date: z.coerce.date().default(() => new Date()),
  expectedDate: z.coerce.date().optional(),
  status: z.enum(SUPPLIER_ORDER_STATUSES).default('DRAFT'),
  items: z
    .array(SupplierOrderItemSchema)
    .min(1, 'Comanda trebuie să conțină cel puțin un produs'),
})

export const SupplierOrderUpdateSchema =
  SupplierOrderCreateSchema.partial().extend({
    _id: MongoId,
  })
