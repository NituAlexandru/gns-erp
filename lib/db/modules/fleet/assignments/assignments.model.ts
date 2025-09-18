import { Model, Schema, model, models } from 'mongoose'
import { IAssignmentDoc } from './types'
import { ASSIGNMENT_STATUSES } from './validator'

const assignmentSchema = new Schema<IAssignmentDoc>(
  {
    driverId: { ref: 'Driver', required: true },
    vehicleId: { ref: 'Vehicle', required: true },
    trailerId: { ref: 'Trailer' },

    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },

    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      required: true,
      default: 'Activ',
    },
    notes: { type: String },

    createdBy: {
      userId: { ref: 'User', required: true },
      name: { type: String, required: true },
    },
    updatedBy: {
      userId: { ref: 'User' },
      name: { type: String },
    },
  },
  { timestamps: true }
)

assignmentSchema.index({ driverId: 1, status: 1 })
assignmentSchema.index({ vehicleId: 1, status: 1 })

const AssignmentModel: Model<IAssignmentDoc> =
  models.Assignment || model<IAssignmentDoc>('Assignment', assignmentSchema)

export default AssignmentModel
