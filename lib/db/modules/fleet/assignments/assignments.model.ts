import { Model, Schema, model, models } from 'mongoose'
import { IAssignmentDoc } from './types'
import { ASSIGNMENT_STATUSES } from './validator'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DriverModel from '../drivers/drivers.model'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import VehicleModel from '../vehicle/vehicle.model'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import TrailerModel from '../trailers/trailers.model'

const assignmentSchema = new Schema<IAssignmentDoc>(
  {
    name: { type: String, required: true },
    driverId: { ref: 'Driver', required: true, type: Schema.Types.ObjectId },
    vehicleId: { ref: 'Vehicle', required: true, type: Schema.Types.ObjectId },
    trailerId: { ref: 'Trailer', type: Schema.Types.ObjectId },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      required: true,
      default: 'Activ',
    },
    notes: { type: String },
    createdBy: {
      userId: { ref: 'User', required: true, type: Schema.Types.ObjectId },
      name: { type: String, required: true },
    },
    updatedBy: {
      userId: { ref: 'User', type: Schema.Types.ObjectId },
      name: { type: String },
    },
  },
  { timestamps: true }
)

assignmentSchema.index({ name: 1 })
assignmentSchema.index({ driverId: 1, status: 1 })
assignmentSchema.index({ vehicleId: 1, status: 1 })

const AssignmentModel: Model<IAssignmentDoc> =
  models.Assignment || model<IAssignmentDoc>('Assignment', assignmentSchema)

export default AssignmentModel
