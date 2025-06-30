import { z } from 'zod'
import { MongoId } from '@/lib/validator'

// Schema produsă de Zod pentru create/update
export const SupplierCreateSchema = z.object({
  name: z.string().min(1, 'Numele este obligatoriu'),
  contactName: z.string().optional(),
  email: z.string().email('Email invalid').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  fiscalCode: z.string().optional(),
  bankAccount: z.string().optional(),
  externalTransport: z.boolean().optional().default(false),
  transportCosts: z.number().nonnegative().optional().default(0),
  loadingAddress: z.string().optional(),
  productCatalog: z.array(MongoId).optional().default([]),
  supplierDriver: z.string().optional(),
  externalTransportCosts: z.number().nonnegative().optional().default(0),
  internalTransportCosts: z.number().nonnegative().optional().default(0),
})

export const SupplierUpdateSchema = SupplierCreateSchema.extend({
  _id: MongoId,
})
