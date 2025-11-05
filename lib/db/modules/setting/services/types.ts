import { z } from 'zod'
import { ServiceInputSchema, ServiceUpdateSchema } from './validator'
import { VatRateDTO } from '../vat-rate/types'

export type ServiceInput = z.infer<typeof ServiceInputSchema>
export type ServiceUpdateInput = z.infer<typeof ServiceUpdateSchema>

export interface ServiceDTO extends Omit<ServiceInput, 'vatRate'> {
  _id: string
  createdAt: string
  updatedAt: string
  vatRate: VatRateDTO
}

export type SearchedService = {
  _id: string
  name: string
  code: string
  price: number
  cost: number
  unitOfMeasure: string
  vatRateId: string
  isPerDelivery?: boolean
}
