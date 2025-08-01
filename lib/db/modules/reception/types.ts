import { z } from 'zod'
import {
  ReceptionCreateSchema,
  ReceptionPackagingSchema,
  ReceptionProductSchema,
  ReceptionUpdateSchema,
  DeliverySchema,
  InvoiceSchema,
} from './validator'

export type ReceptionProductInput = z.infer<typeof ReceptionProductSchema>
export type ReceptionCreateInput = z.infer<typeof ReceptionCreateSchema>
export type ReceptionUpdateInput = z.infer<typeof ReceptionUpdateSchema>

type PopulatedItem = {
  _id: string
  name: string
  unit?: string
}

export type PopulatedReceptionProduct = Omit<
  ReceptionProductInput,
  'product'
> & {
  product: PopulatedItem
}

export type PopulatedReceptionPackaging = Omit<
  z.infer<typeof ReceptionPackagingSchema>,
  'packaging'
> & {
  packaging: PopulatedItem
}

// Tipul final pentru o recepție complet populată
export type PopulatedReception = Omit<
  ReceptionUpdateInput,
  'products' | 'packagingItems' | 'supplier' | 'deliveries' | 'invoices'
> & {
  supplier?: PopulatedItem
  products?: PopulatedReceptionProduct[]
  createdBy: PopulatedItem
  createdAt: string
  packagingItems?: PopulatedReceptionPackaging[]
  deliveries?: z.infer<typeof DeliverySchema>[]
  invoices?: z.infer<typeof InvoiceSchema>[]
  amount: number
}
