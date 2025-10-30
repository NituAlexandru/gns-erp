'use server'

import { connectToDatabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import {
  AssignmentCreateSchema,
  AssignmentUpdateSchema,
  ASSIGNMENT_STATUSES,
} from './validator'

import type {
  IAssignmentDoc,
  IAssignmentInput,
  IPopulatedAssignmentDoc,
} from './types'
import { logAudit } from '../../audit-logs/audit.actions'
import AssignmentModel from './assignments.model'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DriverModel from '../drivers/drivers.model'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import VehicleModel from '../vehicle/vehicle.model'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import TrailerModel from '../trailers/trailers.model'

import '../drivers/drivers.model'
import '../vehicle/vehicle.model'
import '../trailers/trailers.model'

const REVALIDATE_PATH = '/admin/management/fleet/assignments'

export async function createAssignment(
  data: IAssignmentInput,
  userId: string,
  userName: string
) {
  const payload = AssignmentCreateSchema.parse(data)
  await connectToDatabase()

  const assignmentData = { ...payload, createdBy: { userId, name: userName } }
  const newAssignment = await AssignmentModel.create(assignmentData)

  revalidatePath(REVALIDATE_PATH)
  await logAudit('Assignment', newAssignment._id, 'create', userId, {
    after: newAssignment,
  })

  return { success: true, message: 'Ansamblu creat cu succes.' }
}

export async function updateAssignment(
  data: IAssignmentInput & { _id: string },
  userId: string,
  userName: string
) {
  const payload = AssignmentUpdateSchema.parse(data)
  await connectToDatabase()

  const before = await AssignmentModel.findById(payload._id).lean()
  if (!before) throw new Error('Ansamblul nu a fost găsit.')

  const updateData = {
    ...payload,
    _id: undefined,
    updatedBy: { userId, name: userName },
  }
  const updatedAssignment = await AssignmentModel.findByIdAndUpdate(
    payload._id,
    updateData,
    { new: true }
  ).lean()

  revalidatePath(REVALIDATE_PATH)

  await logAudit('Assignment', payload._id, 'update', userId, {
    before,
    after: updatedAssignment,
  })

  return { success: true, message: 'Ansamblu actualizat cu succes.' }
}

export async function deleteAssignment(id: string, userId: string) {
  await connectToDatabase()

  const before = await AssignmentModel.findById(id).lean()
  if (!before) throw new Error('Ansamblul nu a fost găsit.')

  await AssignmentModel.findByIdAndDelete(id)
  revalidatePath(REVALIDATE_PATH)

  await logAudit('Assignment', id, 'delete', userId, { before })

  return { success: true, message: 'Ansamblu șters cu succes.' }
}

export async function getAssignmentById(id: string): Promise<IAssignmentDoc> {
  await connectToDatabase()
  const doc = await AssignmentModel.findById(id)
    .populate('driverId')
    .populate('vehicleId')
    .populate('trailerId')
    .lean()
  if (!doc) throw new Error('Ansamblu inexistent')
  return JSON.parse(JSON.stringify(doc)) as IAssignmentDoc
}

export async function getAllAssignments() {
  await connectToDatabase()
  const docs = await AssignmentModel.find()

    .populate('driverId')
    .populate('vehicleId')
    .populate('trailerId')
    .sort({ name: 1 })
    .lean()
  return JSON.parse(JSON.stringify(docs)) as IAssignmentDoc[]
}

export async function updateAssignmentStatus(
  assignmentId: string,
  newStatus: (typeof ASSIGNMENT_STATUSES)[number],
  userId: string,
  userName: string
) {
  await connectToDatabase()

  if (!ASSIGNMENT_STATUSES.includes(newStatus)) {
    throw new Error('Status invalid.')
  }

  const before = await AssignmentModel.findById(assignmentId).lean()
  if (!before) throw new Error('Ansamblul nu a fost găsit.')

  const updateData = {
    status: newStatus,
    updatedBy: { userId, name: userName },
  }

  const after = await AssignmentModel.findByIdAndUpdate(
    assignmentId,
    updateData,
    { new: true }
  ).lean()

  revalidatePath(REVALIDATE_PATH)
  await logAudit('Assignment', assignmentId, 'update', userId, {
    before,
    after,
  })

  return { success: true, message: 'Status actualizat cu succes.' }
}

// for deliveries
export async function getActiveAssignments(): Promise<
  IPopulatedAssignmentDoc[]
> {
  try {
    await connectToDatabase()

    const assignments = await AssignmentModel.find({
      status: 'Activ', // Filtrăm doar ansamblurile active
    })
      .populate<{ driverId: IPopulatedAssignmentDoc['driverId'] }>({
        path: 'driverId',
        select: 'name phone drivingLicenses', // Selectăm doar câmpurile necesare
      })
      .populate<{ vehicleId: IPopulatedAssignmentDoc['vehicleId'] }>({
        path: 'vehicleId',
        select: 'name carNumber carType maxLoadKg', // Selectăm câmpurile necesare
      })
      .populate<{ trailerId: IPopulatedAssignmentDoc['trailerId'] }>({
        path: 'trailerId',
        select: 'name licensePlate maxLoadKg', // Selectăm câmpurile necesare
      })
      .sort({ name: 1 }) // Ordonăm alfabetic după numele ansamblului
      .lean()

    return JSON.parse(JSON.stringify(assignments))
  } catch (error) {
    console.error('Eroare la preluarea ansamblurilor active:', error)
    return []
  }
}
