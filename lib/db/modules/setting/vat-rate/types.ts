import { z } from 'zod'
import {
  VatRateCreateSchema,
  VatRateUpdateSchema,
  SetDefaultVatRateSchema,
} from './validator'
import { IDefaultVatHistoryDoc } from './vatRate.model'

export type VatRateCreateInput = z.infer<typeof VatRateCreateSchema>
export type VatRateUpdateInput = z.infer<typeof VatRateUpdateSchema>
export type SetDefaultVatRateInput = z.infer<typeof SetDefaultVatRateSchema>

export type VatRateDTO = {
  _id: string
  name: string
  rate: number
  isActive: boolean
  isDefault: boolean
}

export type PopulatedDefaultVatHistory = Omit<
  IDefaultVatHistoryDoc,
  'vatRateId' | 'setByUserId'
> & {
  vatRateId: {
    _id: string
    name: string
  } | null
  setByUserId: {
    _id: string
    name: string
  } | null
}
