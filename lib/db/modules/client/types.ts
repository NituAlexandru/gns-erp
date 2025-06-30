import { z } from 'zod'
import { ClientAddress, ClientCreateSchema, ClientUpdateSchema } from './validator'
import { Document } from 'mongoose'

// 1) raw payload shapes, inferred from your Zod schemas:
export type IClientCreate = z.infer<typeof ClientCreateSchema>
export type IClientUpdate = z.infer<typeof ClientUpdateSchema>

// 2) the full Mongoose document interface:
export interface IClientDoc extends Document, IClientInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
// types.ts

export interface IClientInput {
  clientType: 'persoana fizica' | 'persoana juridica'
  name: string
  cnp?: string
  cui?: string
  isVatPayer?: boolean
  vatId?: string
  nrRegComert?: string
  email?: string
  phone?: string
  addresses?: ClientAddress[]
  iban?: string
  totalOrders?: number
  totalSales?: number
  totalDeliveries?: number
  totalProfit?: number
  totalCosts?: number
  defaultMarkups?: {
    directDeliveryPrice?: number
    fullTruckPrice?: number
    smallDeliveryBusinessPrice?: number
    retailPrice?: number
  }
}
  