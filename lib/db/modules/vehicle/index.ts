export type {
  IVehicleInput,
  IVehicleDoc,
  IVehicleAllocationInput,
} from './types'

export {
  VehicleCreateSchema,
  VehicleUpdateSchema,
  VehicleAllocationSchema,
} from './validator'

export { default as VehicleModel } from './vehicle.model'
export * from './constants'

export * from './vehicle.actions'
