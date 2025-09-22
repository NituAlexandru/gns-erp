import { z } from 'zod'
import type { Document } from 'mongoose'
import { AssignmentCreateSchema } from './validator'
import { IDriverDoc } from '../drivers/types'
import { IVehicleDoc } from '../vehicle/types'
import { ITrailerDoc } from '../trailers/types'

type PopulatedDriver = {
  _id: string
  name: string
  phone: string
  drivingLicenses: string[]
}
type PopulatedVehicle = {
  _id: string
  name: string
  carNumber: string
  carType: string
}
type PopulatedTrailer = {
  _id: string
  name: string
  licensePlate: string
  type: string
}

export type IAssignmentInput = z.infer<typeof AssignmentCreateSchema>


export interface IAssignmentDoc
  extends Document,
    Omit<IAssignmentInput, 'driverId' | 'vehicleId' | 'trailerId'> {
  _id: string
  driverId: string | PopulatedDriver
  vehicleId: string | PopulatedVehicle
  trailerId?: string | PopulatedTrailer

  createdBy: {
    userId: string
    name: string
  }
  updatedBy?: {
    userId: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface IPopulatedAssignmentDoc
  extends Omit<IAssignmentDoc, 'driverId' | 'vehicleId' | 'trailerId'> {
  driverId: IDriverDoc
  vehicleId: IVehicleDoc
  trailerId?: ITrailerDoc | null
}
