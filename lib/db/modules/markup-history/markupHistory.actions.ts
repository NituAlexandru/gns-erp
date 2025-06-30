import { revalidatePath } from 'next/cache'
import type { IMarkupHistoryDoc } from './types'
import {
  MarkupHistoryCreateSchema,
  MarkupHistoryUpdateSchema,
} from './validator'
import MarkupHistoryModel from './markupHistory.model'
import { formatError } from '@/lib/utils'

export async function createMarkupHistory(data: unknown) {
  try {
    const payload = MarkupHistoryCreateSchema.parse(data)
    const doc = await MarkupHistoryModel.create(payload)
    // Dacă ai o pagină care afișează istoricul mark-up‐urilor:
    revalidatePath('/admin/markup-history')
    return { success: true, record: doc as IMarkupHistoryDoc }
  } catch (err) {
    return { success: false, message: formatError(err) }
  }
}

export async function updateMarkupHistory(data: unknown) {
  try {
    const { _id, ...rest } = MarkupHistoryUpdateSchema.parse(data)
    const doc = await MarkupHistoryModel.findByIdAndUpdate(_id, rest, {
      new: true,
    })
    revalidatePath('/admin/markup-history')
    return { success: !!doc, record: doc as IMarkupHistoryDoc | null }
  } catch (err) {
    return { success: false, message: formatError(err) }
  }
}

export async function deleteMarkupHistory(id: string) {
  const doc = await MarkupHistoryModel.findByIdAndDelete(id)
  revalidatePath('/admin/markup-history')
  return { success: !!doc }
}

export async function listMarkupHistory() {
  return await MarkupHistoryModel.find().lean<IMarkupHistoryDoc[]>()
}

export async function getMarkupHistoryById(id: string) {
  return await MarkupHistoryModel.findById(id).lean<IMarkupHistoryDoc>()
}
