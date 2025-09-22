'use server'

import { connectToDatabase } from '@/lib/db'
import Supplier from '../supplier.model'
import SupplierSummary from './supplier-summary.model'
import mongoose from 'mongoose'

export async function findOrCreateSupplierSummary(supplierId: string) {
  await connectToDatabase()
  if (!mongoose.Types.ObjectId.isValid(supplierId)) {
    throw new Error('ID Furnizor invalid')
  }

  try {
    let summary = await SupplierSummary.findOne({ supplierId })

    if (!summary) {
      const supplier = await Supplier.findById(supplierId)
      if (!supplier) throw new Error('Furnizorul nu a fost găsit.')

      summary = await SupplierSummary.create({ supplierId })
    }

    return JSON.parse(JSON.stringify(summary))
  } catch (error) {
    let errorMessage = 'A apărut o eroare necunoscută.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Eroare la findOrCreateSupplierSummary: ${errorMessage}`)
    throw new Error('Nu s-a putut găsi sau crea sumarul pentru furnizor.')
  }
}

export async function getSupplierSummary(supplierId: string) {
  await connectToDatabase()
  if (!mongoose.Types.ObjectId.isValid(supplierId)) return null

  try {
    const summary = await SupplierSummary.findOne({ supplierId })
    if (!summary) {
      return await findOrCreateSupplierSummary(supplierId)
    }
    return JSON.parse(JSON.stringify(summary))
  } catch (error) {
    let errorMessage = 'A apărut o eroare necunoscută.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Eroare la getSupplierSummary: ${errorMessage}`)
    return null
  }
}

export async function recalculateSupplierSummary(supplierId: string) {
  await connectToDatabase()
  if (!mongoose.Types.ObjectId.isValid(supplierId)) {
    throw new Error('ID Furnizor invalid')
  }

  try {
    // TODO: Aici va veni logica de agregare a datelor de la facturile de achiziție.

    // Exemplu de date placeholder
    const updatedSummaryData = {
      paymentBalance: 0,
      overduePaymentBalance: 0,
    }

    const updatedSummary = await SupplierSummary.findOneAndUpdate(
      { supplierId },
      { $set: updatedSummaryData },
      { new: true, upsert: true }
    )

    console.log(`Sumarul pentru furnizorul ${supplierId} a fost recalculat.`)
    return JSON.parse(JSON.stringify(updatedSummary))
  } catch (error) {
    let errorMessage = 'A apărut o eroare necunoscută.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Eroare la recalculateSupplierSummary: ${errorMessage}`)
    throw new Error('Nu s-a putut recalcula sumarul pentru furnizor.')
  }
}
