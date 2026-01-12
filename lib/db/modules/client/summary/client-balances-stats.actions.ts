'use server'

import { connectToDatabase } from '@/lib/db'
// Ajustează calea către modelul Invoice conform proiectului tău
import InvoiceModel from '@/lib/db/modules/financial/invoices/invoice.model'

export async function getOverdueInvoicesCount(): Promise<number> {
  await connectToDatabase()

  try {
    const now = new Date()

    const count = await InvoiceModel.countDocuments({
      // Condiții pentru facturi restante:
      remainingAmount: { $gt: 0.01 }, // Mai au rest de plată
      dueDate: { $lt: now }, // Data scadenței a trecut
      status: { $nin: ['DRAFT', 'CANCELLED'] }, // Nu sunt ciorne sau anulate
      invoiceType: { $in: ['STANDARD', 'STORNO'] }, // Tipuri relevante
    })

    return count
  } catch (error) {
    console.error('Eroare la numărarea facturilor restante:', error)
    return 0
  }
}
