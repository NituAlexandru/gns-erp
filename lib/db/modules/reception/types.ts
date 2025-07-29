import { z } from 'zod'
import {
  ReceptionCreateSchema,
  ReceptionProductSchema,
  ReceptionUpdateSchema,
} from './validator'

// Acum acest fișier este sursa de adevăr pentru TIPURI
export type ReceptionProductInput = z.infer<typeof ReceptionProductSchema>
export type ReceptionCreateInput = z.infer<typeof ReceptionCreateSchema>
export type ReceptionUpdateInput = z.infer<typeof ReceptionUpdateSchema>
