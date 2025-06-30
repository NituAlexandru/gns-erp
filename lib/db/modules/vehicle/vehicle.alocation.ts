import { Schema } from 'mongoose'

export const VehicleTypeSchema = new Schema(
  {
    name: { type: String, required: true },
    maxLoadKg: { type: Number, required: true },
    maxVolumeM3: { type: Number, required: true },
    lengthCm: { type: Number, required: true },
    widthCm: { type: Number, required: true },
    heightCm: { type: Number, required: true },
    ratePerKm: { type: Number, required: true },
  },
  { _id: false } // ca să nu creeze un _id pentru sub-schema
)

export const VehicleAllocationSchema = new Schema(
  {
    vehicle: { type: VehicleTypeSchema, required: true },
    trips: { type: Number, required: true },
    totalCost: { type: Number, required: true },
  },
  { _id: false }
)
// export const VehicleAllocationSchema = z.object({
//   //   vehicle: z.object({
//   //     name: z.string(),
//   //     maxLoadKg: z.number(),
//   //     maxVolumeM3: z.number(),
//   //     lengthCm: z.number(),
//   //     widthCm: z.number(),
//   //     heightCm: z.number(),
//   //     ratePerKm: z.number(),
//   //   }),
//   //   trips: z
//   //     .number()
//   //     .int({ message: 'Numărul de curse trebuie să fie un număr întreg' })
//   //     .positive({ message: 'Numărul de curse trebuie să fie un număr pozitiv' }),
//   //   totalCost: z.number(),
//   // })
