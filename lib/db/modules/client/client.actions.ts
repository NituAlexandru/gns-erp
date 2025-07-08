'use server'

import { connectToDatabase } from '@/lib/db'
import ClientModel from './client.model'
import { ClientCreateSchema, ClientUpdateSchema } from './validator'
import type { IClientCreate, IClientDoc, IClientUpdate } from './types'
import { revalidatePath } from 'next/cache'
import { PAGE_SIZE } from '@/lib/constants'
import { logAudit } from '../audit-logs/audit.actions'

// Creează client
export async function createClient(
  data: IClientCreate,
  userId: string,
  ip?: string,
  userAgent?: string
) {
  const payload = ClientCreateSchema.parse(data)
  await connectToDatabase()

  // 1) Creăm clientul
  const client = await ClientModel.create(payload)
  revalidatePath('/clients')

  // 2) Logăm audit
  await logAudit(
    'Client',
    client._id,
    'create',
    userId,
    { after: client },
    ip,
    userAgent
  )

  return { success: true, message: 'Client creat cu succes' }
}

// Actualizează client
export async function updateClient(
  data: IClientUpdate,
  userId: string,
  ip?: string,
  userAgent?: string
) {
  const payload = ClientUpdateSchema.parse(data)
  await connectToDatabase()

  // 1) Salvăm starea înainte
  const before = await ClientModel.findById(payload._id).lean()
  // 2) Actualizăm
  const updated = await ClientModel.findByIdAndUpdate(
    payload._id,
    { ...payload, _id: undefined },
    { new: true }
  ).lean()
  if (!updated) throw new Error('Client inexistent')
  revalidatePath('/clients')

  // 3) Logăm audit
  await logAudit(
    'Client',
    payload._id,
    'update',
    userId,
    { before, after: updated },
    ip,
    userAgent
  )

  return { success: true, message: 'Client actualizat cu succes' }
}

// Șterge client
export async function deleteClient(
  id: string,
  userId: string,
  ip?: string,
  userAgent?: string
) {
  await connectToDatabase()

  // 1) Salvăm starea înainte
  const before = await ClientModel.findById(id).lean()
  const res = await ClientModel.findByIdAndDelete(id)
  if (!res) throw new Error('Client inexistent')
  revalidatePath('/clients')

  // 2) Logăm audit
  await logAudit('Client', id, 'delete', userId, { before }, ip, userAgent)

  return { success: true, message: 'Client șters cu succes' }
}

// Obține client după ID (nu audităm la citire)
export async function getClientById(id: string): Promise<IClientDoc> {
  await connectToDatabase()
  const doc = await ClientModel.findById(id).lean()
  if (!doc) throw new Error('Client inexistent')
  return JSON.parse(JSON.stringify(doc)) as IClientDoc
}

// Listă cu paginare (nici aici nu audităm)
export async function getAllClients({
  page = 1,
  limit = PAGE_SIZE,
}: {
  page?: number
  limit?: number
}): Promise<{
  data: IClientDoc[]
  totalPages: number
  total: number
  from: number
  to: number
}> {
  await connectToDatabase()
  const skip = (page - 1) * limit
  const total = await ClientModel.countDocuments()
  const data = await ClientModel.find()
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
  return {
    data: JSON.parse(JSON.stringify(data)) as IClientDoc[],
    totalPages: Math.ceil(total / limit),
    total,
    from: skip + 1,
    to: skip + data.length,
  }
}
