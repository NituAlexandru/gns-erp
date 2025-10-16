'use server'

import { connectToDatabase } from '@/lib/db'
import DocumentCounter from './documentCounter.model'
import { ClientSession } from 'mongoose'

export async function generateNextDocumentNumber(
  seriesName: string
): Promise<number> {
  try {
    await connectToDatabase()

    const currentYear = new Date().getFullYear()

    const counter = await DocumentCounter.findOneAndUpdate(
      {
        seriesName: seriesName.toUpperCase(),
        year: currentYear,
      },
      {
        $inc: { currentNumber: 1 },
      },
      {
        new: true,
        upsert: true,
      }
    )

    if (!counter) {
      throw new Error('Could not find or create a counter for the series.')
    }

    return counter.currentNumber
  } catch (error: unknown) {
    console.error('Error generating next document number:', error)

    if (error instanceof Error) {
      throw new Error(
        `Failed to generate next document number: ${error.message}`
      )
    } else {
      throw new Error(
        'An unknown error occurred while generating document number.'
      )
    }
  }
}

/**
 * Generează un număr unic de comandă în formatul YYYYMMDDXXXX.
 * Folosește `generateNextDocumentNumber` pentru a obține secvența anuală.
 */
async function getNextOrderSequence(
  options: { session?: ClientSession } = {}
): Promise<number> {
  const currentYear = new Date().getFullYear()
  const counter = await DocumentCounter.findOneAndUpdate(
    { seriesName: 'ORDER', year: currentYear },
    { $inc: { currentNumber: 1 } },
    { new: true, upsert: true, session: options.session }
  )
  if (!counter) {
    throw new Error('Nu s-a putut genera numărul secvențial pentru comandă.')
  }
  return counter.currentNumber
}

export async function generateOrderNumber(
  options: { session?: ClientSession } = {}
): Promise<string> {
  const nextSequence = await getNextOrderSequence(options)
  const now = new Date()
  const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const paddedSequence = String(nextSequence).padStart(4, '0')
  return `${datePrefix}${paddedSequence}`
}
