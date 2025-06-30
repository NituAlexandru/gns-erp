// lib/modules/client/index.ts

// 1) Tipuri TS
export * from './types'

// 2) Scheme Zod pentru validare
export * from './validator'

// 3) Funcțiile de business (server‐actions)
export * from './client.actions'

// 4) Modelul Mongoose
export { default as ClientModel } from './client.model'
