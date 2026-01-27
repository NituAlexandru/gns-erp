'use server'

import { connectToDatabase } from '@/lib/db'
import DocumentCounter from './documentCounter.model'

// Aceasta este cheia internă. Utilizatorul NU o vede niciodată.
// O folosim doar ca să știe baza de date care e rândul cu numărul plăților.
const PAYMENT_COUNTER_KEY = 'SUPPLIER_PAYMENT_SEQ'

/**
 * 1. PEEK: Se uită care ar fi următorul număr, fără să îl consume.
 * Folosit pentru a pre-completa formularul din UI.
 */
export async function getNextPaymentNumberPreview(): Promise<string> {
  try {
    await connectToDatabase()
    const currentYear = new Date().getFullYear()

    // Căutăm contorul. Dacă nu există, înseamnă că suntem la 0.
    const counter = await DocumentCounter.findOne({
      seriesName: PAYMENT_COUNTER_KEY,
      year: currentYear,
    })

    const nextVal = counter ? counter.currentNumber + 1 : 1

    // Returnăm formatat: 00001
    return String(nextVal).padStart(5, '0')
  } catch (error) {
    console.error('Err getting payment number preview:', error)
    return ''
  }
}

/**
 * 2. CONSUME: Incrementează efectiv numărul în baza de date.
 * Folosit doar la SAVE, și doar dacă utilizatorul a păstrat numărul automat.
 */
export async function incrementPaymentNumber() {
  try {
    await connectToDatabase()
    const currentYear = new Date().getFullYear()

    // Găsește și incrementează (sau creează dacă e primul pe anul ăsta)
    const counter = await DocumentCounter.findOneAndUpdate(
      {
        seriesName: PAYMENT_COUNTER_KEY,
        year: currentYear,
      },
      { $inc: { currentNumber: 1 } },
      { new: true, upsert: true },
    )

    return counter.currentNumber
  } catch (error) {
    console.error('Err incrementing payment number:', error)
    throw new Error('Eroare la generarea numărului de plată.')
  }
}
