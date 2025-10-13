'use server'

import { connectToDatabase } from '../..'
import VehicleModel from './vehicle/vehicle.model'

/**
 * @description Prelucrează o listă unică cu tipurile de vehicule din parcul auto.
 * @returns Un array de string-uri, ex: ['Camionetă (sub 3.5t)', 'TIR Complet']
 */
export async function getUniqueVehicleTypes(): Promise<string[]> {
  try {
    await connectToDatabase()
    const vehicleTypes = await VehicleModel.distinct('carType')
    return vehicleTypes.filter(Boolean)
  } catch (error) {
    console.error('Eroare la preluarea tipurilor de vehicule:', error)
    return []
  }
}
