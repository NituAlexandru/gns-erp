import { Types } from 'mongoose'
import { z } from 'zod'
import { ISupplierDoc } from '../../../suppliers/types'
import { CreateSupplierPaymentSchema } from './supplier-payment.validator'

// 1. Tipul de bază Mongoose (pentru document)
export interface ISupplierPaymentDoc extends Document {
  _id: Types.ObjectId
  paymentNumber: string // Ex: PLATA-2025-00001
  seriesName: string
  sequenceNumber: number

  supplierId: Types.ObjectId | ISupplierDoc // Către cine am plătit
  paymentDate: Date // Data la care am făcut plata
  paymentMethod: string // Metoda (OP, Card, etc.)

  totalAmount: number // Suma totală plătită (ex: 5000)
  unallocatedAmount: number // Suma nealocată (inițial = totalAmount)

  referenceDocument?: string // Ex: "OP 456"
  notes?: string

  status: 'NEALOCAT' | 'PARTIAL_ALOCAT' | 'ALOCAT_COMPLET'

  createdBy: Types.ObjectId
  createdByName: string

  createdAt: Date
  updatedAt: Date
}

// 2. Tipul DTO (ce trimitem la client/UI)
export interface SupplierPaymentDTO {
  _id: string
  paymentNumber: string
  seriesName: string
  sequenceNumber: number
  supplierId: string
  paymentDate: string // ISO Date
  paymentMethod: string
  totalAmount: number
  unallocatedAmount: number
  referenceDocument?: string
  notes?: string
  status: 'NEALAT' | 'PARTIAL_ALOCAT' | 'ALOCAT_COMPLET'
  createdByName: string
  createdAt: string
}

// 3. Tipul de Input (din Zod, pentru formulare)
export type CreateSupplierPaymentInput = z.infer<
  typeof CreateSupplierPaymentSchema
>
