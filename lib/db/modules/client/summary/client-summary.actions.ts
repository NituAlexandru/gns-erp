'use server'

import { connectToDatabase } from '@/lib/db'
import Client from '../client.model'
import ClientSummary from './client-summary.model'
import mongoose from 'mongoose'

export async function findOrCreateClientSummary(clientId: string) {
  await connectToDatabase()
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    throw new Error('ID Client invalid')
  }

  try {
    let summary = await ClientSummary.findOne({ clientId })

    if (!summary) {
      const client = await Client.findById(clientId)
      if (!client) throw new Error('Clientul nu a fost găsit.')

      summary = await ClientSummary.create({
        clientId,
        creditLimit: 0,
        availableCredit: 0,
      })
    }

    return JSON.parse(JSON.stringify(summary))
  } catch (error) {
    let errorMessage = 'A apărut o eroare necunoscută.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Eroare la findOrCreateClientSummary: ${errorMessage}`)
    throw new Error('Nu s-a putut găsi sau crea sumarul pentru client.')
  }
}

export async function getClientSummary(clientId: string) {
  await connectToDatabase()
  if (!mongoose.Types.ObjectId.isValid(clientId)) return null

  try {
    const summary = await ClientSummary.findOne({ clientId })
    if (!summary) {
      return await findOrCreateClientSummary(clientId)
    }
    return JSON.parse(JSON.stringify(summary))
  } catch (error) {
    let errorMessage = 'A apărut o eroare necunoscută.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Eroare la getClientSummary: ${errorMessage}`)
    return null
  }
}

export async function recalculateClientSummary(clientId: string) {
  await connectToDatabase()
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    throw new Error('ID Client invalid')
  }

  try {
    // TODO: Aici va veni logica de agregare a datelor din modulele de Facturi, Plăți, etc.
    // Când vom avea modulul de facturare, vom adăuga aici codul care calculează soldurile.

    // Exemplu de date placeholder până implementăm logica reală
    const updatedSummaryData = {
      outstandingBalance: 0,
      overdueBalance: 0,
    }

    const updatedSummary = await ClientSummary.findOneAndUpdate(
      { clientId },
      { $set: updatedSummaryData },
      { new: true, upsert: true }
    )

    console.log(`Sumarul pentru clientul ${clientId} a fost recalculat.`)
    return JSON.parse(JSON.stringify(updatedSummary))
  } catch (error) {
    let errorMessage = 'A apărut o eroare necunoscută.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Eroare la recalculateClientSummary: ${errorMessage}`)
    throw new Error('Nu s-a putut recalcula sumarul pentru client.')
  }
}
