'use server'

import { connectToDatabase } from '@/lib/db'
import InvoiceModel from '@/lib/db/modules/financial/invoices/invoice.model'
// FIX: Importăm numele corect al funcției (mapInvoiceToPdfData)
import { mapInvoiceToPdfData } from './mappers/map-invoice'
import { PdfDocumentData } from './printing.types'
import { mapDeliveryNoteToPdfData } from './mappers/map-delivery-note'
import DeliveryNoteModel from '../financial/delivery-notes/delivery-note.model'
import NirModel from '../financial/nir/nir.model'
import { mapNirToPdfData } from './mappers/map-nir'

// Tipul de răspuns standard
type PrintResult =
  | { success: true; data: PdfDocumentData }
  | { success: false; message: string }

export async function getPrintData(
  documentId: string,
  type: 'INVOICE' | 'DELIVERY_NOTE' | 'NIR' | 'RECEIPT'
): Promise<PrintResult> {
  try {
    await connectToDatabase()

    if (type === 'INVOICE') {
      // 1. Căutăm factura
      const invoice = await InvoiceModel.findById(documentId).lean()

      if (!invoice) {
        return { success: false, message: 'Factura nu a fost găsită.' }
      }

      // 2. Mapăm datele
      // FIX: Apelăm funcția cu numele corect
      const pdfData = mapInvoiceToPdfData(invoice as any)

      return { success: true, data: pdfData }
    }
    if (type === 'DELIVERY_NOTE') {
      const note = await DeliveryNoteModel.findById(documentId).lean()
      if (!note) return { success: false, message: 'Avizul nu a fost găsit.' }

      const pdfData = mapDeliveryNoteToPdfData(note as any) //
      return { success: true, data: pdfData }
    }
    if (type === 'NIR') {
      const nir = await NirModel.findById(documentId).lean()
      if (!nir) return { success: false, message: 'NIR-ul nu a fost găsit.' }

      const pdfData = mapNirToPdfData(nir as any)
      return { success: true, data: pdfData }
    }
    if (type === 'RECEIPT') {
      const ReceiptModel = (
        await import('@/lib/db/modules/financial/receipts/receipt.model')
      ).default
      const { mapReceiptToPdfData } = await import('./mappers/map-receipt')

      const receipt = await ReceiptModel.findById(documentId).lean()
      if (!receipt)
        return { success: false, message: 'Chitanța nu a fost găsită.' }

      const pdfData = mapReceiptToPdfData(receipt as any)
      return { success: true, data: pdfData }
    }
    return {
      success: false,
      message: `Tipul de document ${type} nu este implementat încă.`,
    }
  } catch (error) {
    console.error('Error fetching print data:', error)
    return {
      success: false,
      message: 'Eroare la generarea datelor pentru printare.',
    }
  }
}
