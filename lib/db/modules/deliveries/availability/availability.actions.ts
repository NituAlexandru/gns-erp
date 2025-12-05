'use server'

import { connectToDatabase } from '@/lib/db'
import FleetAvailabilityModel from './availability.model'
import { CreateBlockSchema, CreateBlockInput } from './validator'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { startOfDay, endOfDay } from 'date-fns'
import { Types } from 'mongoose'
import DeliveryModel from '../delivery.model'
import { DELIVERY_SLOTS } from '../constants'
import z from 'zod'

// Create Block
export async function createTimeBlock(data: CreateBlockInput) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Neautentificat')

    const validated = CreateBlockSchema.parse(data)

    validated.slots.sort(
      (a, b) => DELIVERY_SLOTS.indexOf(a) - DELIVERY_SLOTS.indexOf(b)
    )

    await connectToDatabase()

    const dayStart = startOfDay(validated.date)
    const dayEnd = endOfDay(validated.date)

    // 1. Verificăm dacă există deja un BLOCAJ (ITP/Service)
    const existingBlock = await FleetAvailabilityModel.findOne({
      assignmentId: validated.assignmentId,
      date: { $gte: dayStart, $lte: dayEnd },
      slots: { $in: validated.slots },
    })

    if (existingBlock) {
      return {
        success: false,
        message: 'Există deja o notiță pe acest interval.',
      }
    }

    // 2. Verificăm dacă există o LIVRARE (Delivery) pe acel slot
    // (Asta asigură că nu pui Service peste o Livrare existentă)
    const existingDelivery = await DeliveryModel.findOne({
      status: { $ne: 'CANCELLED' },
      assemblyId: new Types.ObjectId(validated.assignmentId),
      deliveryDate: { $gte: dayStart, $lte: dayEnd },
      $or: [
        { deliverySlots: { $in: validated.slots } }, // Suprapunere directă
        { deliverySlots: '08:00 - 17:00' }, // Suprapunere cu livrare "Toată Ziua"
      ],
    })

    if (existingDelivery) {
      return {
        success: false,
        message: `Există deja o livrare programată (${existingDelivery.deliveryNumber}) pe acest interval.`,
      }
    }

    await FleetAvailabilityModel.create({
      ...validated,
      createdBy: session.user.id,
      createdByName: session.user.name,
    })

    revalidatePath('/deliveries')
    return { success: true, message: 'Interval blocat cu succes.' }
  } catch (error) {
    console.error('Error creating block:', error)
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message }
    }
    return { success: false, message: 'Eroare la salvare.' }
  }
}

// Delete Block
export async function deleteTimeBlock(blockId: string) {
  try {
    await connectToDatabase()
    await FleetAvailabilityModel.findByIdAndDelete(blockId)
    revalidatePath('/deliveries')
    return { success: true, message: 'Blocaj șters.' }
  } catch {
    return { success: false, message: 'Eroare la ștergere.' }
  }
}

// Get Blocks for Date
export async function getBlocksForDate(date: Date) {
  try {
    await connectToDatabase()
    const blocks = await FleetAvailabilityModel.find({
      date: {
        $gte: startOfDay(date),
        $lte: endOfDay(date),
      },
    }).lean()
    return JSON.parse(JSON.stringify(blocks))
  } catch (error) {
    console.error(error)
    return []
  }
}
