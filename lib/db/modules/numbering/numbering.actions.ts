'use server'

import { connectToDatabase } from '@/lib/db'
import DocumentCounter from './documentCounter.model'

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
