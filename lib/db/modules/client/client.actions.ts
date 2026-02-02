'use server'

import { connectToDatabase } from '@/lib/db'
import ClientModel from './client.model'
import { ClientCreateSchema, ClientUpdateSchema } from './validator'
import type { IClientCreate, IClientDoc, IClientUpdate } from './types'
import { revalidatePath } from 'next/cache'
import { PAGE_SIZE } from '@/lib/constants'
import { logAudit } from '../audit-logs/audit.actions'
import { ClientWithSummary } from './summary/client-summary.model'
import { getClientSummary } from './summary/client-summary.actions'
import { FilterQuery } from 'mongoose'

// Creează client
export async function createClient(
  data: IClientCreate,
  userId: string,
  userName: string,
  ip?: string,
  userAgent?: string,
) {
  const payload = ClientCreateSchema.parse(data)
  await connectToDatabase()

  const clientData = {
    ...payload,
    createdBy: {
      userId,
      name: userName,
    },
  }

  const client = await ClientModel.create(clientData)
  revalidatePath('/clients')

  // 2) Logăm audit
  await logAudit(
    'Client',
    client._id,
    'create',
    userId,
    { after: client },
    ip,
    userAgent,
  )

  return { success: true, message: 'Client creat cu succes' }
}

export async function updateClient(
  data: IClientUpdate,
  userId: string,
  userName: string,
  ip?: string,
  userAgent?: string,
) {
  const payload = ClientUpdateSchema.parse(data)
  await connectToDatabase()

  const before = await ClientModel.findById(payload._id).lean()

  const updateData = {
    ...payload,
    _id: undefined,
    updatedBy: {
      userId,
      name: userName,
    },
  }

  const updated = await ClientModel.findByIdAndUpdate(payload._id, updateData, {
    new: true,
  }).lean()

  if (!updated) throw new Error('Client inexistent')
  revalidatePath('/clients')

  await logAudit(
    'Client',
    payload._id,
    'update',
    userId,
    { before, after: updated },
    ip,
    userAgent,
  )

  return { success: true, message: 'Client actualizat cu succes' }
}

// Șterge client
export async function deleteClient(
  id: string,
  userId: string,
  ip?: string,
  userAgent?: string,
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
export async function getClientById(id: string): Promise<ClientWithSummary> {
  await connectToDatabase()

  // Executăm ambele cereri în paralel (pentru viteză)
  const [doc, summary] = await Promise.all([
    ClientModel.findById(id).lean(),
    getClientSummary(id),
  ])

  if (!doc) throw new Error('Client inexistent')

  return {
    ...JSON.parse(JSON.stringify(doc)),
    summary: summary ? JSON.parse(JSON.stringify(summary)) : null,
  }
}

// Listă cu paginare (nici aici nu audităm)
export async function getAllClients({
  page = 1,
  limit = PAGE_SIZE,
  query = '',
}: {
  page?: number
  limit?: number
  query?: string
}): Promise<{
  data: IClientDoc[]
  totalPages: number
  total: number
  from: number
  to: number
}> {
  await connectToDatabase()
  const skip = (page - 1) * limit

  // 1. Construim Filtrul
  const filter: FilterQuery<typeof ClientModel> = {}

  if (query) {
    const regex = new RegExp(query, 'i')
    filter.$or = [
      { name: regex },
      { cnp: { $regex: query, $options: 'i' } },
      { vatId: { $regex: query, $options: 'i' } },
      { email: regex },
      { phone: regex },
    ]
  }

  // 2. Aplicăm filtrul la find și count
  const [data, total] = await Promise.all([
    ClientModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ClientModel.countDocuments(filter),
  ])

  return {
    data: JSON.parse(JSON.stringify(data)) as IClientDoc[],
    totalPages: Math.ceil(total / limit),
    total,
    from: skip + 1,
    to: skip + data.length,
  }
}
export async function getClientByCode(code: string) {
  await connectToDatabase()
  const client = await ClientModel.findOne({
    $or: [{ cnp: code }, { vatId: code }, { _id: code }],
  }).lean()

  if (!client) return null
  return JSON.parse(JSON.stringify(client)) as IClientDoc
}
// pentru ORDER
export type SearchedClient = {
  _id: string
  name: string
  vatId: string
}
type LeanClientForSearch = Pick<IClientDoc, '_id' | 'name' | 'vatId' | 'cnp'>

export async function searchClients(
  searchTerm: string,
): Promise<SearchedClient[]> {
  try {
    await connectToDatabase()

    const trimmedSearchTerm = searchTerm.trim()

    if (!trimmedSearchTerm || trimmedSearchTerm.length < 2) {
      // console.log('[DEBUG] Termen prea scurt, se returnează array gol.')
      return []
    }

    const query = {
      $or: [
        { name: { $regex: trimmedSearchTerm, $options: 'i' } },
        { vatId: { $regex: trimmedSearchTerm, $options: 'i' } },
        { cnp: { $regex: trimmedSearchTerm, $options: 'i' } },
      ],
    }

    let queryResult: LeanClientForSearch[] = []
    try {
      queryResult = (await ClientModel.find(query)
        .select('_id name vatId cnp')
        .lean()) as unknown as LeanClientForSearch[]
    } catch (dbError) {
      console.error('[DEBUG] A CRĂPAT INTEROGAREA LA BAZA DE DATE!', dbError)
      throw dbError
    }

    const results: SearchedClient[] = queryResult.map((client) => {
      return {
        _id: client._id.toString(),
        name: client.name || 'Nume lipsă',
        vatId: client.vatId || client.cnp || '',
      }
    })

    return results
  } catch (error) {
    console.error('EROARE MAJORĂ în funcția searchClients:', error)
    return []
  }
}

async function updateAddressStatus(
  clientId: string,
  addressId: string,
  isActive: boolean,
) {
  await connectToDatabase()

  const result = await ClientModel.updateOne(
    { _id: clientId, 'deliveryAddresses._id': addressId },
    { $set: { 'deliveryAddresses.$.isActive': isActive } },
  )

  if (result.matchedCount === 0) {
    throw new Error('Adresa nu a fost găsită sau nu aparține acestui client.')
  }

  revalidatePath(`/clients/${clientId}`)
  revalidatePath(`/clients/${clientId}/edit`)

  return {
    success: true,
    message: `Adresa a fost ${isActive ? 'reactivată' : 'dezactivată'} cu succes.`,
  }
}

export async function deactivateDeliveryAddress(
  clientId: string,
  addressId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
) {
  return updateAddressStatus(clientId, addressId, false)
}

export async function reactivateDeliveryAddress(
  clientId: string,
  addressId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
) {
  return updateAddressStatus(clientId, addressId, true)
}
