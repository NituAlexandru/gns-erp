import mongoose from 'mongoose'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cached = (global as any).mangoose || { conn: null, promise: null }

export const connectToDatabase = async (
  MONGODB_ERP_URI = process.env.MONGODB_ERP_URI
) => {
  if (cached.conn) return cached.conn

  if (!MONGODB_ERP_URI) throw new Error('MONGODB_ERP_URI is missing')

  cached.promise = cached.promise || mongoose.connect(MONGODB_ERP_URI)

  cached.conn = await cached.promise

  return cached.conn
}
