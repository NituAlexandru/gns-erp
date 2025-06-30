'use server'

import { connectToDatabase } from '@/lib/db'
import ReceptionModel from './reception.model'
import type { IReceptionInput } from './types'
import { ReceptionCreateSchema, ReceptionUpdateSchema } from './validator'

export async function createReception(data: IReceptionInput) {
  const payload = ReceptionCreateSchema.parse(data)
  await connectToDatabase()
  await ReceptionModel.create(payload)
  return { success: true, message: 'Recepție creată cu succes' }
}

export async function updateReception(data: IReceptionInput & { _id: string }) {
  const payload = ReceptionUpdateSchema.parse(data)
  await connectToDatabase()
  await ReceptionModel.findByIdAndUpdate(payload._id, payload)
  return { success: true, message: 'Recepție actualizată cu succes' }
}

export async function getReceptionById(id: string) {
  await connectToDatabase()
  const rec = await ReceptionModel.findById(id).lean()
  if (!rec) throw new Error('Recepție inexistentă')
  return JSON.parse(JSON.stringify(rec))
}
