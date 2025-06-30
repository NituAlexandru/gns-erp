'use server'

import { connectToDatabase } from '@/lib/db'
import VatRateModel from './vatRate.model'
import type { IVatRateInput, IVatRateDoc } from './types'
import { VatRateCreateSchema, VatRateUpdateSchema } from './validator'

export async function createVatRate(data: IVatRateInput) {
  const payload = VatRateCreateSchema.parse(data)
  await connectToDatabase()
  await VatRateModel.create(payload)
  return { success: true, message: 'Cota TVA creată cu succes' }
}

export async function updateVatRate(data: IVatRateInput & { _id: string }) {
  const payload = VatRateUpdateSchema.parse(data)
  await connectToDatabase()
  await VatRateModel.findByIdAndUpdate(payload._id, {
    vatRate: payload.vatRate,
  })
  return { success: true, message: 'Cota TVA actualizată cu succes' }
}

export async function getVatRateById(id: string): Promise<IVatRateDoc> {
  await connectToDatabase()
  const doc = await VatRateModel.findById(id).lean()
  if (!doc) throw new Error('Cota TVA inexistentă')
  return JSON.parse(JSON.stringify(doc)) as IVatRateDoc
}
