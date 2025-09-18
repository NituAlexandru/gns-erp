import { z } from 'zod'

// Constante pentru a standardiza opțiunile
export const DRIVING_LICENSE_CATEGORIES = [
  'B', // Autovehicule sub 3.5 tone
  'BE', // Ansamblu: vehicul B + remorcă grea
  'C1', // Camion mic: 3.5 - 7.5 tone
  'C1E', // Ansamblu: vehicul C1 + remorcă grea
  'C', // Camion mare: peste 3.5 tone (fără limită superioară)
  'CE', // Ansamblu: vehicul C + remorcă grea (TIR / Articulat)
  'D1', // Microbuz: 9-16 locuri
  'D1E', // Ansamblu: vehicul D1 + remorcă grea
  'D', // Autobuz: peste 8 locuri
  'DE', // Ansamblu: vehicul D + remorcă grea (Autobuz articulat)
  'Tr', // Tractor agricol sau forestier
] as const
export const CERTIFICATION_TYPES = [
  // Atestate ARR (Autoritatea Rutieră Română)
  'CPI Marfă', // Atestat inițial pentru transport marfă (obligatoriu pentru șoferii noi)
  'CPC Marfă', // Atestat de pregătire continuă (reînnoire la 5 ani)
  'ADR Colete', // Atestat pentru transport mărfuri periculoase în colete
  'ADR Cisterne', // Atestat pentru transport mărfuri periculoase în cisterne
  'ADR Clasa 1 (Explozibili)', // Specializare ADR pentru materiale explozibile
  'ADR Clasa 7 (Radioactive)', // Specializare ADR pentru materiale radioactive
  'Atestat Transport Agabaritic', // Pentru transporturi cu dimensiuni/greutate depășite
  'Atestat Transport Valori', // Pentru transporturi de valori (bani, etc.)

  // Certificări ISCIR (emise de Inspecția de Stat pentru Controlul Cazanelor...)
  'Atestat Macaragiu', // Pentru operarea legală a macaralelor
  'Atestat Stivuitorist', // Pentru operarea legală a stivuitoarelor
] as const
export const DRIVER_STATUSES = ['Activ', 'Inactiv', 'Concediu'] as const

// Schema de bază
const BaseDriverSchema = z.object({
  name: z.string().min(3, 'Numele complet este obligatoriu'),
  phone: z.string().min(10, 'Numărul de telefon este obligatoriu'),
  email: z.string().email('Adresa de email este invalidă').optional(),
  employmentDate: z.coerce.date().optional(),
  status: z.enum(DRIVER_STATUSES).default('Activ'),
  drivingLicenses: z.array(z.enum(DRIVING_LICENSE_CATEGORIES)).default([]),
  certifications: z.array(z.enum(CERTIFICATION_TYPES)).default([]),
  notes: z.string().optional(),
})

export const DriverCreateSchema = BaseDriverSchema
export const DriverUpdateSchema = BaseDriverSchema.extend({
  _id: z.string().min(1, 'ID-ul este necesar'),
})
