import z from 'zod'
import { DocumentType } from './documentCounter.model'
import { SeriesSchema } from './validator'

export interface SeriesDTO {
  _id: string 
  name: string
  documentType: DocumentType
  isActive: boolean
  currentNumber?: number
}

export type SeriesFormData = z.infer<typeof SeriesSchema>
