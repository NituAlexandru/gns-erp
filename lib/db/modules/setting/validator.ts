import { z } from 'zod'

export const SettingInputSchema = z.object({
  common: z.object({
    pageSize: z.coerce.number().min(1).default(9),
    isMaintenanceMode: z.boolean().default(false),
    freeShippingMinPrice: z.coerce.number().min(0).default(0),
    defaultTheme: z.string().min(1).default('light'),
    currency: z.string().min(1).default('RON'),
  }),
  site: z.object({
    name: z.string().min(1),
    logo: z.string().min(1),
    slogan: z.string().min(1),
    description: z.string().min(1),
    keywords: z.string().min(1),
    url: z.string().min(1),
    email: z.string().min(1),
    phone: z.string().min(1),
    author: z.string().min(1),
    copyright: z.string().min(1),
    address: z.string().min(1),
  }),
  availablePaymentMethods: z
    .array(
      z.object({
        name: z.string().min(1),
        commission: z.coerce.number().min(0),
      })
    )
    .min(1),
  defaultPaymentMethod: z.string().min(1),
  availableDeliveryDates: z
    .array(
      z.object({
        name: z.string().min(1),
        daysToDeliver: z.number().min(0),
        shippingPrice: z.coerce.number().min(0),
        freeShippingMinPrice: z.coerce.number().min(0),
      })
    )
    .min(1),
  defaultDeliveryDate: z.string().min(1),
})
// Trebuie modificat
