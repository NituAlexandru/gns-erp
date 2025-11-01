import { z } from 'zod'
import {
  SettingInputSchema,
  BankAccountSchema,
  EmailSchema,
  PhoneSchema,
} from './validator'

export type ISettingInput = z.infer<typeof SettingInputSchema>
export type IBankAccount = z.infer<typeof BankAccountSchema>
export type IEmail = z.infer<typeof EmailSchema>
export type IPhone = z.infer<typeof PhoneSchema>
