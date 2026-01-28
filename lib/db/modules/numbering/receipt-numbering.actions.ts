'use server'

import { connectToDatabase } from '@/lib/db'
import DocumentCounter from './documentCounter.model'

const RECEIPT_COUNTER_KEY = 'CLIENT_RECEIPT_SEQ'

/**
 * 1. PEEK: Previzualizare număr (pentru UI)
 */
export async function getNextReceiptNumberPreview(): Promise<string> {
  try {
    await connectToDatabase()
    const currentYear = new Date().getFullYear()

    const counter = await DocumentCounter.findOne({
      seriesName: RECEIPT_COUNTER_KEY,
      year: currentYear,
    })

    const nextVal = counter ? counter.currentNumber + 1 : 1

    // Format: 00001
    return String(nextVal).padStart(5, '0')
  } catch (error) {
    console.error('Err getting receipt number preview:', error)
    return ''
  }
}

/**
 * 2. CONSUME: Incrementare efectivă (pentru Save)
 */
export async function incrementReceiptNumber() {
  try {
    await connectToDatabase()
    const currentYear = new Date().getFullYear()

    await DocumentCounter.findOneAndUpdate(
      {
        seriesName: RECEIPT_COUNTER_KEY,
        year: currentYear,
      },
      { $inc: { currentNumber: 1 } },
      { new: true, upsert: true },
    )
  } catch (error) {
    console.error('Err incrementing receipt number:', error)
    throw new Error('Eroare la generarea numărului de încasare.')
  }
}
