'use server'

import { connectToDatabase } from '../../..'
import Service from './service.model'
import { VatRateModel } from '../vat-rate/vatRate.model'
import { formatError } from '@/lib/utils'
import { SearchedService, ServiceInput, ServiceUpdateInput } from './types'
import { ServiceInputSchema, ServiceUpdateSchema } from './validator'
import { revalidatePath } from 'next/cache'
import { MongoId } from '@/lib/validator'

export async function getServices() {
  try {
    await connectToDatabase()
    const services = await Service.find({})
      .populate({ path: 'vatRate', model: VatRateModel })
      .sort({ name: 1 })
      .lean()

    return { success: true, data: JSON.parse(JSON.stringify(services)) }
  } catch (error) {
    console.error('Failed to get services:', error)
    return { success: false, message: formatError(error) }
  }
}
export async function createService(input: ServiceInput) {
  try {
    const data = ServiceInputSchema.parse(input)
    await connectToDatabase()
    const newService = await Service.create(data)

    revalidatePath('/admin/settings')

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newService)),
      message: 'Serviciul a fost adăugat cu succes.',
    }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}
export async function updateService(input: ServiceUpdateInput) {
  try {
    const { _id, ...updateData } = ServiceUpdateSchema.parse(input)
    await connectToDatabase()
    const updatedService = await Service.findByIdAndUpdate(_id, updateData, {
      new: true,
    })
    if (!updatedService) throw new Error('Serviciul nu a fost găsit.')
    revalidatePath('/admin/settings')
    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedService)),
      message: 'Serviciul a fost actualizat cu succes.',
    }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

export async function toggleServiceActiveState(serviceId: string) {
  try {
    MongoId.parse(serviceId)
    await connectToDatabase()

    const service = await Service.findById(serviceId)
    if (!service) throw new Error('Serviciul nu a fost găsit.')

    service.isActive = !service.isActive
    await service.save()

    revalidatePath('/admin/settings')
    return {
      success: true,
      message: `Statusul serviciului a fost modificat cu succes.`,
    }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}
export async function searchServices(
  searchTerm: string
): Promise<SearchedService[]> {
  try {
    await connectToDatabase()
    if (!searchTerm || searchTerm.trim().length < 2) return []

    const services = await Service.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { code: { $regex: searchTerm, $options: 'i' } },
      ],
      isActive: true,
    })
      .limit(10)
      .select('_id name code price unitOfMeasure vatRate')
      .lean()

    return services.map((service) => ({
      _id: service._id.toString(),
      name: service.name,
      code: service.code,
      price: service.price,
      unitOfMeasure: service.unitOfMeasure,
      vatRateId: service.vatRate.toString(),
    }))
  } catch (error) {
    console.error('Eroare la căutarea serviciilor:', error)
    return []
  }
}
export async function getActiveServices(
  category?: 'Serviciu' | 'Autorizatie'
): Promise<SearchedService[]> {
  try {
    await connectToDatabase()

    const filter: { isActive: boolean; category?: string } = { isActive: true }
    if (category) {
      filter.category = category    }

    const services = await Service.find(filter)
      .sort({ name: 1 })
      .select('_id name code price unitOfMeasure vatRate isPerDelivery')
      .lean()

    return services.map((service) => ({
      _id: service._id.toString(),
      name: service.name,
      code: service.code,
      price: service.price,
      unitOfMeasure: service.unitOfMeasure,
      vatRateId: service.vatRate.toString(),
      isPerDelivery: service.isPerDelivery || false,
    }))
  } catch (error) {
    console.error('Eroare la preluarea serviciilor active:', error)
    return []
  }
}

export async function getActiveCommonServices(): Promise<SearchedService[]> {
  return getActiveServices('Serviciu')
}

export async function getActivePermits(): Promise<SearchedService[]> {
  return getActiveServices('Autorizatie')
}
