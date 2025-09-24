import { z } from 'zod'
import { ServiceInputSchema, ServiceUpdateSchema } from './validator'
import { VatRateDTO } from '../vat-rate/types'

// Acest tip se va actualiza automat pentru a conține 'vatRate' în loc de 'vatRateId'
export type ServiceInput = z.infer<typeof ServiceInputSchema>
export type ServiceUpdateInput = z.infer<typeof ServiceUpdateSchema>

export interface ServiceDTO extends Omit<ServiceInput, 'vatRate'> {
  _id: string
  createdAt: string
  updatedAt: string
  vatRate: VatRateDTO
}
