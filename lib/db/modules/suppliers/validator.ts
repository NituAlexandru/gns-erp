import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const SupplierCreateSchema = z.object({
  name: z.string().min(1, 'Numele este obligatoriu'),
  contactName: z.string().optional(),
  email: z
    .string()
    .email('Email invalid')
    .min(4, 'Adresa de email este obligatorie'),
  phone: z.string().min(7, 'Numărul de telefon este obligatoriu'),
  address: z.string().min(7, 'Adresa fiscală este obligatorie'),
  fiscalCode: z.string().min(4, 'Codul fiscal este obligatoriu'),
  regComNumber: z
    .string()
    .min(4, 'Numărul de înregistrare la RegCom este obligatoriu'),
  bankAccountLei: z.string().min(4, 'Contul de LEI este obligatoriu'),
  bankAccountEuro: z.string().optional(),
  externalTransport: z.boolean().optional().default(false),
  loadingAddress: z
    .array(z.string().min(1, 'Adaugă adresa completă'))
    .default([]),
  externalTransportCosts: z.coerce.number().nonnegative().optional().default(0),
  internalTransportCosts: z.coerce.number().nonnegative().optional().default(0),
  brand: z.array(z.string().min(1)).optional().default([]),
  mentions: z.string().optional(),
  isVatPayer: z.boolean().optional().default(false),
})

export const SupplierUpdateSchema = SupplierCreateSchema.extend({
  _id: MongoId,
})
