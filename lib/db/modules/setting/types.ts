import { z } from 'zod'
import { SettingInputSchema } from './validator'

export type ISettingInput = z.infer<typeof SettingInputSchema>
export type ClientSetting = ISettingInput & {
  currency: string
}
