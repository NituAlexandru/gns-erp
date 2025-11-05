'use server'

import mongoose, { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import { getSetting } from '../../setting/setting.actions'
import { generateNextDocumentNumber } from '../../numbering/numbering.actions'
import DeliveryNoteModel, {
  IDeliveryNoteDoc,
} from '../delivery-notes/delivery-note.model'
import InvoiceModel, { IInvoiceDoc } from './invoice.model'
import {
  InvoiceActionResult,
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
import { IOrderLineItem } from '../../order/types'
import { InvoiceLineInput } from './invoice.types'
import Order, { IOrder } from '../../order/order.model'

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
      const invoiceNumber = String(nextSeq).padStart(5, '0')

      const sourceNotes = await DeliveryNoteModel.find({
        _id: { $in: data.sourceDeliveryNotes },
      })
        .select(
          'orderNumberSnapshot deliveryNumberSnapshot seriesName noteNumber orderId deliveryId items salesAgentId salesAgentSnapshot'
        )
        .lean()
        .session(session)

      let agentId: Types.ObjectId
      let agentSnapshot: { name: string }

      if (sourceNotes && sourceNotes.length > 0) {
        // Cazul 1: Factură bazată pe avize
        agentId = sourceNotes[0].salesAgentId
        agentSnapshot = sourceNotes[0].salesAgentSnapshot
      } else {
        // Cazul 2: Factură goală / doar linii manuale / Avans
        // Agentul este persoana care creează factura
        agentId = new Types.ObjectId(userId)
        agentSnapshot = { name: userName }
      }

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
            deliveryAddressId: new Types.ObjectId(data.deliveryAddressId),
            deliveryAddress: data.deliveryAddress,
            invoiceType: data.invoiceType,
            status: status,
            eFacturaStatus: 'PENDING',
            salesAgentId: agentId,
            salesAgentSnapshot: agentSnapshot,
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

export async function generateProformaFromOrder(
  orderId: string,
  seriesName: string
): Promise<InvoiceActionResult> {
  const session = await startSession()
  try {
    let newProforma: IInvoiceDoc | null = null

    await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      // 2. Găsește Comanda Sursă
      const order = (await Order.findById(orderId)
        .lean()
        .session(session)) as unknown as IOrder
      if (!order) {
        throw new Error('Comanda originală nu a fost găsită.')
      }

      // 3. Preluare Setări Companie (Snapshot)
      const companySettings = await getSetting()
      if (!companySettings)
        throw new Error('Setările companiei nu sunt configurate.')
      const companySnapshot = buildCompanySnapshot(companySettings)

      // 4. Preluare Client FULL (pentru snapshot fiscal corect)
      const client = (await ClientModel.findById(order.client)
        .lean()
        .session(session)) as IClientDoc | null
      if (!client) {
        throw new Error('Clientul asociat comenzii nu a fost găsit.')
      }

      // 5. Construire Snapshot Client CORECT
      const clientSnapshot: ClientSnapshot = {
        name: client.name,
        cui: client.vatId || client.cnp || '',
        regCom: client.nrRegComert || '',
        bank: client.bankAccountLei?.bankName || '',
        iban: client.bankAccountLei?.iban || '',
        address: {
          // Construim obiectul adresă imbricat
          judet: client.address.judet,
          localitate: client.address.localitate,
          strada: client.address.strada,
          numar: client.address.numar || '',
          codPostal: client.address.codPostal,
          tara: client.address.tara || 'RO',
          alteDetalii: client.address.alteDetalii || '',
        },
      }

      // 6. Preluare și Corectare Adresă Livrare (pentru eroarea 2)
      const deliveryAddressId = order.deliveryAddressId
      if (!deliveryAddressId) {
        throw new Error('Datele de adresă de livrare lipsesc din comandă.')
      }

      const deliveryAddress = {
        judet: order.deliveryAddress.judet,
        localitate: order.deliveryAddress.localitate,
        strada: order.deliveryAddress.strada,
        numar: order.deliveryAddress.numar,
        codPostal: order.deliveryAddress.codPostal,
        tara: 'RO', // <-- ADAUGĂM CÂMPUL OBLIGATORIU 'tara'
        alteDetalii: order.deliveryAddress.alteDetalii || '',
      }

      // 7. Mapează Liniile (fără costuri)
      const invoiceItems: InvoiceLineInput[] = order.lineItems.map(
        (item: IOrderLineItem) => {
          return {
            productId: item.productId?.toString(),
            serviceId: item.serviceId?.toString(),
            isManualEntry: item.isManualEntry,
            productName: item.productName,
            productCode: item.productCode || 'N/A',
            stockableItemType: item.stockableItemType,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitOfMeasureCode: item.unitOfMeasureCode,
            unitPrice: item.priceAtTimeOfOrder,
            lineValue: item.lineValue,
            vatRateDetails: item.vatRateDetails,
            lineTotal: item.lineTotal,
            baseUnit: item.baseUnit,
            conversionFactor: item.conversionFactor || 1,
            quantityInBaseUnit: item.quantityInBaseUnit,
            priceInBaseUnit: item.priceInBaseUnit,
            minimumSalePrice: item.minimumSalePrice,
            packagingOptions: item.packagingOptions || [],
            codNC: item.codNC,
            lineCostFIFO: 0,
            lineProfit: 0,
            lineMargin: 0,
            costBreakdown: [],
            stornedQuantity: 0,
            relatedAdvanceId: undefined,
          }
        }
      )

      // 8. Recalculare Totaluri (pe Server)
      const totals = calculateInvoiceTotals(invoiceItems)

      // 9. Generare Număr Factură (Atomic)
      const year = new Date().getFullYear()
      const nextSeq = await generateNextDocumentNumber(seriesName, {
        session,
      })
      const invoiceNumber = String(nextSeq).padStart(5, '0')

      // 10. Creare Obiect Factură Proformă
      const [createdProforma] = await InvoiceModel.create(
        [
          {
            sequenceNumber: nextSeq,
            invoiceNumber: invoiceNumber,
            seriesName: seriesName,
            year: year,
            invoiceDate: new Date(),
            dueDate: new Date(),
            invoiceType: 'PROFORMA',
            status: 'APPROVED',
            eFacturaStatus: 'NOT_REQUIRED',
            clientId: order.client,
            clientSnapshot: clientSnapshot,
            deliveryAddressId: deliveryAddressId,
            deliveryAddress: deliveryAddress,
            companySnapshot: companySnapshot,
            items: invoiceItems,
            totals: totals,
            relatedOrders: [order._id],
            sourceDeliveryNotes: [],
            relatedDeliveries: [],
            relatedInvoiceIds: [],
            relatedAdvanceIds: [],
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
            notes: `Proformă generată automat din Comanda ${order.orderNumber}.`,
            logisticSnapshots: {
              orderNumbers: [order.orderNumber],
              deliveryNumbers: [],
              deliveryNoteNumbers: [],
            },
            remainingAmount: 0,
          },
        ],
        { session }
      )

      newProforma = createdProforma
    })
    await session.endSession()

    if (newProforma) {
      return {
        success: true,
        data: JSON.parse(JSON.stringify(newProforma)),
      }
    } else {
      throw new Error('Tranzacția nu a returnat o factură proformă.')
    }
  } catch (error) {
    await session.endSession()
    console.error('❌ Eroare generateProformaFromOrder:', error)
    return { success: false, message: (error as Error).message }
  }
}
