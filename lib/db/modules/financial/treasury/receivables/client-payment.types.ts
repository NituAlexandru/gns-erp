import { Types, Document } from 'mongoose'
import { z } from 'zod'
import { CreateClientPaymentSchema } from './client-payment.validator'
import { ClientPaymentStatus } from './client-payment.constants'

export interface IClientPaymentDoc extends Document {
  _id: Types.ObjectId
  paymentNumber: string
  seriesName?: string
  sequenceNumber?: number | null
  clientId: Types.ObjectId
  paymentDate: Date
  paymentMethod: string
  totalAmount: number
  currency: string
  exchangeRate: number
  originalCurrencyAmount?: number
  unallocatedAmount: number
  referenceDocument?: string
  notes?: string
  status: ClientPaymentStatus
  createdBy: Types.ObjectId
  createdByName: string
  createdAt: Date
  updatedAt: Date
}

// 2. Tipul DTO (ce trimitem la client/UI)
export interface ClientPaymentDTO {
  _id: string
  paymentNumber: string
  seriesName?: string
  sequenceNumber?: number | null
  clientId: string
  paymentDate: string // ISO Date
  paymentMethod: string
  totalAmount: number
  currency: string
  exchangeRate: number
  originalCurrencyAmount?: number
  unallocatedAmount: number
  referenceDocument?: string
  notes?: string
  status: ClientPaymentStatus
  createdByName: string
  createdAt: string
}

// 3. Tipul de Input (din Zod, pentru formulare)
export type CreateClientPaymentInput = z.infer<typeof CreateClientPaymentSchema>

export type PopulatedClientPayment = Omit<ClientPaymentDTO, 'clientId'> & {
  clientId: {
    _id: string
    name: string
  }
}
