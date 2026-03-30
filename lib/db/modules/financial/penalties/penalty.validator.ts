import { z } from 'zod'

// Validare pentru salvarea unei liste de penalizare
export const SavePenaltyRuleSchema = z.object({
  id: z.string().optional(), // Folosit când edităm o listă existentă
  name: z.string().min(1, 'Numele listei este obligatoriu.'),
  percentagePerDay: z
    .number()
    .min(0, 'Procentul nu poate fi negativ.')
    .max(100, 'Procentul este prea mare.'),
  autoBillDays: z
    .number()
    .min(1, 'Termenul de emitere automată trebuie să fie de minim 1 zi.'),
  isDefault: z.boolean().default(false),
  clientIds: z.array(z.string()).default([]),
})

export type SavePenaltyRuleInput = z.infer<typeof SavePenaltyRuleSchema>

// Validare pentru salvarea regulii default (are mai puține câmpuri)
export const SaveDefaultPenaltyRuleSchema = z.object({
  percentagePerDay: z.number().min(0),
  autoBillDays: z.number().min(1),
})

export type SaveDefaultPenaltyRuleInput = z.infer<
  typeof SaveDefaultPenaltyRuleSchema
>

export const MarkPenaltyBilledSchema = z.object({
  invoiceId: z.string().min(1, 'Factura este obligatorie.'),
  clientId: z.string().min(1, 'Clientul este obligatoriu.'),
  periodEnd: z.date({ required_error: 'Data de final este obligatorie.' }),
  amountCalculated: z.number().min(0, 'Suma nu poate fi negativă.'),
  penaltyInvoiceId: z.string().optional(),
})

export type MarkPenaltyBilledInput = z.infer<typeof MarkPenaltyBilledSchema>
