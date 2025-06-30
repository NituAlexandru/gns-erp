'use server'

import { connectToDatabase } from '@/lib/db'
import ReturnClientModel from './returnClient.model'
import type { IReturnFromClientInput } from './types'
import {
  ReturnFromClientCreateSchema,
  ReturnFromClientUpdateSchema,
} from './validator'

type ReturnClientDTO = IReturnFromClientInput & {
  _id: string
  createdAt: string
  updatedAt: string
}

export async function createReturnFromClient(data: IReturnFromClientInput) {
  const payload = ReturnFromClientCreateSchema.parse(data)
  await connectToDatabase()
  await ReturnClientModel.create(payload)
  return { success: true, message: 'Return client creat cu succes' }
}

export async function updateReturnFromClient(
  data: IReturnFromClientInput & { _id: string }
) {
  const payload = ReturnFromClientUpdateSchema.parse(data)
  await connectToDatabase()
  await ReturnClientModel.findByIdAndUpdate(payload._id, payload)
  return { success: true, message: 'Return client actualizat cu succes' }
}

export async function getReturnFromClientById(
  id: string
): Promise<ReturnClientDTO> {
  await connectToDatabase()
  const doc = await ReturnClientModel.findById(id).lean()
  if (!doc) throw new Error('Return client inexistent')
  return JSON.parse(JSON.stringify(doc)) as ReturnClientDTO
}
