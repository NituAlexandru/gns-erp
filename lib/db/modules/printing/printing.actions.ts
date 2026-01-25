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
import { mapClientLedgerToPdfData } from './mappers/map-client-ledger'
import {
  getClientLedger,
  getClientSummary,
} from '../client/summary/client-summary.actions'
import ClientModel from '../client/client.model'
import { getSetting } from '../setting/setting.actions'
import {
  getSupplierLedger,
  getSupplierSummary,
} from '../suppliers/summary/supplier-summary.actions'
import { mapSupplierLedgerToPdfData } from './mappers/map-supplier-ledger'
import Supplier from '../suppliers/supplier.model'

// Tipul de răspuns standard
type PrintResult =
  | { success: true; data: PdfDocumentData }
  | { success: false; message: string }

export async function getPrintData(
  documentId: string,
  type:
    | 'INVOICE'
    | 'DELIVERY_NOTE'
    | 'NIR'
    | 'RECEIPT'
    | 'CLIENT_LEDGER'
    | 'SUPPLIER_LEDGER',
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
    if (type === 'CLIENT_LEDGER') {
      const client = await ClientModel.findById(documentId).lean()
      if (!client) return { success: false, message: 'Client inexistent.' }

      const settings = await getSetting()
      if (!settings) return { success: false, message: 'Setări firmă lipsă.' }

      const [ledgerResult, summaryData] = await Promise.all([
        getClientLedger(documentId),
        getClientSummary(documentId),
      ])

      // Verificăm Ledger (are format { success, data })
      if (!ledgerResult.success) {
        return {
          success: false,
          message: `Eroare Fișă: ${ledgerResult.message}`,
        }
      }

      // Verificăm Sumar (returnează direct datele sau null)
      if (!summaryData) {
        return {
          success: false,
          message: 'Eroare Sumar: Nu s-a putut găsi sumarul clientului.',
        }
      }

      // Mapăm datele (ATENȚIE: trimitem summaryData direct)
      const pdfData = mapClientLedgerToPdfData(
        client as any,
        settings as any,
        ledgerResult.data,
        summaryData,
      )

      return { success: true, data: pdfData }
    }
    if (type === 'SUPPLIER_LEDGER') {
      const supplier = await Supplier.findById(documentId).lean()

      if (!supplier) return { success: false, message: 'Furnizor inexistent.' }

      const settings = await getSetting()
      if (!settings) return { success: false, message: 'Setări firmă lipsă.' }

      const [ledgerResult, summaryData] = await Promise.all([
        getSupplierLedger(documentId),
        getSupplierSummary(documentId),
      ])

      if (!ledgerResult.success) {
        return {
          success: false,
          message: `Eroare Fișă: ${ledgerResult.message}`,
        }
      }

      if (!summaryData) {
        return {
          success: false,
          message: 'Eroare Sumar: Nu s-a putut găsi sumarul furnizorului.',
        }
      }

      const pdfData = mapSupplierLedgerToPdfData(
        supplier as any,
        settings as any,
        ledgerResult.data,
        summaryData,
      )

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
