import { VehicleCreateSchema, VehicleUpdateSchema } from './validator'
import VehicleModel from './vehicle.model'
import { IVehicleDoc, IVehicleInput } from './types'
import { connectToDatabase } from '@/lib/db'
import { logAudit } from '../../audit-logs/audit.actions'
import { revalidatePath } from 'next/cache'

const REVALIDATE_PATH = '/admin/fleet'

// 1) Create
export async function createVehicle(
  data: IVehicleInput,
  userId: string,
  userName: string
) {
  const payload = VehicleCreateSchema.parse(data)
  await connectToDatabase()

  const vehicleData = { ...payload, createdBy: { userId, name: userName } }
  const newVehicle = await VehicleModel.create(vehicleData)

  revalidatePath(REVALIDATE_PATH)
  await logAudit('Vehicle', newVehicle._id, 'create', userId, {
    after: newVehicle,
  })

  return { success: true, message: 'Vehicul creat cu succes.' }
}

export async function updateVehicle(
  data: IVehicleInput & { _id: string },
  userId: string,
  userName: string
) {
  const payload = VehicleUpdateSchema.parse(data)
  await connectToDatabase()

  const before = await VehicleModel.findById(payload._id).lean()
  if (!before) throw new Error('Vehiculul nu a fost găsit.')

  const updateData = {
    ...payload,
    _id: undefined,
    updatedBy: { userId, name: userName },
  }
  const updatedVehicle = await VehicleModel.findByIdAndUpdate(
    payload._id,
    updateData,
    { new: true }
  ).lean()

  revalidatePath(REVALIDATE_PATH)
  revalidatePath(`${REVALIDATE_PATH}/vehicles/${payload._id}`)

  await logAudit('Vehicle', payload._id, 'update', userId, {
    before,
    after: updatedVehicle,
  })

  return { success: true, message: 'Vehicul actualizat cu succes.' }
}

export async function deleteVehicle(id: string, userId: string) {
  await connectToDatabase()

  const before = await VehicleModel.findById(id).lean()
  if (!before) throw new Error('Vehiculul nu a fost găsit.')

  await VehicleModel.findByIdAndDelete(id)
  revalidatePath(REVALIDATE_PATH)

  await logAudit('Vehicle', id, 'delete', userId, { before })

  return { success: true, message: 'Vehicul șters cu succes.' }
}

export async function getVehicleById(id: string): Promise<IVehicleDoc> {
  await connectToDatabase()
  const doc = await VehicleModel.findById(id).lean()
  if (!doc) throw new Error('Vehicul inexistent')
  return JSON.parse(JSON.stringify(doc)) as IVehicleDoc
}

export async function getAllVehicles() {
  // Vom adăuga paginare ulterior, dacă e nevoie
  await connectToDatabase()
  const docs = await VehicleModel.find().sort({ name: 1 }).lean()
  return JSON.parse(JSON.stringify(docs)) as IVehicleDoc[]
}

// 5) List / paginate
export async function listVehicles() {
  const docs = await VehicleModel.find().lean<IVehicleDoc[]>()
  return docs
}
