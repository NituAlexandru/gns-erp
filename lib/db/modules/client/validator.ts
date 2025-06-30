import { z } from 'zod'

// Sub‐schema for each address
export const ClientAddressSchema = z.object({
  country: z.string().min(1, 'Țara este obligatorie'),
  province: z.string().min(1, 'Județul este obligatoriu'),
  city: z.string().min(1, 'Orașul este obligatoriu'),
  street: z.string().min(5, 'Adresa este obligatorie'),
  postalCode: z.string().min(3, 'Codul poștal este obligatoriu'),
  label: z.string().min(1, 'Eticheta adresei este obligatorie'),
  phone: z.string().min(8, 'Numărul de telefon este obligatoriu'),
})
export type ClientAddress = z.infer<typeof ClientAddressSchema>
// Schema for creating a client
export const ClientCreateSchema = z.object({
  clientType: z.enum(['persoana fizica', 'persoana juridica']),
  name: z.string().min(1),
  cnp: z.string().optional(),
  cui: z.string().optional(),
  isVatPayer: z.boolean().optional().default(false),
  vatId: z.string().optional(),
  nrRegComert: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  addresses: z.array(ClientAddressSchema).default([]),
  iban: z.string().optional(),
  totalOrders: z.number().int().nonnegative().optional(),
  totalSales: z.number().nonnegative().optional(),
  totalDeliveries: z.number().nonnegative().optional(),
  totalProfit: z.number().optional(),
  totalCosts: z.number().optional(),
  defaultMarkups: z
    .object({
      directDeliveryPrice: z.number().nonnegative().optional(),
      fullTruckPrice: z.number().nonnegative().optional(),
      smallDeliveryBusinessPrice: z.number().nonnegative().optional(),
      retailPrice: z.number().nonnegative().optional(),
    })
    .optional(),
})

// Schema for updating a client
export const ClientUpdateSchema = z
  .object({ _id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID invalid de Mongo') })
  .merge(ClientCreateSchema.partial())
