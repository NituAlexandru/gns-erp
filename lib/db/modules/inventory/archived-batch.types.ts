import { z } from 'zod'
import { IArchivedBatchDoc as IArchivedBatchDocModel } from './archived-batch.model'
import { ArchivedBatchSchema } from './archived-batch.validator'

export type IArchivedBatchInput = z.infer<typeof ArchivedBatchSchema>
export type IArchivedBatchDoc = IArchivedBatchDocModel

// DTO pentru Frontend (dacă vrei să afișezi istoricul loturilor epuizate)
export type ArchivedBatchDTO = {
  _id: string
  stockableItemName: string // Populat
  stockableItemCode?: string
  location: string
  quantityOriginal: number
  unitCost: number
  entryDate: string | Date
  supplierName?: string // Populat
  qualityDetails?: {
    lotNumbers?: string[]
    certificateNumbers?: string[]
  }
  archivedAt: string | Date
}
