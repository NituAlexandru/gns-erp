'use server'

import { connectToDatabase } from '@/lib/db'
import ClientModel from './client.model'
import type { IClientCreate, IClientUpdate, IClientDoc } from './types'
import { ClientCreateSchema, ClientUpdateSchema } from './validator'

export async function createClient(data: IClientCreate) {
  const payload = ClientCreateSchema.parse(data)
  await connectToDatabase()
  await ClientModel.create(payload)
  return { success: true, message: 'Client creat cu succes' }
}

export async function updateClient(data: IClientUpdate) {
  const payload = ClientUpdateSchema.parse(data)
  await connectToDatabase()
  await ClientModel.findByIdAndUpdate(payload._id, payload)
  return { success: true, message: 'Client actualizat cu succes' }
}

export async function getClientById(id: string) {
  await connectToDatabase()
  const client = await ClientModel.findById(id).lean()
  if (!client) throw new Error('Client not found')
  return JSON.parse(JSON.stringify(client)) as IClientDoc
}
