import { z } from 'zod'

export const CreateOpeningBalanceSchema = z.object({
  partnerId: z.string().min(1, 'ID-ul partenerului este obligatoriu'), 
  amount: z.number().positive('Suma trebuie să fie mai mare decât 0'),
  date: z.coerce.date({ required_error: 'Data este obligatorie' }),
  details: z.string().optional(),
})

export type CreateOpeningBalanceInput = z.infer<
  typeof CreateOpeningBalanceSchema
>

// --- Input Simplificat pentru Frontend ---
// Utilizatorul selectează produsul și introduce cantitatea/prețul.
// Restul datelor (coduri, tva, options) le luăm din DB în backend.
export const PackagingSimpleInputSchema = z.object({
  productId: z.string().min(1, 'Produsul este obligatoriu'),
  productName: z.string().optional(),
  quantity: z.number().min(0.01, 'Cantitatea trebuie să fie pozitivă'),
  unitPrice: z.number().min(0, 'Prețul nu poate fi negativ'),
  vatRate: z.number({ required_error: 'Cota TVA este obligatorie' }).min(0),
})

export const CreatePackagingOpeningBalanceSchema = z.object({
  partnerId: z.string().min(1, 'Partenerul este obligatoriu'),
  deliveryAddressId: z.string().optional(),
  date: z.coerce.date().optional(),
  items: z
    .array(PackagingSimpleInputSchema)
    .min(1, 'Trebuie să adăugați cel puțin un produs.'),
})

export type CreatePackagingOpeningBalanceInput = z.infer<
  typeof CreatePackagingOpeningBalanceSchema
>
