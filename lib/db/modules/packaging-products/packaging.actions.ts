'use server'

import { connectToDatabase } from '@/lib/db'
import PackagingModel from './packaging.model'
import { revalidatePath } from 'next/cache'
import { formatError } from '@/lib/utils'
import {
  IPackagingDoc,
  IPackagingInput,
  IPackagingUpdate,
  PackagingForOrderLine,
} from './types'
import { packagingUpdateZod, packagingZod } from './validator'
import { getGlobalHighestCostInStock } from '../inventory/pricing'
import { ClientSession, Types } from 'mongoose'

export async function addOrUpdateSupplierForPackaging(
  packagingId: string,
  supplierId: string,
  price: number,
  supplierProductCode: string | undefined,
  session: ClientSession
) {
  if (!packagingId || !supplierId) return

  // Căutăm ambalajul folosind sesiunea curentă
  const packaging = await PackagingModel.findById(packagingId).session(session)

  if (!packaging) {
    throw new Error(
      `Ambalajul cu ID ${packagingId} nu a fost găsit pentru actualizarea furnizorului.`
    )
  }

  const supplierObjectId = new Types.ObjectId(supplierId)

  // Căutăm dacă furnizorul există deja
  const existingSupplierIndex = packaging.suppliers.findIndex(
    (s) => s.supplier.toString() === supplierId
  )

  if (existingSupplierIndex > -1) {
    // UPDATE: Furnizor existent
    packaging.suppliers[existingSupplierIndex].lastPurchasePrice = price
    packaging.suppliers[existingSupplierIndex].updatedAt = new Date()

    if (supplierProductCode && supplierProductCode.trim() !== '') {
      packaging.suppliers[existingSupplierIndex].supplierProductCode =
        supplierProductCode
    }
  } else {
    // INSERT: Furnizor nou
    packaging.suppliers.push({
      supplier: supplierObjectId,
      lastPurchasePrice: price,
      supplierProductCode: supplierProductCode || '',
      isMain: packaging.suppliers.length === 0, // Primul devine main
      updatedAt: new Date(),
    })
  }

  await packaging.save({ session })
}
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
  const doc = await PackagingModel.findById(id)
    .populate('suppliers.supplier')
    .lean()
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

export async function getPackagingForOrderLine(
  packagingId: string
): Promise<PackagingForOrderLine | null> {
  try {
    await connectToDatabase()

    const packaging = await PackagingModel.findById(packagingId)
      .select(
        'name productCode packagingUnit weight volume length width height packagingQuantity'
      )
      .lean()

    if (!packaging) {
      return null
    }

    const result: PackagingForOrderLine = {
      _id: packaging._id.toString(),
      name: packaging.name,
      productCode: packaging.productCode,
      unit: packaging.packagingUnit || 'bucata',
      weight: packaging.weight,
      volume: packaging.volume,
      length: packaging.length,
      width: packaging.width,
      height: packaging.height,
      packagingUnit: packaging.packagingUnit,
      packagingQuantity: packaging.packagingQuantity,
      packagingOptions: [],
    }

    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    console.error(
      'Eroare la preluarea datelor de ambalaj pentru comandă:',
      error
    )
    throw new Error('Nu s-au putut prelua datele ambalajului.')
  }
}
