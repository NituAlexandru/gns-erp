'use server'

import { connectToDatabase } from '@/lib/db'
import PackagingModel from './packaging.model'
import { revalidatePath } from 'next/cache'
import { formatError } from '@/lib/utils'
import { IPackagingDoc, IPackagingInput, IPackagingUpdate } from './types'
import { packagingUpdateZod, packagingZod } from './validator'
import { getGlobalHighestCostInStock } from '../inventory/pricing'

// Funcție helper similară cu cea de la Produse
async function checkForDuplicateCodes(payload: {
  productCode: string
  _id?: string
}) {
  const { productCode, _id } = payload
  const commonQuery = _id ? { _id: { $ne: _id } } : {}

  const existingPackaging = await PackagingModel.findOne({
    productCode,
    ...commonQuery,
  }).lean()
  if (existingPackaging) {
    return 'Acest cod de ambalaj este deja utilizat.'
  }
  return null // Nicio eroare
}

// CREATE
export async function createPackaging(data: IPackagingInput) {
  try {
    const payload = packagingZod.parse(data)
    await connectToDatabase()

    const duplicateError = await checkForDuplicateCodes(payload)
    if (duplicateError) {
      return { success: false, message: duplicateError }
    }

    await PackagingModel.create(payload)
    revalidatePath('/admin/packagings')
    return { success: true, message: 'Packaging created successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// UPDATE
export async function updatePackaging(data: IPackagingUpdate) {
  try {
    const payload = packagingUpdateZod.parse(data)
    await connectToDatabase()

    const duplicateError = await checkForDuplicateCodes(payload)
    if (duplicateError) {
      return { success: false, message: duplicateError }
    }

    await PackagingModel.findByIdAndUpdate(payload._id, payload)
    revalidatePath('/admin/packagings')
    return { success: true, message: 'Packaging updated successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// GET ONE BY ID
export async function getPackagingById(id: string): Promise<IPackagingDoc> {
  await connectToDatabase()
  const doc = await PackagingModel.findById(id).lean()
  if (!doc) throw new Error('Packaging not found')
  return JSON.parse(JSON.stringify(doc)) as IPackagingDoc
}

// DELETE
export async function deletePackaging(id: string) {
  try {
    await connectToDatabase()
    const res = await PackagingModel.findByIdAndDelete(id)
    if (!res) throw new Error('Packaging not found')
    revalidatePath('/admin/packagings')
    return { success: true, message: 'Packaging deleted successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

export async function updatePackagingAveragePurchasePrice(packagingId: string) {
  // 1. Calculăm cel mai mare cost din stocul curent
  const highestCost = await getGlobalHighestCostInStock(packagingId) // <-- Schimbă numele funcției aici

  // 2. Actualizăm câmpul pe documentul de ambalaj
  await PackagingModel.findByIdAndUpdate(packagingId, {
    averagePurchasePrice: highestCost, // Folosim noul cost
  })

  console.log(
    `Updated averagePurchasePrice for packaging ${packagingId} to HIGHEST cost: ${highestCost}`
  )
}
