'use server'

import { connectToDatabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { AssignmentCreateSchema, AssignmentUpdateSchema } from './validator'
import type { IAssignmentDoc, IAssignmentInput } from './types'
import { logAudit } from '../../audit-logs/audit.actions'
import AssignmentModel from './assignments.model'

const REVALIDATE_PATH = '/admin/fleet'

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

  return { success: true, message: 'Asignare creată cu succes.' }
}

export async function updateAssignment(
  data: IAssignmentInput & { _id: string },
  userId: string,
  userName: string
) {
  const payload = AssignmentUpdateSchema.parse(data)
  await connectToDatabase()

  const before = await AssignmentModel.findById(payload._id).lean()
  if (!before) throw new Error('Asignarea nu a fost găsită.')

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

  return { success: true, message: 'Asignare actualizată cu succes.' }
}

export async function deleteAssignment(id: string, userId: string) {
  await connectToDatabase()

  const before = await AssignmentModel.findById(id).lean()
  if (!before) throw new Error('Asignarea nu a fost găsită.')

  await AssignmentModel.findByIdAndDelete(id)
  revalidatePath(REVALIDATE_PATH)

  await logAudit('Assignment', id, 'delete', userId, { before })

  return { success: true, message: 'Asignare ștearsă cu succes.' }
}

export async function getAssignmentById(id: string): Promise<IAssignmentDoc> {
  await connectToDatabase()
  const doc = await AssignmentModel.findById(id).lean()
  if (!doc) throw new Error('Asignare inexistentă')
  return JSON.parse(JSON.stringify(doc)) as IAssignmentDoc
}

export async function getAllAssignments() {
  await connectToDatabase()
  const docs = await AssignmentModel.find()
    .populate('driverId', 'name')
    .populate('vehicleId', 'name carNumber')
    .populate('trailerId', 'name licensePlate')
    .sort({ createdAt: -1 })
    .lean()
  return JSON.parse(JSON.stringify(docs)) as IAssignmentDoc[]
}
