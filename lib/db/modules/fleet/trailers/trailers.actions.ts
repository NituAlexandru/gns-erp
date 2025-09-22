'use server'

import { connectToDatabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { TrailerCreateSchema, TrailerUpdateSchema } from './validator'
import type { ITrailerDoc, ITrailerInput } from './types'
import { logAudit } from '../../audit-logs/audit.actions'
import TrailerModel from './trailers.model'
import AssignmentModel from '../assignments/assignments.model'

const REVALIDATE_PATH = '/admin/fleet'

export async function createTrailer(
  data: ITrailerInput,
  userId: string,
  userName: string
) {
  const payload = TrailerCreateSchema.parse(data)
  await connectToDatabase()

  const trailerData = { ...payload, createdBy: { userId, name: userName } }
  const newTrailer = await TrailerModel.create(trailerData)

  revalidatePath(REVALIDATE_PATH)
  await logAudit('Trailer', newTrailer._id, 'create', userId, {
    after: newTrailer,
  })

  return { success: true, message: 'Remorcă creată cu succes.' }
}

export async function updateTrailer(
  data: ITrailerInput & { _id: string },
  userId: string,
  userName: string
) {
  const payload = TrailerUpdateSchema.parse(data)
  await connectToDatabase()

  const before = await TrailerModel.findById(payload._id).lean()
  if (!before) throw new Error('Remorca nu a fost găsită.')

  const updateData = {
    ...payload,
    _id: undefined,
    updatedBy: { userId, name: userName },
  }
  const updatedTrailer = await TrailerModel.findByIdAndUpdate(
    payload._id,
    updateData,
    { new: true }
  ).lean()

  revalidatePath(REVALIDATE_PATH)

  await logAudit('Trailer', payload._id, 'update', userId, {
    before,
    after: updatedTrailer,
  })

  return { success: true, message: 'Remorcă actualizată cu succes.' }
}

export async function deleteTrailer(id: string, userId: string) {
  await connectToDatabase()

  const before = await TrailerModel.findById(id).lean()
  if (!before) throw new Error('Remorca nu a fost găsită.')

  await TrailerModel.findByIdAndDelete(id)
  revalidatePath(REVALIDATE_PATH)

  await logAudit('Trailer', id, 'delete', userId, { before })

  return { success: true, message: 'Remorcă ștearsă cu succes.' }
}

export async function getTrailerById(id: string): Promise<ITrailerDoc> {
  await connectToDatabase()
  const doc = await TrailerModel.findById(id).lean()
  if (!doc) throw new Error('Remorcă inexistentă')
  return JSON.parse(JSON.stringify(doc)) as ITrailerDoc
}

export async function getAllTrailers() {
  await connectToDatabase()
  const docs = await TrailerModel.find().sort({ name: 1 }).lean()
  return JSON.parse(JSON.stringify(docs)) as ITrailerDoc[]
}

export async function getAvailableTrailers() {
  await connectToDatabase()
  const assignedTrailerIds = (
    await AssignmentModel.find({ status: 'Activ' }).select('trailerId')
  ).map((a) => a.trailerId)
  const availableTrailers = await TrailerModel.find({
    _id: { $nin: assignedTrailerIds },
  })
    .sort({ name: 1 })
    .lean()
  return JSON.parse(JSON.stringify(availableTrailers)) as ITrailerDoc[]
}
