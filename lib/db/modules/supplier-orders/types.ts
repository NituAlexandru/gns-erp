import { z } from 'zod'
import {
  SupplierOrderCreateSchema,
  SupplierOrderUpdateSchema,
} from './validator'
import { ISupplierOrderDoc as ISupplierOrderDocModel } from './supplier-order.model'

// Tipuri pentru Input (Zod)
export type ISupplierOrderCreate = z.infer<typeof SupplierOrderCreateSchema>
export type ISupplierOrderUpdate = z.infer<typeof SupplierOrderUpdateSchema>

// Tipul documentului din DB (importat din model pentru a evita duplicarea)
export type ISupplierOrderDoc = ISupplierOrderDocModel

// Tip populat pentru UI (ex: tabel comenzi)
export interface PopulatedSupplierOrder {
  _id: string
  series: string
  number: string
  supplier: {
    _id: string
    name: string
    email?: string
  }
  date: string | Date
  expectedDate?: string | Date
  status: string
  items: {
    product: {
      _id: string
      name: string
      productCode?: string
      unit?: string
    }
    productType: 'ERPProduct' | 'Packaging'
    quantityOrdered: number
    quantityReceived: number
    pricePerUnit: number
  }[]
  createdAt: string | Date
  updatedAt: string | Date
}
