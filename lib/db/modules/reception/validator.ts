import { z } from 'zod'
import { MongoId } from '@/lib/validator'
import { LocationOrProjectIdSchema } from '../inventory/validator'

export const TertiaryTransporterSchema = z.object({
  name: z.string().optional(),
  cui: z.string().optional(),
  regCom: z.string().optional(),
  address: z.string().optional(),
})
const QualityDetailsZod = z
  .object({
    lotNumbers: z.array(z.string()).optional(),
    certificateNumbers: z.array(z.string()).optional(),
    testReports: z.array(z.string()).optional(),
    additionalNotes: z.string().optional(),
  })
  .optional()
export const ReceptionProductSchema = z.object({
  product: MongoId,
  documentQuantity: z.number().nonnegative().optional(),
  originalDocumentQuantity: z.number().nonnegative().optional(),
  quantity: z.number().positive('Cantitatea trebuie să fie mai mare ca 0.'),
  unitMeasure: z.string().min(1),
  invoicePricePerUnit: z.number().nonnegative().nullable().optional(),
  unitMeasureCode: z.string().optional(),
  vatRate: z.coerce.number().nonnegative().default(0),
  qualityDetails: QualityDetailsZod,
})

export const ReceptionPackagingSchema = z.object({
  packaging: MongoId,
  documentQuantity: z.number().nonnegative().optional(),
  originalDocumentQuantity: z.number().nonnegative().optional(),
  quantity: z.number().positive('Cantitatea trebuie să fie mai mare ca 0.'),
  unitMeasure: z.string().min(1),
  unitMeasureCode: z.string().optional(),
  invoicePricePerUnit: z.number().nonnegative().nullable().optional(),
  vatRate: z.coerce.number().nonnegative().default(0),
  qualityDetails: QualityDetailsZod,
})

export const DeliverySchema = z.object({
  dispatchNoteSeries: z.string().optional(),
  dispatchNoteNumber: z.string().min(1, 'Numărul avizului este obligatoriu.'),
  dispatchNoteDate: z.coerce.date({
    required_error: 'Data avizului este obligatorie.',
  }),
  driverName: z.string().optional(),
  carNumber: z.string().optional(),
  notes: z.string().optional(),
  transportType: z.enum(['INTERN', 'EXTERN_FURNIZOR', 'TERT'], {
    required_error: 'Tipul transportului este obligatoriu.',
  }),
  transportCost: z
    .number()
    .nonnegative('Costul trebuie să fie un număr pozitiv.'),
  transportVatRate: z.coerce.number().nonnegative().default(0),
  transportVatValue: z.number().optional(),
  tertiaryTransporterDetails: TertiaryTransporterSchema.optional(),
})

export const InvoiceSchema = z.object({
  series: z.string().optional(),
  number: z.string().min(1, 'Numărul facturii este obligatoriu.'),
  date: z.coerce.date({ required_error: 'Data facturii este obligatorie.' }),
  dueDate: z.coerce.date().optional(),
  currency: z.enum(['RON', 'EUR', 'USD']).default('RON'),
  amount: z.number().nonnegative().nullable().optional(),
  vatRate: z.coerce.number().nonnegative().default(0),
  exchangeRateOnIssueDate: z.number().positive().optional(),
  vatValue: z.number().optional(),
  totalWithVat: z.number().optional(),
})

const BaseReceptionSchema = z.object({
  createdBy: MongoId,
  supplier: MongoId,
  destinationLocation: LocationOrProjectIdSchema.default('DEPOZIT'),
  destinationProject: MongoId.optional().nullable(),
  products: z.array(ReceptionProductSchema).optional(),
  packagingItems: z.array(ReceptionPackagingSchema).optional(),
  receptionDate: z.coerce.date().default(() => new Date()),
  deliveries: z.array(DeliverySchema).optional(),
  invoices: z.array(InvoiceSchema).optional(),
  // Placeholder-ele pentru Proiecte
  destinationType: z.enum(['DEPOZIT', 'PROIECT']).optional().default('DEPOZIT'),
  destinationId: MongoId.optional(),
  orderRef: MongoId.optional(),
})

export const ReceptionCreateSchema = BaseReceptionSchema.refine(
  (data) => data.products?.length || data.packagingItems?.length,
  {
    message: 'Recepția trebuie să conțină cel puțin un produs sau ambalaj.',
  }
).refine(
  (data) => {
    if (data.destinationType === 'PROIECT') {
      return !!data.destinationId
    }
    return true
  },
  {
    message:
      'ID-ul de Proiect este obligatoriu pentru destinația de tip PROIECT.',
    path: ['destinationId'],
  }
)

export const ReceptionUpdateSchema = BaseReceptionSchema.extend({
  _id: MongoId,
  status: z.enum(['DRAFT', 'CONFIRMAT']).optional(),
})
