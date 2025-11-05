import { z } from 'zod'

export const SeriesSchema = z.object({
  name: z
    .string()
    .min(1, 'Numele seriei este obligatoriu.')
    .max(10, 'Numele seriei poate avea maxim 10 caractere.'),
  documentType: z.enum([
    'Aviz',
    'Proforma',
    'Factura',
    'FacturaStorno',
    'NIR',
    'Chitanta',
    'BonConsum',
    'DispozitiePlata',
    'NotaRetur',
  ]),
})
