import { revalidatePath } from 'next/cache'
import DeliveryModel from './delivery.model'
import { DeliveryCreateSchema, DeliveryUpdateSchema } from './validator'
import type { IDeliveryDoc } from './types'
import { formatError } from '@/lib/utils'

export async function createDelivery(data: unknown) {
  try {
    const payload = DeliveryCreateSchema.parse(data)
    const doc = await DeliveryModel.create(payload)
    revalidatePath('/deliveries')
    return { success: true, delivery: doc as IDeliveryDoc }
  } catch (err) {
    return { success: false, message: formatError(err) }
  }
}

export async function updateDelivery(data: unknown) {
  try {
    const { _id, ...rest } = DeliveryUpdateSchema.parse(data)
    const doc = await DeliveryModel.findByIdAndUpdate(_id, rest, {
      new: true,
    })
    revalidatePath(`/deliveries/${_id}`)
    return { success: !!doc, delivery: doc as IDeliveryDoc | null }
  } catch (err) {
    return { success: false, message: formatError(err) }
  }
}

export async function deleteDelivery(id: string) {
  const doc = await DeliveryModel.findByIdAndDelete(id)
  revalidatePath('/deliveries')
  return { success: !!doc }
}

export async function getDeliveryById(id: string) {
  return await DeliveryModel.findById(id).lean<IDeliveryDoc>()
}

export async function listDeliveries() {
  return await DeliveryModel.find().lean<IDeliveryDoc[]>()
}
