import { z } from 'zod'
import { IReturnNoteDoc } from './return-note.model'
import { CreateReturnNoteSchema, ReturnNoteLineSchema } from './return-note.validator'

// Tipul pentru o linie dintr-un formular
export type ReturnNoteLineInput = z.infer<typeof ReturnNoteLineSchema>

// Tipul pentru formularul de creare
export type CreateReturnNoteInput = z.infer<typeof CreateReturnNoteSchema>

// DTO (Data Transfer Object) - Ce trimitem la client
export type ReturnNoteDTO = Omit<
  IReturnNoteDoc,
  'items' | 'createdAt' | 'updatedAt' // Omit câmpurile complexe
> & {
  _id: string
  items: (ReturnNoteLineInput & { _id: string })[] // Trimitem linii cu ID
  createdAt: string // Convertim datele în string
  updatedAt: string
  completedAt?: string
}

// Răspunsul acțiunilor
type ReturnNoteActionResultSuccess = {
  success: true
  data: ReturnNoteDTO
  message: string
}
type ReturnNoteActionResultError = {
  success: false
  message: string
}

export type ReturnNoteActionResult =
  | ReturnNoteActionResultSuccess
  | ReturnNoteActionResultError
