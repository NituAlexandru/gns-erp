import { Types } from 'mongoose'
import { z } from 'zod'
import { CreateClientPaymentSchema } from './client-payment.validator'

// 1. Tipul de bază Mongoose (pentru document)
export interface IClientPaymentDoc extends Document {
  _id: Types.ObjectId
  paymentNumber: string
  seriesName: string
  sequenceNumber: number
  clientId: Types.ObjectId
  paymentDate: Date
  paymentMethod: string
  totalAmount: number
  unallocatedAmount: number
  referenceDocument?: string
  notes?: string
  status: 'NEALOCAT' | 'PARTIAL_ALOCAT' | 'ALOCAT_COMPLET'
  createdBy: Types.ObjectId
  createdByName: string
  createdAt: Date
  updatedAt: Date
}

// 2. Tipul DTO (ce trimitem la client/UI)
export interface ClientPaymentDTO {
  _id: string
  paymentNumber: string
  seriesName: string
  sequenceNumber: number
  clientId: string
  paymentDate: string // ISO Date
  paymentMethod: string
  totalAmount: number
  unallocatedAmount: number
  referenceDocument?: string
  notes?: string
  status: 'NEALOCAT' | 'PARTIAL_ALOCAT' | 'ALOCAT_COMPLET'
  createdByName: string
  createdAt: string
}

// 3. Tipul de Input (din Zod, pentru formulare)
export type CreateClientPaymentInput = z.infer<typeof CreateClientPaymentSchema>
