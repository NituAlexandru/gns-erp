import { z } from 'zod'
import { formatNumberWithDecimal } from './utils'

export const MongoId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: 'ID MongoDB invalid' })

export const Price = (field: string) =>
  z.coerce
    .number()
    .refine(
      (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(value)),
      `${field} trebuie să aibă exact două zecimale (ex: 49.99)`
    )
