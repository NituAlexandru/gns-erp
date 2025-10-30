import { z } from 'zod'

export const ASSIGNMENT_STATUSES = ['Activ', 'Inactiv'] as const

const BaseAssignmentSchema = z.object({
  name: z.string().min(3, 'Numele ansamblului este obligatoriu.'),
  driverId: z.string().min(1, 'Trebuie să selectezi un șofer.'),
  vehicleId: z.string().min(1, 'Trebuie să selectezi un vehicul.'),
  trailerId: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  status: z.enum(ASSIGNMENT_STATUSES).default('Activ'),
  notes: z.string().optional(),
})

export const AssignmentCreateSchema = BaseAssignmentSchema
export const AssignmentUpdateSchema = BaseAssignmentSchema.extend({
  _id: z.string().min(1, 'ID-ul este necesar'),
})
