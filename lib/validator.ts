import { z } from 'zod'
import { UNITS } from './constants'
import { formatNumberWithDecimal } from './utils'

// Common
const MongoId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: 'ID MongoDB invalid' })

const Price = (field: string) =>
  z.coerce
    .number()
    .refine(
      (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(value)),
      `${field} trebuie să aibă exact două zecimale (ex: 49.99)`
    )

export const ShippingAddressSchema = z.object({
  fullName: z
    .string()
    .min(5, 'Numele complet trebuie să aibă cel puțin 5 caractere'),
  street: z
    .string()
    .min(10, 'Adresa trebuie să conțină cel puțin 10 caractere'),
  city: z.string().min(3, 'Orașul trebuie să aibă cel puțin 3 caractere'),
  postalCode: z
    .string()
    .min(3, 'Codul poștal trebuie să aibă cel puțin 3 caractere'),
  province: z.string().min(1, 'Județul/Sectorul este obligatoriu'),
  phone: z.string().min(10, 'Numărul de telefon trebuie să aibă 10 cifre'),
  country: z.string().min(1, 'Țara este obligatorie'),
})

const VehicleAllocationSchema = z.object({
  vehicle: z.object({
    name: z.string(),
    maxLoadKg: z.number(),
    maxVolumeM3: z.number(),
    lengthCm: z.number(),
    widthCm: z.number(),
    heightCm: z.number(),
    ratePerKm: z.number(),
  }),
  trips: z
    .number()
    .int({ message: 'Numărul de curse trebuie să fie un număr întreg' })
    .positive({ message: 'Numărul de curse trebuie să fie un număr pozitiv' }),
  totalCost: z.number(),
})

export const ReviewInputSchema = z.object({
  product: MongoId,
  user: MongoId,
  isVerifiedPurchase: z.boolean(),
  title: z.string().min(5, 'Titlul trebuie să aibă cel puțin 5 caractere'),
  comment: z
    .string()
    .min(10, 'Comentariul trebuie să aibă cel puțin 10 caractere'),
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Rating-ul trebuie să fie minim 1')
    .max(5, 'Rating-ul trebuie să fie maxim 5'),
})

export const ProductInputSchema = z.object({
  name: z.string().min(3, 'Numele trebuie să aibă cel puțin 3 caractere'),
  slug: z.string().min(3, 'Slug-ul trebuie să aibă cel puțin 3 caractere'),
  category: z.string().min(1, 'Categoria este obligatorie'),
  mainCategory: z.string().min(1, 'Categoria principală este obligatorie'),
  productCode: z.string().min(1, 'Codul de produs este obligatoriu'),
  unit: z.enum(UNITS, {
    errorMap: () => ({ message: 'Unitatea de măsură este obligatorie' }),
  }),
  packagingUnit: z.enum(UNITS, {
    errorMap: () => ({ message: 'Unitatea de ambalare este obligatorie' }),
  }),
  packagingQuantity: z.coerce
    .number({
      invalid_type_error: 'Ambalaj / Cantitate trebuie să fie un număr',
    })
    .positive('Trebuie să fie un număr pozitiv')
    .refine((v) => Number.isInteger(v * 1000), {
      message: 'Maxim 3 zecimale permise',
    }),
  length: z.coerce.number().positive('Lungimea trebuie să fie > 0'),
  width: z.coerce.number().positive('Lățimea trebuie să fie > 0'),
  height: z.coerce.number().positive('Înălțimea trebuie să fie > 0'),
  volume: z.coerce
    .number()
    .positive('Volumul trebuie să fie > 0')
    .describe('Calculat ca (L×W×H)/1e6, in m³'),
  weight: z.coerce.number().positive('Greutatea trebuie să fie > 0'),
  entryPrice: Price('Prețul de intrare'),
  specifications: z.array(z.string()).default([]),
  images: z
    .array(z.string())
    .min(1, 'Produsul trebuie să aibă cel puțin o imagine'),
  brand: z.string().min(3, 'Marca este obligatorie'),
  description: z.string().min(20, 'Descrierea este obligatorie'),
  isPublished: z.boolean(),
  price: Price('Preț'),
  listPrice: Price('Preț de listă'),
  countInStock: z.coerce
    .number()
    .int()
    .nonnegative('Stocul trebuie să fie un număr pozitiv'),
  tags: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  avgRating: z.coerce
    .number()
    .min(0, 'Rating-ul mediu trebuie să fie minim 0')
    .max(5, 'Rating-ul mediu trebuie să fie maxim 5'),
  numReviews: z.coerce
    .number()
    .int()
    .nonnegative('Numărul de recenzii trebuie să fie un număr pozitiv'),
  ratingDistribution: z
    .array(z.object({ rating: z.number(), count: z.number() }))
    .max(5),
  reviews: z.array(ReviewInputSchema).default([]),
  numSales: z.coerce
    .number()
    .int()
    .nonnegative('Numărul de vânzări trebuie să fie un număr pozitiv'),
  itemsPerPallet: z.coerce
    .number()
    .int()
    .positive(
      'Cantitatea de articole pe palet trebuie să fie un număr întreg pozitiv'
    ),
  palletTypeId: z.string().optional(),
})
// Order Item
export const OrderItemSchema = z.object({
  clientId: z.string().min(1, 'ID-ul clientului este obligatoriu'),
  product: z.string().min(1, 'Produsul este obligatoriu'),
  name: z.string().min(1, 'Numele este obligatoriu'),
  slug: z.string().min(1, 'Slug-ul este obligatoriu'),
  category: z.string().min(1, 'Categoria este obligatorie'),
  quantity: z
    .number()
    .int()
    .nonnegative('Cantitatea trebuie să fie un număr pozitiv'),
  countInStock: z
    .number()
    .int()
    .nonnegative('Stocul trebuie să fie un număr pozitiv'),
  image: z.string().min(1, 'Imaginea este obligatorie'),
  price: Price('Preț'),
  size: z.string().optional(),
  color: z.string().optional(),
  weight: z.coerce.number().positive(),
  volume: z.coerce.number().positive(),
  lengthCm: z.coerce.number().positive(),
  widthCm: z.coerce.number().positive(),
  heightCm: z.coerce.number().positive(),
  isPalletItem: z.boolean().default(false),
  palletTypeId: z.string().optional(),
  palletCount: z.coerce.number().int().nonnegative().optional(),
  productCode: z.string().optional(),
  mainCategory: z.string().optional(),
  brand: z.string().optional(),
  entryPrice: Price('Preț de intrare').optional(),
})
// Cart - se va combina cu Order
export const CartSchema = z.object({
  items: z
    .array(OrderItemSchema)
    .min(1, 'Comanda trebuie să conțină cel puțin un articol'),
  itemsPrice: z.number(),
  taxPrice: z.optional(z.number()),
  shippingPrice: z.optional(z.number()),
  totalPrice: z.number(),
  paymentMethod: z.optional(z.string()),
  shippingAddress: z.optional(ShippingAddressSchema),
  deliveryDateIndex: z.optional(z.number()),
  expectedDeliveryDate: z.optional(z.date()),
  shippingDistance: z
    .number()
    .nonnegative('Distanța de livrare trebuie să fie >= 0')
    .optional(),
  vehicleAllocation: VehicleAllocationSchema,
})
// Order
export const OrderInputSchema = z.object({
  user: z.union([
    MongoId,
    z.object({
      name: z.string().min(1, 'Numele este obligatoriu'),
      email: z.string().email('Adresa de email este invalidă'),
    }),
  ]),
  items: z
    .array(OrderItemSchema)
    .min(1, 'Comanda trebuie să conțină cel puțin un articol'),
  shippingAddress: ShippingAddressSchema,
  paymentMethod: z.string().min(1, 'Metoda de plată este obligatorie'),
  paymentResult: z
    .object({
      id: z.string(),
      status: z.string(),
      email_address: z.string(),
      pricePaid: z.string(),
    })
    .optional(),
  itemsPrice: Price('Preț articole'),
  shippingPrice: Price('Preț transport'),
  taxPrice: Price('TVA'),
  totalPrice: Price('Preț total'),
  expectedDeliveryDate: z
    .date()
    .refine(
      (value) => value > new Date(),
      'Data de livrare estimată trebuie să fie în viitor'
    ),
  isDelivered: z.boolean().default(false),
  deliveredAt: z.date().optional(),
  isPaid: z.boolean().default(false),
  paidAt: z.date().optional(),
  shippingDistance: z
    .number()
    .nonnegative('Distanța de livrare trebuie să fie >= 0'),
  vehicleAllocation: VehicleAllocationSchema,
})
// ---------------------------- USER ------------------------------
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

// ─── Validare câmp email, parola și telefon ───
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
// -------------------- End of User -------------------------
