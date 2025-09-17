import { z } from 'zod'
import {
  AddressSchema as BaseAddressSchema,
  BankAccountSchema,
} from '@/lib/db/modules/client/validator'

const AddressSchema = BaseAddressSchema.extend({
  distanceInKm: z.number().optional(),
  travelTimeInMinutes: z.number().optional(),
})

export const BaseSupplierSchema = z.object({
  name: z.string().min(1, 'Numele este obligatoriu'),
  contactName: z.string().optional(),
  email: z
    .string()
    .email('Email invalid')
    .min(4, 'Adresa de email este obligatorie'),
  phone: z.string().min(7, 'Numărul de telefon este obligatoriu'),
  address: AddressSchema,
  fiscalCode: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().min(2, 'Codul fiscal este obligatoriu').optional()
  ),
  regComNumber: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .min(7, 'Numărul de înregistrare la RegCom este obligatoriu')
      .optional()
  ),
  isVatPayer: z.boolean().optional().default(false),
  bankAccountLei: BankAccountSchema.optional(),
  bankAccountEuro: BankAccountSchema.optional(),
  paymentTerm: z.number().int().nonnegative().optional().default(0),
  contractNumber: z.string().optional(),
  contractDate: z.coerce.date().optional(),
  loadingAddresses: z.array(AddressSchema).default([]),
  brand: z.array(z.string().min(1)).optional().default([]),
  mentions: z.string().optional(),
  externalTransport: z.boolean().optional().default(false),
  externalTransportCosts: z.coerce.number().nonnegative().optional().default(0),
  internalTransportCosts: z.coerce.number().nonnegative().optional().default(0),
})

export const SupplierCreateSchema = BaseSupplierSchema.superRefine(
  (data, ctx) => {
    if (!data.fiscalCode) {
      ctx.addIssue({
        path: ['fiscalCode'],
        message: 'Codul fiscal este obligatoriu',
        code: z.ZodIssueCode.custom,
      })
    } else {
      if (data.isVatPayer && !data.fiscalCode.toUpperCase().startsWith('RO')) {
        ctx.addIssue({
          path: ['fiscalCode'],
          message: 'Plătitorii de TVA trebuie să aibă prefixul "RO".',
          code: z.ZodIssueCode.custom,
        })
      }
    }
    if (!data.regComNumber) {
      ctx.addIssue({
        path: ['regComNumber'],
        message: 'Numărul de înregistrare la RegCom este obligatoriu',
        code: z.ZodIssueCode.custom,
      })
    }
  }
)

export const SupplierUpdateSchema = BaseSupplierSchema.extend({
  _id: z.string().min(1, 'ID-ul este necesar'),
}).superRefine((data, ctx) => {
  if (!data.fiscalCode) {
    ctx.addIssue({
      path: ['fiscalCode'],
      message: 'Codul fiscal este obligatoriu',
      code: z.ZodIssueCode.custom,
    })
  } else {
    if (data.isVatPayer && !data.fiscalCode.toUpperCase().startsWith('RO')) {
      ctx.addIssue({
        path: ['fiscalCode'],
        message: 'Plătitorii de TVA trebuie să aibă prefixul "RO".',
        code: z.ZodIssueCode.custom,
      })
    }
  }
  if (!data.regComNumber) {
    ctx.addIssue({
      path: ['regComNumber'],
      message: 'Numărul de înregistrare la RegCom este obligatoriu',
      code: z.ZodIssueCode.custom,
    })
  }
})
