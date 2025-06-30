import { Document, Model, model, models, Schema } from 'mongoose'
import { IUserInput } from './types'

export interface IUser extends Document, IUserInput {
  _id: string
  createdAt: Date
  updatedAt: Date
  email: string
  name: string
  role: string
  password: string
  image: string
  emailVerified: boolean
  phone?: string
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, required: true, default: 'User' },
    password: { type: String, default: '' },
    image: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },
    phone: { type: String, required: false, default: '' },
  },
  {
    timestamps: true,
  }
)

const User = (models.User as Model<IUser>) || model<IUser>('User', userSchema)

export default User
