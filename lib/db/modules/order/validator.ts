import { z } from 'zod'
import { VehicleAllocationSchema } from '../vehicle'
import { MongoId, Price } from '@/lib/validator'

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
export const ShippingAddressSchema = z.object({
  adressName: z.string().min(1, 'Denumirea adresei este obligatorie'),
  country: z.string().min(1, 'Țara este obligatorie'),
  province: z.string().min(2, 'Județul/Sectorul este obligatoriu'),
  city: z.string().min(3, 'Orașul trebuie să aibă cel puțin 3 caractere'),
  street: z
    .string()
    .min(10, 'Adresa trebuie să conțină cel puțin 10 caractere'),
  postalCode: z
    .string()
    .min(3, 'Codul poștal trebuie să aibă cel puțin 3 caractere'),
  label: z.string().min(1, 'Eticheta adresei este obligatorie'), // ex: 'Domiciliu', 'Livrare depozit'
  phone: z.string().min(10, 'Numărul de telefon trebuie să aibă 10 cifre'),
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

// Cart - de sters dupa ce fac order
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
