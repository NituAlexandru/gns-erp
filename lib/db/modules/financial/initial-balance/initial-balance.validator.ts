import { z } from 'zod'

export const CreateOpeningBalanceSchema = z.object({
  partnerId: z.string().min(1, 'ID-ul partenerului este obligatoriu'), // ClientId sau SupplierId
  amount: z.number().positive('Suma trebuie să fie mai mare decât 0'),
  date: z.coerce.date({ required_error: 'Data este obligatorie' }),
  details: z.string().optional(),
})

export type CreateOpeningBalanceInput = z.infer<
  typeof CreateOpeningBalanceSchema
>
