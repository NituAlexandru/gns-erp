'use server'

import { connectToDatabase } from '../../..'
import Service from './service.model'
import { VatRateModel } from '../vat-rate/vatRate.model'
import { formatError } from '@/lib/utils'
import { ServiceInput, ServiceUpdateInput } from './types'
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
