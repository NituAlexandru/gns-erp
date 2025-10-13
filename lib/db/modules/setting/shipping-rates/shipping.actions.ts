'use server'

import { connectToDatabase } from '../../..'
import { formatError } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import VehicleRate from './shipping.model'
import { VEHICLE_TEMPLATES } from '../../fleet/vehicle/constants'

export async function getShippingRates() {
  try {
    await connectToDatabase()

    const dbOperations = VEHICLE_TEMPLATES.map(async (template) => {
      const vehicleRate = await VehicleRate.findOneAndUpdate(
        { name: template.name },
        {
          $setOnInsert: { type: template.name, ratePerKm: template.ratePerKm },
        },
        {
          upsert: true,
          new: true,
          lean: true,
        }
      )
      return vehicleRate
    })

    const rates = await Promise.all(dbOperations)
    return { success: true, data: JSON.parse(JSON.stringify(rates)) }
  } catch (error) {
    console.error('Failed to get vehicle rates:', error)
    return { success: false, message: formatError(error) }
  }
}

export async function updateShippingRate(
  name: string,
  ratePerKm: number
): Promise<{ success: boolean; message: string }> {
  try {
    if (typeof ratePerKm !== 'number' || ratePerKm < 0) {
      throw new Error('Tariful trebuie să fie un număr pozitiv.')
    }

    await connectToDatabase()
    const updatedRate = await VehicleRate.findOneAndUpdate(
      { name: name },
      { $set: { ratePerKm: ratePerKm } },
      { new: true }
    )

    if (!updatedRate) {
      throw new Error('Tipul de vehicul nu a fost găsit.')
    }

    revalidatePath('/admin/settings')

    return {
      success: true,
      message: `Tariful pentru "${name}" a fost actualizat cu succes.`,
    }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}
