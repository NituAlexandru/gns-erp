import { ProductInputSchema } from '@/lib/validator'
import { z } from 'zod'

export type IProductInput = z.infer<typeof ProductInputSchema>

export type Data = {
  headerMenus: {
    name: string
    href: string
  }[]
}
