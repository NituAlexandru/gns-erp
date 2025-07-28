// types.ts

import { IInventoryItemDoc } from './inventory.model'
import { IStockMovementDoc } from './movement.model'

/**
 * Reprezintă un obiect simplu (DTO - Data Transfer Object) pentru un articol
 * din stoc, așa cum ar fi trimis către client (browser), fără metodele Mongoose.
 */
export type InventoryItemDTO = Omit<
  IInventoryItemDoc,
  keyof Document | 'product'
> & {
  _id: string
  product: string // Suprascriem product pentru a fi un string simplu
}

/**
 * Reprezintă un obiect simplu (DTO) pentru o mișcare de stoc,
 * așa cum ar fi trimis către client (browser).
 */
export type StockMovementDTO = Omit<
  IStockMovementDoc,
  keyof Document | 'product'
> & {
  _id: string
  product: string // Suprascriem product pentru a fi un string simplu
}

// Nu mai este nevoie să definim aici tipurile de input.
// Acestea vor fi importate direct din './validator.ts' unde sunt definite cu Zod.
// Exemplu: import { StockMovementInput } from './validator'
