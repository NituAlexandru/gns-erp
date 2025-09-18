'use server'

import { connectToDatabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import type { IDriverDoc, IDriverInput } from './types'
import { logAudit } from '../../audit-logs/audit.actions'
import DriverModel from './drivers.model'
import {
  DRIVER_STATUSES,
  DriverCreateSchema,
  DriverUpdateSchema,
} from './validator'

const REVALIDATE_PATH = '/admin/fleet'

export async function createDriver(
  data: IDriverInput,
  userId: string,
  userName: string
) {
  const payload = DriverCreateSchema.parse(data)
  await connectToDatabase()

  const driverData = { ...payload, createdBy: { userId, name: userName } }
  const newDriver = await DriverModel.create(driverData)

  revalidatePath(REVALIDATE_PATH)
  await logAudit('Driver', newDriver._id, 'create', userId, {
    after: newDriver,
  })

  return { success: true, message: 'Șofer creat cu succes.' }
}

export async function updateDriver(
  data: IDriverInput & { _id: string },
  userId: string,
  userName: string
) {
  const payload = DriverUpdateSchema.parse(data)
  await connectToDatabase()

  const before = await DriverModel.findById(payload._id).lean()
  if (!before) throw new Error('Șoferul nu a fost găsit.')

  const updateData = {
    ...payload,
    _id: undefined,
    updatedBy: { userId, name: userName },
  }
  const updatedDriver = await DriverModel.findByIdAndUpdate(
    payload._id,
    updateData,
    { new: true }
  ).lean()

  revalidatePath(REVALIDATE_PATH)

  await logAudit('Driver', payload._id, 'update', userId, {
    before,
    after: updatedDriver,
  })

  return { success: true, message: 'Șofer actualizat cu succes.' }
}

export async function deleteDriver(id: string, userId: string) {
  await connectToDatabase()

  const before = await DriverModel.findById(id).lean()
  if (!before) throw new Error('Șoferul nu a fost găsit.')

  await DriverModel.findByIdAndDelete(id)
  revalidatePath(REVALIDATE_PATH)

  await logAudit('Driver', id, 'delete', userId, { before })

  return { success: true, message: 'Șofer șters cu succes.' }
}

export async function getDriverById(id: string): Promise<IDriverDoc> {
  await connectToDatabase()
  const doc = await DriverModel.findById(id).lean()
  if (!doc) throw new Error('Șofer inexistent')
  return JSON.parse(JSON.stringify(doc)) as IDriverDoc
}

export async function getAllDrivers() {
  await connectToDatabase()
  const docs = await DriverModel.find().sort({ name: 1 }).lean()
  return JSON.parse(JSON.stringify(docs)) as IDriverDoc[]
}

export async function updateDriverStatus(
  driverId: string,
  newStatus: (typeof DRIVER_STATUSES)[number],
  userId: string,
  userName: string
) {
  await connectToDatabase()

  // Validăm că statusul nou este unul permis
  if (!DRIVER_STATUSES.includes(newStatus)) {
    throw new Error('Status invalid.')
  }

  const before = await DriverModel.findById(driverId).lean()
  if (!before) throw new Error('Șoferul nu a fost găsit.')

  const updateData = {
    status: newStatus,
    updatedBy: { userId, name: userName },
  }

  const after = await DriverModel.findByIdAndUpdate(driverId, updateData, {
    new: true,
  }).lean()

  revalidatePath(REVALIDATE_PATH)
  await logAudit('Driver', driverId, 'update', userId, { before, after })

  return { success: true, message: 'Status actualizat cu succes.' }
}
