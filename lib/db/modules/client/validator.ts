import { z } from 'zod'

export const AddressSchema = z.object({
  _id: z.string().optional(),
  judet: z.string().min(3, 'Județul este obligatoriu'),
  localitate: z.string().min(3, 'Localitatea este obligatorie'),
  strada: z.string().min(3, 'Strada este obligatorie'),
  numar: z.string().min(1, 'Numărul este obligatoriu'),
  codPostal: z
    .string()
    .min(6, 'Codul poștal este obligatoriu')
    .max(6, 'Codul poștal trebuie să aibă 6 cifre'),
  tara: z.string().min(2, 'Țara este obligatorie').default('RO'),
  alteDetalii: z.string().optional(),
  persoanaContact: z.string().min(3, 'Persoana de contact este obligatorie'),
  telefonContact: z.string().min(7, 'Numărul de telefon este obligatoriu'),
  distanceInKm: z.number().optional(),
  travelTimeInMinutes: z.number().optional(),
  isActive: z.boolean().optional(),
})

export const BankAccountSchema = z
  .object({
    iban: z
      .string()
      .length(24, 'IBAN-ul trebuie să aibă 24 de caractere')
      .or(z.literal('')),
    bankName: z
      .string()
      .min(3, 'Numele băncii este obligatoriu')
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      return (
        (data.iban === '' && data.bankName === '') ||
        (data.iban !== '' && data.bankName !== '')
      )
    },
    {
      message:
        'Dacă unul dintre câmpurile bancare este completat, celălalt devine obligatoriu.',
      path: ['bankName'],
    }
  )

export const BaseClientSchema = z.object({
  clientType: z.enum(['Persoana fizica', 'Persoana juridica']),
  name: z.string().min(6, 'Numele este obligatoriu'),
  cnp: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .min(13, 'CNP este obligatoriu pentru Persoana fizica')
      .max(13, 'CNP-ul trebuie să aibă 13 caractere')
      .optional()
  ),
  vatId: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .min(2, 'Codul fiscal este obligatoriu pentru Persoana juridica')
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
  contractNumber: z.string().optional(),
  contractDate: z.coerce.date().optional(),
  email: z
    .string()
    .email('Email invalid')
    .min(4, 'Adresa de email este obligatorie'),
  phone: z.string().min(7, 'Numărul de telefon este obligatoriu'),
  address: AddressSchema,
  deliveryAddresses: z
    .array(AddressSchema)
    .min(1, 'Trebuie să adaugi cel puțin o adresă de livrare')
    .default([]),
  bankAccountLei: BankAccountSchema,
  bankAccountEuro: BankAccountSchema,
  mentions: z.string().optional(),
  paymentTerm: z
    .number({ invalid_type_error: 'Trebuie să fie un număr' })
    .int('Trebuie să fie un număr întreg')
    .nonnegative('Numărul de zile nu poate fi negativ')
    .optional()
    .default(0),
  defaultMarkups: z
    .object({
      directDeliveryPrice: z.number().nonnegative().optional(),
      fullTruckPrice: z.number().nonnegative().optional(),
      smallDeliveryBusinessPrice: z.number().nonnegative().optional(),
      retailPrice: z.number().nonnegative().optional(),
    })
    .optional(),
})

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
    // Persoana juridica
    if (!data.vatId) {
      ctx.addIssue({
        path: ['vatId'],
        code: z.ZodIssueCode.custom,
        message: 'Cod fiscal (vatId) este obligatoriu pentru Persoana juridica',
      })
    } else {
      // Validare CUI condiționată
      const cui = data.vatId.toUpperCase().replace('RO', '')
      if (/^\d+$/.test(cui)) {
        // Se validează algoritmic doar dacă e numeric
        // if (!isValidCUI(cui)) {
        //   ctx.addIssue({
        //     path: ['vatId'],
        //     code: z.ZodIssueCode.custom,
        //     message: 'Codul fiscal (CUI) nu este valid.',
        //   })
        // }
      }
      if (data.isVatPayer && !data.vatId.toUpperCase().startsWith('RO')) {
        ctx.addIssue({
          path: ['vatId'],
          code: z.ZodIssueCode.custom,
          message: 'Plătitorii de TVA trebuie să aibă prefixul "RO".',
        })
      }
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
    } else {
      const cui = data.vatId.toUpperCase().replace('RO', '')
      if (/^\d+$/.test(cui)) {
        // if (!isValidCUI(cui)) {
        //   ctx.addIssue({
        //     path: ['vatId'],
        //     code: z.ZodIssueCode.custom,
        //     message: 'Codul fiscal (CUI) nu este valid.',
        //   })
        // }
      }
      if (data.isVatPayer && !data.vatId.toUpperCase().startsWith('RO')) {
        ctx.addIssue({
          path: ['vatId'],
          code: z.ZodIssueCode.custom,
          message: 'Plătitorii de TVA trebuie să aibă prefixul "RO".',
        })
      }
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
