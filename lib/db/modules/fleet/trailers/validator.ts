import { z } from 'zod'

export const TRAILER_TYPES = [
  'Prelată',
  'Platformă',
] as const

const BaseTrailerSchema = z.object({
  name: z.string().min(3, 'Numele este obligatoriu'),
  licensePlate: z.string().min(4, 'Numărul de înmatriculare este obligatoriu'),
  type: z.enum(TRAILER_TYPES),

  maxLoadKg: z.number().positive('Sarcina utilă trebuie să fie pozitivă'),
  maxVolumeM3: z.number().positive('Volumul trebuie să fie pozitiv'),
  lengthCm: z.number().int().positive('Dimensiunile trebuie să fie pozitive'),
  widthCm: z.number().int().positive('Dimensiunile trebuie să fie pozitive'),
  heightCm: z.number().int().positive('Dimensiunile trebuie să fie pozitive'),

  year: z.number().int().optional(),
  chassisNumber: z.string().optional(),
  notes: z.string().optional(),
})

export const TrailerCreateSchema = BaseTrailerSchema
export const TrailerUpdateSchema = BaseTrailerSchema.extend({
  _id: z.string().min(1, 'ID-ul este necesar'),
})
