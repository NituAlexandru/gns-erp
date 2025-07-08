import { z } from 'zod'

const BaseClientSchema = z.object({
  clientType: z.enum(['Persoana fizica', 'Persoana juridica']),
  name: z.string().min(6, 'Numele este obligatoriu'),
  cnp: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().min(13, 'CNP este obligatoriu pentru Persoana fizica').optional()
  ),
  vatId: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .min(8, 'Codul fiscal este obligatoriu pentru Persoana juridica')
      .optional()
  ),
  nrRegComert: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .min(
        7,
        'Numărul de înregistrare la RegCom este obligatoriu pentru Persoana juridica'
      )
      .optional()
  ),
  isVatPayer: z.boolean().optional().default(false),
  email: z
    .string()
    .email('Email invalid')
    .min(4, 'Adresa de email este obligatorie'),
  phone: z.string().min(7, 'Numărul de telefon este obligatoriu'),
  address: z.string().min(20, 'Adresa fiscală este obligatorie'),
  deliveryAddresses: z
    .array(z.string().min(1, 'Adresa de livrare este obligatorie'))
    .min(1, 'Trebuie să adaugi cel puțin o adresă de livrare')
    .default([]),
  bankAccountLei: z.string().optional(),
  bankAccountEuro: z.string().optional(),
  mentions: z.string().optional(),
  defaultMarkups: z
    .object({
      directDeliveryPrice: z.number().nonnegative().optional(),
      fullTruckPrice: z.number().nonnegative().optional(),
      smallDeliveryBusinessPrice: z.number().nonnegative().optional(),
      retailPrice: z.number().nonnegative().optional(),
    })
    .optional(),
})

// 2) Create: aplicăm regula de „required condiționat”
export const ClientCreateSchema = BaseClientSchema.superRefine((data, ctx) => {
  if (data.clientType === 'Persoana fizica') {
    if (!data.cnp) {
      ctx.addIssue({
        path: ['cnp'],
        code: z.ZodIssueCode.custom,
        message: 'CNP este obligatoriu pentru Persoana fizica',
      })
    }
  } else {
    if (!data.vatId) {
      ctx.addIssue({
        path: ['vatId'],
        code: z.ZodIssueCode.custom,
        message: 'Cod fiscal (vatId) este obligatoriu pentru Persoana juridica',
      })
    }
    if (!data.nrRegComert) {
      ctx.addIssue({
        path: ['nrRegComert'],
        code: z.ZodIssueCode.custom,
        message:
          'Număr Registru Comerț este obligatoriu pentru Persoana juridica',
      })
    }
  }
})
export const ClientUpdateSchema = BaseClientSchema.extend({
  _id: z.string().min(1, 'ID-ul clientului este necesar'),
}).superRefine((data, ctx) => {
  // aceeași logică condiționată ca la creare
  if (data.clientType === 'Persoana fizica') {
    if (!data.cnp) {
      ctx.addIssue({
        path: ['cnp'],
        code: z.ZodIssueCode.custom,
        message: 'CNP este obligatoriu pentru Persoana fizica',
      })
    }
  } else {
    if (!data.vatId) {
      ctx.addIssue({
        path: ['vatId'],
        code: z.ZodIssueCode.custom,
        message: 'Cod fiscal (vatId) este obligatoriu pentru Persoana juridica',
      })
    }
    if (!data.nrRegComert) {
      ctx.addIssue({
        path: ['nrRegComert'],
        code: z.ZodIssueCode.custom,
        message:
          'Număr Registru Comerț este obligatoriu pentru Persoana juridica',
      })
    }
  }
})
// totalOrders: z.number().int().nonnegative().optional(),
// totalSales: z.number().nonnegative().optional(),
// totalDeliveries: z.number().nonnegative().optional(),
// totalProfit: z.number().optional(),
// totalCosts: z.number().optional(), in statistica
