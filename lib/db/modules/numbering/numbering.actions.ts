'use server'

import { connectToDatabase } from '@/lib/db'
import DocumentCounter from './documentCounter.model'
import { ClientSession } from 'mongoose'
import Series, { ISeries } from './series.model'

export async function generateNextDocumentNumber(
  seriesName: string,
  options: { session?: ClientSession } = {}
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
        session: options.session,
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

/**
 * Helper: Obține următorul număr secvențial pentru Comenzile Furnizor.
 * Funcționează identic cu getNextOrderSequence, dar pe cheia 'SUPPLIER_ORDER'.
 */
async function getNextSupplierOrderSequence(
  options: { session?: ClientSession } = {}
): Promise<number> {
  const currentYear = new Date().getFullYear()
  const counter = await DocumentCounter.findOneAndUpdate(
    { seriesName: 'SUPPLIER_ORDER', year: currentYear },
    { $inc: { currentNumber: 1 } },
    { new: true, upsert: true, session: options.session }
  )
  if (!counter) {
    throw new Error(
      'Nu s-a putut genera numărul secvențial pentru comanda furnizor.'
    )
  }
  return counter.currentNumber
}

/**
 * Generează numărul intern pentru Comanda Furnizor.
 * Format: XXXXYYYYMMDD (Secvență + Dată).
 */
export async function generateSupplierOrderNumber(
  options: { session?: ClientSession } = {}
): Promise<string> {
  const nextSequence = await getNextSupplierOrderSequence(options)
  const now = new Date()
  // Format Data: YYYYMMDD
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  // Format Secvență: 0001 (padat la 4)
  const paddedSequence = String(nextSequence).padStart(4, '0')
  // Returnăm: Secvența prima, apoi data (invers față de comanda client)
  return `${paddedSequence}${dateSuffix}`
}

// --- FUNCȚII PENTRU LIVRĂRI ---
async function getNextDeliverySequence(
  options: { session?: ClientSession } = {}
): Promise<number> {
  const currentYear = new Date().getFullYear()
  const counter = await DocumentCounter.findOneAndUpdate(
    { seriesName: 'DELIVERY', year: currentYear },
    { $inc: { currentNumber: 1 } },
    { new: true, upsert: true, session: options.session }
  )
  if (!counter) {
    throw new Error('Nu s-a putut genera numărul secvențial pentru livrare.')
  }
  return counter.currentNumber
}

export async function generateDeliveryNumber(
  orderNumber: string, // Primim numărul comenzii ca parametru
  options: { session?: ClientSession } = {}
): Promise<string> {
  const nextSequence = await getNextDeliverySequence(options)
  // Padăm la 5 cifre
  const paddedSequence = String(nextSequence).padStart(5, '0')
  // Format: 00001-NumarComanda
  return `${paddedSequence}-${orderNumber}`
}
/**
 * Returnează toate seriile ACTIVE pentru un anumit tip de document.
 * Ex: getActiveSeriesForDocumentType('Aviz')
 */
export async function getActiveSeriesForDocumentType(
  documentType: ISeries['documentType']
) {
  await connectToDatabase()

  const activeSeries = await Series.find({
    documentType,
    isActive: true,
  })
    .sort({ name: 1 })
    .lean()

  return JSON.parse(JSON.stringify(activeSeries))
}
