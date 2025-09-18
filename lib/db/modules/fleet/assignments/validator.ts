import { z } from 'zod'

export const ASSIGNMENT_STATUSES = ['Activ', 'Inactiv'] as const

const BaseAssignmentSchema = z.object({
  driverId: z.string().min(1, 'Trebuie să selectezi un șofer.'),
  vehicleId: z.string().min(1, 'Trebuie să selectezi un vehicul.'),
  trailerId: z.string().optional(), // Remorca este opțională

  startDate: z.coerce.date({
    required_error: 'Data de început este obligatorie.',
  }),
  endDate: z.coerce.date().optional(),

  status: z.enum(ASSIGNMENT_STATUSES).default('Activ'),
  notes: z.string().optional(),
})

export const AssignmentCreateSchema = BaseAssignmentSchema
export const AssignmentUpdateSchema = BaseAssignmentSchema.extend({
  _id: z.string().min(1, 'ID-ul este necesar'),
})
