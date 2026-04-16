import { z } from 'zod'

export const ContractParagraphSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string(),
  order: z.number(),
})

export const ContractTemplateSchema = z.object({
  name: z.string().min(1, 'Numele șablonului este obligatoriu'),
  documentTitle: z.string().default('CONTRACT'),
  type: z.enum(['CONTRACT', 'ADDENDUM']),
  isDefault: z.boolean().default(false),
  paragraphs: z.array(ContractParagraphSchema).default([]),
})

export const GeneratedContractSchema = z.object({
  clientId: z.string().min(1, 'ID-ul clientului este obligatoriu'),
  templateId: z.string().min(1, 'ID-ul șablonului este obligatoriu'),
  type: z.enum(['CONTRACT', 'ADDENDUM']),
  parentContractId: z.string().optional(),
  series: z.string(),
  number: z.string(),
  documentTitle: z.string(),
  date: z.coerce.date(),
})
