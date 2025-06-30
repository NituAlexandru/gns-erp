import { MongoId } from '@/lib/validator'
import { z } from 'zod'

// USER
const UserName = z
  .string()
  .min(3, {
    message: 'Numele de utilizator trebuie să aibă cel puțin 3 caractere',
  })
  .max(50, {
    message: 'Numele de utilizator trebuie să aibă maxim 50 de caractere',
  })
const Email = z
  .string()
  .min(3, 'Email-ul este obligatoriu')
  .email('Adresa de email este invalidă')
const Password = z
  .string()
  .min(8, { message: 'Parola trebuie să aibă cel puțin 8 caractere' })
  .regex(/(?=.*[a-z])/, {
    message: 'Parola trebuie să conțină cel puțin o literă mică',
  })
  .regex(/(?=.*[A-Z])/, {
    message: 'Parola trebuie să conțină cel puțin o literă mare',
  })
  .regex(/(?=.*\d)/, { message: 'Parola trebuie să conțină cel puțin o cifră' })
  .regex(/(?=.*[!@#$%^&*])/, {
    message:
      'Parola trebuie să conțină cel puțin un caracter special (ex: !@#$%)',
  })
const UserRole = z.string().min(1, 'Rolul este obligatoriu')

export const UserInputSchema = z.object({
  name: UserName,
  email: Email,
  image: z.string().optional(),
  emailVerified: z.boolean(),
  role: UserRole,
  password: Password,
  paymentMethod: z.string().min(1, 'Metoda de plată este obligatorie'),
  address: z.object({
    fullName: z.string().min(3, 'Numele complet este obligatoriu'),
    street: z.string().min(5, 'Strada este obligatorie'),
    city: z.string().min(3, 'Orașul este obligatoriu'),
    province: z.string().min(2, 'Județul/Sectorul este obligatoriu'),
    postalCode: z.string().min(3, 'Codul poștal este obligatoriu'),
    country: z.string().min(3, 'Țara este obligatorie'),
    phone: z.string().min(8, 'Numărul de telefon este obligatoriu'),
  }),
})
export const UserSignInSchema = z.object({
  email: Email,
  password: Password,
})
export const UserSignUpSchema = UserSignInSchema.extend({
  name: UserName,
  confirmPassword: Password,
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Parolele nu se potrivesc',
  path: ['confirmPassword'],
})
export const UserNameSchema = z.object({
  name: UserName,
})
export const UserUpdateSchema = z.object({
  _id: MongoId,
  name: UserName,
  email: Email,
  role: UserRole,
})

// ─── Scopul: validare câmp email, parola și telefon ───
export const UserEmailUpdateSchema = z.object({
  email: Email,
})

export const UserPasswordUpdateSchema = z
  .object({
    password: Password,
    confirmPassword: Password,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Parolele nu se potrivesc',
    path: ['confirmPassword'],
  })

export const UserPhoneUpdateSchema = z.object({
  phone: z.string().min(8, 'Numărul de telefon este obligatoriu'),
})
