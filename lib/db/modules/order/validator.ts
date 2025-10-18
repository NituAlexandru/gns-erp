import { z } from 'zod'

export const OrderLineItemInputSchema = z.object({
  productId: z.string().optional(),
  serviceId: z.string().optional(),
  isManualEntry: z.boolean(),
  productName: z
    .string({ required_error: 'Numele produsului este obligatoriu.' })
    .min(1),
  productCode: z.string().optional(),
  quantity: z.coerce
    .number({ required_error: 'Cantitatea este obligatorie.' })
    .positive(),
  unitOfMeasure: z.string({
    required_error: 'Unitatea de măsură este obligatorie.',
  }),
  unitOfMeasureCode: z.string().optional().default('H87'),
  priceAtTimeOfOrder: z.coerce
    .number({ required_error: 'Prețul unitar este obligatoriu.' })
    .nonnegative(),
  minimumSalePrice: z.number().optional(),
  vatRateDetails: z.object({
    rate: z.number({ required_error: 'Cota TVA este obligatorie.' }),
    value: z.number({ required_error: 'Valoarea TVA este obligatorie.' }),
  }),
  codNC: z.string().optional(),
  codCPV: z.string().optional(),
  baseUnit: z.string().optional(),
  packagingOptions: z.any().optional(),
  weight: z.number().optional(),
  volume: z.number().optional(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  packagingUnit: z.string().optional(),
  packagingQuantity: z.number().optional(),
  isPerDelivery: z.boolean().optional(),
})

// Validator pentru crearea unei comenzi noi
export const CreateOrderInputSchema = z.object({
  entityType: z.enum(['client', 'project']).default('client'),
  clientId: z.string({ required_error: 'Te rog selectează un client.' }).min(1),
  clientSnapshot: z.object({
    name: z.string(),
    cui: z.string(),
    regCom: z.string(),
    address: z.string(),
    judet: z.string(),
    bank: z.string().optional(),
    iban: z.string().optional(),
  }),
  deliveryAddress: z.object({
    judet: z.string().min(1, 'Județul este obligatoriu.'),
    localitate: z.string().min(1, 'Localitatea este obligatorie.'),
    strada: z.string().min(1, 'Strada este obligatorie.'),
    numar: z.string().min(1, 'Numărul este obligatoriu.'),
    codPostal: z.string().min(1, 'Codul poștal este obligatoriu.'),
    alteDetalii: z.string().optional(),
  }),
  deliveryAddressId: z.string().optional(),
  delegate: z
    .object({
      name: z.string().optional(),
      idCardSeries: z.string().optional(),
      idCardNumber: z.string().optional(),
      vehiclePlate: z.string().optional(),
    })
    .optional(),
  lineItems: z
    .array(OrderLineItemInputSchema)
    .min(1, 'Comanda trebuie să conțină cel puțin un articol.'),
  deliveryType: z.string({
    required_error: 'Tipul livrării este obligatoriu.',
  }),
  estimatedVehicleType: z.string({
    required_error: 'Tipul de vehicul este obligatoriu.',
  }),
  estimatedTransportCount: z.number().int().positive().default(1),
  distanceInKm: z.number().optional(),
  travelTimeInMinutes: z.number().optional(),
  notes: z.string().optional(),
  recommendedShippingCost: z.number().nonnegative().default(0),
})
