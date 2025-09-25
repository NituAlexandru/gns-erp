'use server'

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '../../index'
import Series from './series.model'
import { DocumentType } from './documentCounter.model'
import { SeriesSchema } from './validator'
import { z } from 'zod'

type UpdateSeriesInput = z.infer<typeof SeriesSchema> & { _id: string }

export async function createSeries(formData: {
  name: string
  documentType: DocumentType
}) {
  try {
    const validatedData = SeriesSchema.parse(formData)
    await connectToDatabase()

    const newSeries = await Series.create(validatedData)

    revalidatePath('/admin/settings')

    return {
      success: true,
      message: 'Seria a fost adăugată cu succes.',
      data: JSON.parse(JSON.stringify(newSeries)),
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('E11000 duplicate key error')) {
        return {
          success: false,
          message: 'Această serie există deja pentru acest tip de document.',
        }
      }
      return { success: false, message: error.message }
    }
    return { success: false, message: 'A apărut o eroare necunoscută.' }
  }
}

export async function updateSeries(data: UpdateSeriesInput) {
  try {
    const { _id, ...updateData } = data
    const validatedData = SeriesSchema.parse(updateData)
    await connectToDatabase()
    await Series.findByIdAndUpdate(_id, validatedData)
    revalidatePath('/admin/settings')
    return { success: true, message: 'Seria a fost actualizată cu succes.' }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('E11000 duplicate key error')) {
        return {
          success: false,
          message: 'Această serie există deja pentru acest tip de document.',
        }
      }
      return {
        success: false,
        message: `Eroare la actualizare: ${error.message}`,
      }
    }
    return {
      success: false,
      message: 'A apărut o eroare necunoscută la actualizare.',
    }
  }
}

export async function toggleSeriesActiveState(id: string) {
  try {
    await connectToDatabase()
    const series = await Series.findById(id)
    if (!series) {
      return { success: false, message: 'Seria nu a fost găsită.' }
    }
    await Series.findByIdAndUpdate(id, { isActive: !series.isActive })
    revalidatePath('/admin/settings')
    return { success: true, message: 'Statusul seriei a fost actualizat.' }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return {
        success: false,
        message: `Eroare la actualizarea statusului: ${error.message}`,
      }
    }
    return {
      success: false,
      message: 'A apărut o eroare necunoscută la actualizarea statusului.',
    }
  }
}

// de adaugat verificare ca sa nnu se stearga seriile folosite
export async function deleteSeries(id: string) {
  try {
    await connectToDatabase()
    await Series.findByIdAndDelete(id)
    revalidatePath('/admin/settings')
    return { success: true, message: 'Seria a fost ștearsă.' }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return {
        success: false,
        message: `Eroare la ștergerea seriei: ${error.message}`,
      }
    }
    return {
      success: false,
      message: 'A apărut o eroare necunoscută la ștergerea seriei.',
    }
  }
}

export async function getSeries() {
  try {
    await connectToDatabase()
    const currentYear = new Date().getFullYear()

    const seriesWithCounters = await Series.aggregate([
      //  Sortează seriile pentru consistență
      { $sort: { createdAt: -1 } },

      //  "Uneste" (JOIN) cu colectia DocumentCounter
      {
        $lookup: {
          from: 'documentcounters', // Numele colectiei in MongoDB 
          let: { seriesName: '$name' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$seriesName', '$$seriesName'] },
                    { $eq: ['$year', currentYear] },
                  ],
                },
              },
            },
          ],
          as: 'counterInfo',
        },
      },

      // Extrage numarul curent din array-ul returnat de $lookup
      {
        $addFields: {
          currentNumber: {
            $ifNull: [{ $arrayElemAt: ['$counterInfo.currentNumber', 0] }, 0],
          },
        },
      },

      // Sterge campul temporar 'counterInfo'
      {
        $project: {
          counterInfo: 0,
        },
      },
    ])

    return JSON.parse(JSON.stringify(seriesWithCounters))
  } catch (error) {
    console.error('Failed to fetch series with counters:', error)
    return []
  }
}
