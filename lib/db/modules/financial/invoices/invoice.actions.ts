'use server'

import mongoose, { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
// Am scos 'round2', nu mai e necesar aici
import { getSetting } from '../../setting/setting.actions'
import { generateNextDocumentNumber } from '../../numbering/numbering.actions'
import DeliveryNoteModel, {
  IDeliveryNoteDoc,
  // Am scos 'IDeliveryNoteLine'
} from '../delivery-notes/delivery-note.model'
import InvoiceModel, { IInvoiceDoc } from './invoice.model'
import {
  InvoiceActionResult,
  // Am scos 'InvoiceLineInput' și 'InvoiceTotals'
  CompanySnapshot,
  ClientSnapshot,
  InvoiceInput,
} from './invoice.types'
import { ISettingInput } from '../../setting/types'
import { IClientDoc } from '../../client/types'
import ClientModel from '../../client/client.model'
import { connectToDatabase } from '@/lib/db'
import {
  calculateInvoiceTotals,
  updateRelatedDocuments,
} from './invoice.helpers'
import { round2 } from '@/lib/utils'

function buildCompanySnapshot(settings: ISettingInput): CompanySnapshot {
  const defaultEmail = settings.emails.find((e) => e.isDefault)
  const defaultPhone = settings.phones.find((p) => p.isDefault)
  const defaultBank = settings.bankAccounts.find((b) => b.isDefault)

  if (!defaultEmail || !defaultPhone || !defaultBank) {
    throw new Error(
      'Setările implicite (email, telefon, bancă) nu sunt configurate.'
    )
  }
  return {
    name: settings.name,
    cui: settings.cui,
    regCom: settings.regCom,
    address: settings.address,
    email: defaultEmail.address,
    phone: defaultPhone.number,
    bank: defaultBank.bankName,
    iban: defaultBank.iban,
    currency: defaultBank.currency,
  }
}

/**
 * Găsește toate avizele livrate și nefacturate pentru un client specific,
 * filtrate după o anumită adresă de livrare (șantier).
 */
export async function getUninvoicedDeliveryNotes(
  clientId: string,
  deliveryAddressId: string
) {
  try {
    await connectToDatabase()

    if (
      !mongoose.Types.ObjectId.isValid(clientId) ||
      !mongoose.Types.ObjectId.isValid(deliveryAddressId)
    ) {
      throw new Error('ID-ul clientului sau al adresei este invalid.')
    }

    const notes = await DeliveryNoteModel.find({
      clientId: new Types.ObjectId(clientId),
      deliveryAddressId: new Types.ObjectId(deliveryAddressId),
      status: 'DELIVERED',
      isInvoiced: false,
    })
      .sort({ createdAt: 1 })
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(notes)) as IDeliveryNoteDoc[],
    }
  } catch (error) {
    console.error('❌ Eroare getUninvoicedDeliveryNotes:', error)
    return { success: false, message: (error as Error).message }
  }
}
/**
 * Primește datele complete din formular și noul status
 */
export async function createInvoice(
  data: InvoiceInput,
  status: 'CREATED'
): Promise<InvoiceActionResult> {
  const session = await startSession()
  try {
    let newInvoice: IInvoiceDoc | null = null

    await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      // 2. Preluare Setări Companie (Snapshot)
      const companySettings = await getSetting()
      if (!companySettings)
        throw new Error('Setările companiei nu sunt configurate.')
      const companySnapshot = buildCompanySnapshot(companySettings)

      // 3. Preluare Snapshot Client (Proaspăt)
      const client = (await ClientModel.findById(data.clientId)
        .lean()
        .session(session)) as IClientDoc | null
      if (!client) throw new Error('Clientul nu a fost găsit.')

      const clientSnapshot: ClientSnapshot = {
        name: client.name,
        cui: client.vatId || client.cnp || '',
        regCom: client.nrRegComert || '',
        address: {
          judet: client.address.judet,
          localitate: client.address.localitate,
          strada: client.address.strada,
          numar: client.address.numar || '',
          codPostal: client.address.codPostal,
          tara: client.address.tara || 'RO',
          alteDetalii: client.address.alteDetalii || '',
        },
        bank: client.bankAccountLei?.bankName || '',
        iban: client.bankAccountLei?.iban || '',
      }

      // 4. Recalculare Totaluri (pe Server)
      // Folosim datele din formular 'data.items' ca sursă a adevărului
      const totals = calculateInvoiceTotals(data.items)

      // 5. Generare Număr Factură (Atomic)
      const year = data.invoiceDate.getFullYear()
      const nextSeq = await generateNextDocumentNumber(data.seriesName, {
        session,
      })
      const invoiceNumber = `${data.seriesName}-${String(nextSeq).padStart(5, '0')}`

      const sourceNotes = await DeliveryNoteModel.find({
        _id: { $in: data.sourceDeliveryNotes },
      })
        .select(
          'orderNumberSnapshot deliveryNumberSnapshot seriesName noteNumber orderId deliveryId items' // <-- ACUM E CORECT
        )
        .lean()
        .session(session)

      const orderNumbers = [
        ...new Set(sourceNotes.map((n) => n.orderNumberSnapshot)),
      ]
      const deliveryNumbers = [
        ...new Set(sourceNotes.map((n) => n.deliveryNumberSnapshot)),
      ]
      const deliveryNoteNumbers = [
        ...new Set(sourceNotes.map((n) => `${n.seriesName}-${n.noteNumber}`)),
      ]
      const relatedOrderIds = [...new Set(sourceNotes.map((n) => n.orderId))]
      const relatedDeliveryIds = [
        ...new Set(sourceNotes.map((n) => n.deliveryId)),
      ]

      const logisticSnapshots = {
        orderNumbers: orderNumbers,
        deliveryNumbers: deliveryNumbers,
        deliveryNoteNumbers: deliveryNoteNumbers,
      }

      data.items.forEach((item) => {
        if (item.productCode === 'MANUAL') {
          const lineValue = item.lineValue || 0
          const lineCost = 0

          item.lineCostFIFO = lineCost
          item.lineProfit = round2(lineValue - lineCost)
          item.lineMargin =
            lineValue > 0 ? round2((item.lineProfit / lineValue) * 100) : 0
        }
      })

      // 6. Creare Obiect Factură
      const [createdInvoice] = await InvoiceModel.create(
        [
          {
            sequenceNumber: nextSeq,
            invoiceNumber: invoiceNumber,
            seriesName: data.seriesName,
            year: year,
            invoiceDate: data.invoiceDate,
            dueDate: data.dueDate,
            clientId: new Types.ObjectId(data.clientId),
            clientSnapshot: clientSnapshot, // Snapshot-ul proaspăt
            companySnapshot: companySnapshot,
            items: data.items, // Liniile direct din formular
            totals: totals, // Totalurile recalculate pe server
            sourceDeliveryNotes: data.sourceDeliveryNotes.map(
              (id) => new Types.ObjectId(id)
            ),
            relatedOrders: relatedOrderIds,
            relatedDeliveries: relatedDeliveryIds,
            logisticSnapshots: logisticSnapshots,
            status: status,
            eFacturaStatus: 'PENDING',
            invoiceType: 'STANDARD', // TODO: De gestionat 'STORNO'
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
            notes: data.notes,
          },
        ],
        { session }
      )

      newInvoice = createdInvoice

      // 7. Actualizare Avize, Livrări și Comenzi
      await updateRelatedDocuments(createdInvoice, { session })
    }) // <-- Sfârșitul Tranzacției

    await session.endSession()

    if (newInvoice) {
      return {
        success: true,
        data: JSON.parse(JSON.stringify(newInvoice)),
      }
    } else {
      throw new Error('Tranzacția nu a returnat o factură.')
    }
  } catch (error) {
    await session.endSession()
    console.error('❌ Eroare createInvoice:', error)
    return { success: false, message: (error as Error).message }
  }
}
