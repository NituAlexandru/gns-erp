'use server'

import { Types } from 'mongoose'
import { connectToDatabase } from '@/lib/db'
import AgentClientListModel from './agent-client-list.model'
import { revalidatePath } from 'next/cache'

// 1. GET ALL LISTS (Aducem toate configurările existente pentru a le afișa în Manager)
export async function getAllAgentLists() {
  try {
    await connectToDatabase()
    // Aducem listele și populăm doar numele agentului ca să știm a cui e lista
    const lists = await AgentClientListModel.find({})
      .populate('agentId', 'name email') // Populăm info despre agent
      .lean()

    return { success: true, data: JSON.parse(JSON.stringify(lists)) }
  } catch (error) {
    console.error('Error fetching agent lists:', error)
    return { success: false, message: 'Eroare la încărcarea listelor.' }
  }
}

// 2. SAVE LIST (Upsert - Create or Update pe un singur agent)
export async function saveAgentClientList(
  agentId: string,
  clientIds: string[],
) {
  try {
    await connectToDatabase()

    if (!agentId) throw new Error('Agentul este obligatoriu.')

    await AgentClientListModel.findOneAndUpdate(
      { agentId: new Types.ObjectId(agentId) },
      {
        $set: {
          clientIds: clientIds.map((c) => new Types.ObjectId(c)),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    revalidatePath('/admin/overview/agents')
    return { success: true, message: 'Lista agentului a fost salvată.' }
  } catch (error) {
    console.error('Error saving agent list:', error)
    return { success: false, message: 'Eroare la salvare.' }
  }
}

// 3. DELETE LIST (Dacă vrei să ștergi complet configurarea unui agent)
export async function deleteAgentList(agentId: string) {
  try {
    await connectToDatabase()
    await AgentClientListModel.findOneAndDelete({
      agentId: new Types.ObjectId(agentId),
    })

    revalidatePath('/admin/overview/agents')
    return { success: true, message: 'Configurarea a fost ștearsă.' }
  } catch (error) {
    return { success: false, message: 'Eroare la ștergere.' }
  }
}
