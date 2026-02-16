'use server'

import { connectToDatabase } from '@/lib/db'
import ClientModel from '@/lib/db/modules/client/client.model'
import UserModel from '@/lib/db/modules/user/user.model'

// Aducem toți clienții (ID și Nume) pentru selector
export async function getClientsForSelector() {
  await connectToDatabase()
  const clients = await ClientModel.find({}, { _id: 1, name: 1 })
    .sort({ name: 1 })
    .lean()
  return JSON.parse(JSON.stringify(clients))
}

// Aducem toți utilizatorii activi (ID și Nume) - Fără filtrare de rol
export async function getAgentsForSelector() {
  await connectToDatabase()

  // Aducem toți userii activi, indiferent de rol
  const agents = await UserModel.find({ active: true }, { _id: 1, name: 1 })
    .sort({ name: 1 })
    .lean()

  return JSON.parse(JSON.stringify(agents))
}
