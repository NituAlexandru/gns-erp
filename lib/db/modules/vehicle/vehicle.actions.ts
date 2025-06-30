import { revalidatePath } from 'next/cache'
import { VehicleCreateSchema, VehicleUpdateSchema } from './validator'
import VehicleModel from './vehicle.model'
import { IVehicleDoc } from './types'

// 1) Create
export async function createVehicle(data: unknown) {
  const vehicle = VehicleCreateSchema.parse(data)
  const doc = await VehicleModel.create(vehicle)
  // Dacă ai vreo pagină în app/ care listează vehicule, o revalidezi:
  revalidatePath('/vehicles')
  return { success: true, vehicle: doc as IVehicleDoc }
}

// 2) Update
export async function updateVehicle(data: unknown) {
  const { _id, ...rest } = VehicleUpdateSchema.parse(data)
  const doc = await VehicleModel.findByIdAndUpdate(_id, rest, { new: true })
  revalidatePath(`/vehicles/${_id}`)
  return { success: !!doc, vehicle: doc as IVehicleDoc | null }
}

// 3) Delete
export async function deleteVehicle(id: string) {
  const doc = await VehicleModel.findByIdAndDelete(id)
  revalidatePath('/vehicles')
  return { success: !!doc }
}

// 4) Fetch one
export async function getVehicleById(id: string) {
  const doc = await VehicleModel.findById(id).lean<IVehicleDoc>()
  return doc
}

// 5) List / paginate
export async function listVehicles() {
  const docs = await VehicleModel.find().lean<IVehicleDoc[]>()
  return docs
}
