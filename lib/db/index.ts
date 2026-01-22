import mongoose from 'mongoose'

// 1. Încercăm să luăm variabila de pe global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached = (global as any).mongoose

// 2. Doar dacă NU există, o inițializăm ȘI o salvăm pe global
if (!cached) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cached = (global as any).mongoose = { conn: null, promise: null }
}

export const connectToDatabase = async (
  MONGODB_ERP_URI = process.env.MONGODB_ERP_URI,
) => {
  if (cached.conn) {
    // Mesaj pentru conexiunea din cache
    console.log('🟢 [DB] Folosesc conexiunea existentă (CACHE). /db/index.ts')
    return cached.conn
  }

  if (!MONGODB_ERP_URI) throw new Error('MONGODB_ERP_URI is missing')

  if (!cached.promise) {
    console.log('🟡 [DB] Se inițiază o conexiune NOUĂ.../db/index.ts')

    cached.promise = mongoose.connect(MONGODB_ERP_URI).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

// Cod vechi functional

// import mongoose from 'mongoose'

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// const cached = (global as any).mongoose || { conn: null, promise: null }

// export const connectToDatabase = async (
//   MONGODB_ERP_URI = process.env.MONGODB_ERP_URI,
// ) => {
//   if (cached.conn) return cached.conn

//   if (!MONGODB_ERP_URI) throw new Error('MONGODB_ERP_URI is missing')

//   cached.promise = cached.promise || mongoose.connect(MONGODB_ERP_URI)

//   cached.conn = await cached.promise

//   return cached.conn
// }
