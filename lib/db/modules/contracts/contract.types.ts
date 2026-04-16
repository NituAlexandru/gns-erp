import { z } from 'zod'
import {
  ContractParagraphSchema,
  ContractTemplateSchema,
  GeneratedContractSchema,
} from './contract.validator'

export type IContractParagraph = z.infer<typeof ContractParagraphSchema>

// Tipul de date pe care îl trimitem către Frontend (DTO)
export interface ContractTemplateDTO
  extends z.infer<typeof ContractTemplateSchema> {
  _id: string
  createdAt: string | Date
  updatedAt: string | Date
}

// Tipul pentru Creare
export type IGeneratedContractCreate = z.infer<typeof GeneratedContractSchema>

// Tipul DTO pentru afișare în Frontend (pe fișa clientului)
export interface GeneratedContractDTO extends IGeneratedContractCreate {
  _id: string
  createdBy: string
  createdAt: string | Date
  updatedAt: string | Date
}
