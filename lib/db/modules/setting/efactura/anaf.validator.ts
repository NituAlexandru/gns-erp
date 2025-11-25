import { z } from 'zod'

export const ExchangeTokenSchema = z.object({
  code: z.string().min(1, 'Codul de autorizare lipsește.'),
})

export type ExchangeTokenInput = z.infer<typeof ExchangeTokenSchema>
