'use server'

import { connectToDatabase } from '@/lib/db'
import { createNir } from './nir.actions'
import { CreateNirInput } from './nir.validator'
import { round2, round6 } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { Types } from 'mongoose'
import SupplierInvoiceModel from '../treasury/payables/supplier-invoice.model'
import DeliveryNoteModel from '../delivery-notes/delivery-note.model'

// -------------------------------------------------------------
// 1. SEARCH DELIVERY NOTES (Pentru Modal)
// -------------------------------------------------------------
export async function searchDeliveryNotesForStorno(query: string) {
  try {
    await connectToDatabase()

    // Căutăm avize care:
    // 1. NU sunt facturate clasic (către client)
    // 2. NU sunt deja stornate prin furnizor
    // 3. Se potrivesc cu textul căutat (Serie sau Număr)
    const regex = new RegExp(query, 'i')

    const notes = await DeliveryNoteModel.find({
      $and: [
        { isInvoiced: false },
        { isStornoInvoicedBySupplier: { $ne: true } },
        { status: { $ne: 'CANCELLED' } }, // Să nu fie anulate
        {
          $or: [
            { noteNumber: regex },
            { seriesName: regex },
            { deliveryNumberSnapshot: regex }, // Poate caută după livrare
          ],
        },
      ],
    })
      .select('_id seriesName noteNumber items totals clientSnapshot createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    // Formatăm pentru UI
    return {
      success: true,
      data: notes.map((n: any) => ({
        _id: n._id.toString(),
        number: `${n.seriesName} ${n.noteNumber}`,
        date: n.createdAt,
        client: n.clientSnapshot?.name || 'Necunoscut', // Aici Clientul e de fapt Furnizorul la care ai trimis marfa
        total: n.totals?.grandTotal || 0,
        itemsCount: n.items?.length || 0,
      })),
    }
  } catch (error: any) {
    console.error('Error searching delivery notes:', error)
    return { success: false, message: error.message }
  }
}

// -------------------------------------------------------------
// 2. SEARCH SUPPLIER INVOICES (Pentru Modal)
// -------------------------------------------------------------
export async function searchSupplierInvoicesForStorno(query: string) {
  try {
    await connectToDatabase()

    const regex = new RegExp(query, 'i')

    const invoices = await SupplierInvoiceModel.find({
      $or: [
        { invoiceNumber: regex },
        { invoiceSeries: regex },
        { 'supplierSnapshot.name': regex },
      ],
    })
      .select(
        '_id invoiceSeries invoiceNumber invoiceDate supplierSnapshot totals',
      )
      .sort({ invoiceDate: -1 })
      .limit(20)
      .lean()

    return {
      success: true,
      data: invoices.map((inv: any) => ({
        _id: inv._id.toString(),
        number: `${inv.invoiceSeries} ${inv.invoiceNumber}`,
        date: inv.invoiceDate,
        supplier: inv.supplierSnapshot?.name || 'Necunoscut',
        total: inv.totals?.grandTotal || 0,
      })),
    }
  } catch (error: any) {
    console.error('Error searching supplier invoices:', error)
    return { success: false, message: error.message }
  }
}

// -------------------------------------------------------------
// 3. LOAD DATA FROM DELIVERY NOTE (Conversie Negativă)
// -------------------------------------------------------------
export async function loadNirDataFromDeliveryNote(deliveryNoteId: string) {
  try {
    await connectToDatabase()

    const note: any = await DeliveryNoteModel.findById(deliveryNoteId).lean()
    if (!note) throw new Error('Avizul nu a fost găsit.')

    // Mapăm produsele cu CANTITĂȚI NEGATIVE
    const items = note.items.map((item: any) => {
      // Negăm cantitatea
      const negQty = -1 * Math.abs(item.quantity)
      const price = item.priceAtTimeOfOrder || 0 // Prețul rămâne pozitiv

      // Recalculăm valorile negative
      const lineNet = round2(negQty * price)
      const vatRate = item.vatRateDetails?.rate || 0
      const lineVat = round2(lineNet * (vatRate / 100))
      const lineTotal = round2(lineNet + lineVat)

      return {
        // Nu avem receptionLineId
        stockableItemType: item.stockableItemType || 'ERPProduct',
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,

        unitMeasure: item.unitOfMeasure,

        // Date "document"
        documentQuantity: negQty,
        quantity: negQty, // Cantitatea recepționată (negativă)
        quantityDifference: 0,

        invoicePricePerUnit: round6(price),
        vatRate: vatRate,

        distributedTransportCostPerUnit: 0,
        landedCostPerUnit: round6(price),

        lineValue: lineNet,
        lineVatValue: lineVat,
        lineTotal: lineTotal,
      }
    })

    // Calculăm totalurile negative
    const subtotal = items.reduce((sum: number, i: any) => sum + i.lineValue, 0)
    const vatTotal = items.reduce(
      (sum: number, i: any) => sum + i.lineVatValue,
      0,
    )
    const grandTotal = items.reduce(
      (sum: number, i: any) => sum + i.lineTotal,
      0,
    )

    // Returnăm structura parțială pentru formular
    return {
      success: true,
      data: {
        supplierId: '', // Userul trebuie să îl confirme manual sau îl luăm din aviz dacă avem mapare
        supplierSnapshot: {
          name: note.clientSnapshot?.name, // În aviz, destinatarul e Furnizorul
          cui: note.clientSnapshot?.cui,
          regCom: note.clientSnapshot?.regCom,
          address: {
            // Mapăm adresa din snapshot
            judet: note.clientSnapshot?.judet || '',
            localitate: note.deliveryAddress?.localitate || '',
            strada: note.deliveryAddress?.strada || '',
            numar: note.deliveryAddress?.numar || '',
            codPostal: note.deliveryAddress?.codPostal || '',
            tara: 'RO',
            alteDetalii: note.deliveryAddress?.alteDetalii,
          },
        },
        items: items,
        totals: {
          productsSubtotal: round2(subtotal),
          productsVat: round2(vatTotal),
          packagingSubtotal: 0,
          packagingVat: 0,
          transportSubtotal: 0,
          transportVat: 0,
          subtotal: round2(subtotal),
          vatTotal: round2(vatTotal),
          grandTotal: round2(grandTotal),
          totalEntryValue: round2(subtotal),
        },
      },
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// -------------------------------------------------------------
// 4. CREATE STORNO NIR (Action Final)
// -------------------------------------------------------------
export async function createStornoNirAndLink(
  nirData: CreateNirInput & { userId: string; userName: string },
  deliveryNoteId: string,
  supplierInvoiceId?: string, // Opțional
) {
  try {
    await connectToDatabase()

    // 1. Creăm NIR-ul
    const nirResult = await createNir(nirData)

    if (!nirResult.success) {
      throw new Error(nirResult.message)
    }

    const nirDoc = nirResult.data
    const supplierName = nirData.supplierSnapshot.name || 'Furnizor'

    // 2. Construim textul notei pentru Aviz
    let noteToAdd = `Storno operat prin NIR ${nirDoc.nirNumber}` // Default simplu dacă nu ai factură

    // Dacă avem ID de factură, o căutăm ca să îi luăm Seria și Numărul
    if (supplierInvoiceId) {
      const inv = await SupplierInvoiceModel.findById(supplierInvoiceId).select(
        'invoiceSeries invoiceNumber',
      )

      if (inv) {
        // AICI ESTE FORMATUL CERUT DE TINE:
        const invoiceNumberStr = `${inv.invoiceSeries} ${inv.invoiceNumber}`
        noteToAdd = `Facturat prin factura furnizorului ${supplierName} - ${invoiceNumberStr} (NIR ${nirDoc.nirNumber})`
      }
    }

    // 3. Update AVIZ (Status + Note Append)
    await DeliveryNoteModel.findByIdAndUpdate(deliveryNoteId, [
      {
        $set: {
          status: 'INVOICED',
          isInvoiced: true,
          isStornoInvoicedBySupplier: true,
          supplierStornoInvoiceRef: supplierInvoiceId
            ? new Types.ObjectId(supplierInvoiceId)
            : null,

          // Adăugăm nota la sfârșitul notelor existente
          deliveryNotesSnapshot: {
            $concat: [
              { $ifNull: ['$deliveryNotesSnapshot', ''] },
              {
                $cond: [
                  { $eq: [{ $ifNull: ['$deliveryNotesSnapshot', ''] }, ''] },
                  '',
                  '\n',
                ],
              },
              noteToAdd, // Textul construit mai sus
            ],
          },
        },
      },
    ])

    // 4. Update FACTURĂ FURNIZOR (Dacă există) - Adăugăm notă și acolo
    if (supplierInvoiceId) {
      const invoiceNote = `Factura aferentă Aviz retur seria ${nirData.items[0]?.productName ? '...' : ''} (NIR ${nirDoc.nirNumber})`

      await SupplierInvoiceModel.findByIdAndUpdate(supplierInvoiceId, [
        {
          $set: {
            notes: {
              $concat: [
                { $ifNull: ['$notes', ''] },
                {
                  $cond: [{ $eq: [{ $ifNull: ['$notes', ''] }, ''] }, '', '\n'],
                },
                invoiceNote,
              ],
            },
          },
        },
      ])
    }

    revalidatePath('/admin/management/delivery-notes')
    revalidatePath('/financial/invoices/supplier')

    return { success: true, data: nirDoc }
  } catch (error: any) {
    console.error('Error createStornoNirAndLink:', error)
    return { success: false, message: error.message }
  }
}
