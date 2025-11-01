import { z } from 'zod'

// Schema pentru adresa
export const AddressSchema = z.object({
  judet: z.string().min(1, 'Județul este obligatoriu.'),
  localitate: z.string().min(1, 'Localitatea este obligatorie.'),
  strada: z.string().min(1, 'Strada este obligatorie.'),
  numar: z.string().optional(),
  alteDetalii: z.string().optional(),
  codPostal: z.string().min(4, 'Codul poștal este obligatoriu.'),
  tara: z.string().min(2, 'Țara este obligatorie (ex: RO)').default('RO'),
})

// Schema pentru un singur cont bancar
export const BankAccountSchema = z.object({
  bankName: z.string().min(1, 'Numele băncii este obligatoriu.'),
  iban: z.string().min(1, 'IBAN-ul este obligatoriu.'),
  currency: z
    .string()
    .min(3, 'Moneda este obligatorie (ex: RON)')
    .default('RON'),
  isDefault: z.boolean().default(false),
})

// Schema pentru un singur email
export const EmailSchema = z.object({
  address: z
    .string()
    .min(1, 'Adresa de email este obligatorie.')
    .email('Email invalid.'),
  isDefault: z.boolean().default(false),
})

// Schema pentru un singur telefon
export const PhoneSchema = z.object({
  number: z.string().min(1, 'Numărul de telefon este obligatoriu.'),
  isDefault: z.boolean().default(false),
})

// Schema principală pentru setările companiei
export const SettingInputSchema = z.object({
  name: z.string().min(1, 'Numele companiei este obligatoriu.'),
  cui: z.string().min(1, 'CUI-ul este obligatoriu.'),
  regCom: z.string().min(1, 'Nr. Reg. Com. este obligatoriu.'),
  address: AddressSchema,
  web: z.string().url('URL invalid.').optional(),

  // Array-uri pentru date multiple
  bankAccounts: z
    .array(BankAccountSchema)
    .min(1, 'Adaugă cel puțin un cont bancar.'),
  emails: z.array(EmailSchema).min(1, 'Adaugă cel puțin un email.'),
  phones: z.array(PhoneSchema).min(1, 'Adaugă cel puțin un telefon.'),
})
