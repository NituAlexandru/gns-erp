import { Schema, model, models, Document, Types } from 'mongoose'

export interface IAgentClientList extends Document {
  agentId: Types.ObjectId
  clientIds: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const agentClientListSchema = new Schema<IAgentClientList>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    clientIds: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
  },
  { timestamps: true },
)

const AgentClientListModel =
  models.AgentClientList ||
  model<IAgentClientList>('AgentClientList', agentClientListSchema)

export default AgentClientListModel
