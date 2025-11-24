'use server'

import mongoose, { PipelineStage, startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import { getSetting } from '../../setting/setting.actions'
import {
  generateNextDocumentNumber,
  getActiveSeriesForDocumentType,
} from '../../numbering/numbering.actions'
import DeliveryNoteModel, {
  IDeliveryNoteDoc,
} from '../delivery-notes/delivery-note.model'
import InvoiceModel, { IInvoiceDoc } from './invoice.model'
import {
  InvoiceActionResult,
  CompanySnapshot,
  ClientSnapshot,
  InvoiceInput,
  InvoiceActionSelectionRequired,
  UnsettledAdvanceDTO,
  StornoSourceInvoiceDTO,
  StornableProductDTO,
  PopulatedInvoice,
  InvoiceFilters,
} from './invoice.types'
import { ISettingInput } from '../../setting/types'
import { IClientDoc } from '../../client/types'
import ClientModel from '../../client/client.model'
import { connectToDatabase } from '@/lib/db'
import {
  calculateInvoiceTotals,
  consolidateInvoiceFromNotes,
  updateRelatedDocuments,
} from './invoice.helpers'
import { round2 } from '@/lib/utils'
import { IOrderLineItem } from '../../order/types'
import { InvoiceLineInput } from './invoice.types'
import Order, { IOrder } from '../../order/order.model'
import { addDays, sub } from 'date-fns'
import { ISeries } from '../../numbering/series.model'
import { CreateStornoInput, CreateStornoSchema } from './storno.validator'
import { CreateReturnNoteInput } from '../return-notes/return-note.validator'
import { createReturnNote } from '../return-notes/return-note.actions'
import ReturnNoteModel from '../return-notes/return-note.model'
import { PAGE_SIZE } from '@/lib/constants'
import { FilterQuery } from 'mongoose'
import { revalidatePath } from 'next/cache'
import { IUser } from '../../user/user.model'
import { SUPER_ADMIN_ROLES } from '../../user/user-roles'
import { InvoiceInputSchema } from './invoice.validator'
import { recalculateClientSummary } from '../../client/summary/client-summary.actions'

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

export async function getUnsettledAdvances(
  clientId: string,
  deliveryAddressId: string
): Promise<
  | { success: true; data: UnsettledAdvanceDTO[] }
  | { success: false; message: string }
> {
  try {
    await connectToDatabase()

    if (
      !Types.ObjectId.isValid(clientId) ||
      !Types.ObjectId.isValid(deliveryAddressId)
    ) {
      console.warn('ID Client sau Adresă invalid în getUnsettledAdvances')
      return { success: true, data: [] } // Returnează gol, nu e o eroare
    }

    const advances = await InvoiceModel.find({
      clientId: new Types.ObjectId(clientId),
      invoiceType: 'AVANS',

      // 1. Avansul trebuie să fie PLĂTIT
      status: 'PAID',
      // 2. Avansul trebuie să mai aibă bani pe el
      remainingAmount: { $gt: 0 },

      // 3. Avansul trebuie să fie GLOBAL SAU specific acestei adrese
      $or: [
        { advanceScope: 'GLOBAL' },
        {
          advanceScope: 'ADDRESS_SPECIFIC',
          deliveryAddressId: new Types.ObjectId(deliveryAddressId),
        },
      ],
    })
      .select(
        'seriesName invoiceNumber invoiceDate totals.grandTotal remainingAmount advanceScope'
      )
      .sort({ invoiceDate: 1 }) // Le folosim pe cele mai vechi prima dată
      .lean()

    // Mapăm la DTO-ul curat
    const resultData: UnsettledAdvanceDTO[] = advances.map((adv) => ({
      _id: adv._id.toString(),
      seriesName: adv.seriesName,
      invoiceNumber: adv.invoiceNumber,
      invoiceDate: adv.invoiceDate.toISOString(),
      totalAmount: adv.totals.grandTotal,
      remainingAmount: adv.remainingAmount,
      advanceScope: adv.advanceScope as 'GLOBAL' | 'ADDRESS_SPECIFIC',
    }))

    return {
      success: true,
      data: JSON.parse(JSON.stringify(resultData)),
    }
  } catch (error) {
    console.error('❌ Eroare getUnsettledAdvances:', error)
    return { success: false, message: (error as Error).message }
  }
}

export async function getStornoSourceInvoices(
  clientId: string,
  deliveryAddressId: string
): Promise<
  | { success: true; data: StornoSourceInvoiceDTO[] }
  | { success: false; message: string }
> {
  try {
    await connectToDatabase()

    if (
      !Types.ObjectId.isValid(clientId) ||
      !Types.ObjectId.isValid(deliveryAddressId)
    ) {
      return { success: true, data: [] }
    }

    const invoices = await InvoiceModel.find({
      clientId: new Types.ObjectId(clientId),
      deliveryAddressId: new Types.ObjectId(deliveryAddressId),
      invoiceType: 'STANDARD',
      // Stornăm doar facturi finalizate (Aprobate sau Plătite)
      status: { $in: ['APPROVED', 'PAID'] },

      // --- Logica Cheie ---
      // Căutăm facturi care au cel puțin o linie
      // unde cantitatea stornată e mai mică decât cantitatea facturată
      'items.stornedQuantity': { $exists: true },
      $expr: {
        $gt: [
          { $sum: '$items.quantity' }, // Suma tuturor cantităților
          { $sum: '$items.stornedQuantity' }, // Suma tuturor cantităților stornate
        ],
      },
    })
      .select(
        'seriesName invoiceNumber invoiceDate totals items.quantity items.stornedQuantity'
      )
      .sort({ invoiceDate: -1 }) // Cele mai noi prima dată
      .lean()

    // Mapăm la DTO-ul curat
    const resultData: StornoSourceInvoiceDTO[] = invoices.map((inv) => {
      // Calculăm cât mai e de stornat pe întreaga factură
      const totalQuantity = inv.items.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      )
      const totalStorned = inv.items.reduce(
        (sum, item) => sum + (item.stornedQuantity || 0),
        0
      )

      return {
        _id: inv._id.toString(),
        seriesName: inv.seriesName,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate.toISOString(),
        grandTotal: inv.totals.grandTotal,
        // Acest câmp e doar informativ, logica reală e pe linii
        remainingToStorno: totalQuantity - totalStorned,
      }
    })

    return {
      success: true,
      data: JSON.parse(JSON.stringify(resultData)),
    }
  } catch (error) {
    console.error('❌ Eroare getStornoSourceInvoices:', error)
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
  await connectToDatabase()

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
      await updateRelatedDocuments(createdInvoice, {}, { session })
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
  await connectToDatabase()
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
        persoanaContact: order.deliveryAddress.persoanaContact,
        telefonContact: order.deliveryAddress.telefonContact,
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
export async function createInvoiceFromSingleNote(
  deliveryId: string, // Primește ID-ul Livrării
  seriesName?: string
): Promise<InvoiceActionResult> {
  await connectToDatabase()

  const session = await startSession()

  try {
    const result = await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      if (!authSession?.user?.id) throw new Error('Utilizator neautentificat.')

      // 2. Găsește Avizul Sursă (folosind deliveryId)
      const note = (await DeliveryNoteModel.findOne({
        deliveryId: deliveryId,
        status: 'DELIVERED',
      })
        .lean()
        .session(session)) as unknown as IDeliveryNoteDoc

      if (!note) {
        throw new Error(
          'Avizul (status "Livrat") nu a fost găsit pentru această livrare.'
        )
      }
      if (note.isInvoiced) {
        throw new Error('Acest aviz este deja facturat.')
      }

      // 3. Găsește Clientul (pentru termenul de plată)
      const client = (await ClientModel.findById(note.clientId)
        .select('paymentTerm')
        .lean()
        .session(session)) as IClientDoc | null
      if (!client) {
        throw new Error('Clientul de pe aviz nu a fost găsit.')
      }

      // 4. Calculează Datele
      const invoiceDate = new Date()
      const dueDate = addDays(invoiceDate, client.paymentTerm || 0)

      // 5. Verifică Seria
      let activeSeries = seriesName
      if (!activeSeries) {
        const documentType = 'Factura' as unknown as DocumentType
        const seriesList = await getActiveSeriesForDocumentType(documentType)

        if (seriesList.length === 0) {
          throw new Error('Nu există nicio serie activă pentru Facturi.')
        }
        if (seriesList.length === 1) {
          activeSeries = seriesList[0].name
        } else {
          const seriesNames: string[] = seriesList.map((s: ISeries) => s.name)
          return {
            success: false,
            requireSelection: true,
            message: `Există mai multe serii active (${seriesNames.join(
              ', '
            )}).`,
            series: seriesNames,
          } as InvoiceActionSelectionRequired
        }
      }

      // 6. Preia Liniile și Totalurile
      const { items, totals } = consolidateInvoiceFromNotes([
        note as IDeliveryNoteDoc,
      ])

      // 7. Verificare de siguranță (aici era eroarea ta de sintaxă)
      if (!activeSeries) {
        throw new Error('Seria activă nu a putut fi determinată.')
      }

      // 8. Construiește Obiectul `InvoiceInput`
      const invoiceInput: InvoiceInput = {
        clientId: note.clientId.toString(),
        deliveryAddressId: note.deliveryAddressId.toString(),
        deliveryAddress: {
          judet: note.deliveryAddress.judet,
          localitate: note.deliveryAddress.localitate,
          strada: note.deliveryAddress.strada,
          numar: note.deliveryAddress.numar || '',
          codPostal: note.deliveryAddress.codPostal,
          tara: 'RO',
          alteDetalii: note.deliveryAddress.alteDetalii || '',
          persoanaContact: note.deliveryAddress.persoanaContact,
          telefonContact: note.deliveryAddress.telefonContact,
        },
        seriesName: activeSeries,
        invoiceType: 'STANDARD',
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        items: items,
        totals: totals,
        sourceDeliveryNotes: [note._id.toString()],
        relatedInvoiceIds: [],
        notes: `Factură generată automat din Avizul ${note.seriesName}-${note.noteNumber}.`,
      }

      // 9. Apelează funcția principală de creare
      return createInvoice(invoiceInput, 'CREATED')
    })

    return result
  } catch (error) {
    await session.endSession()
    console.error('❌ Eroare createInvoiceFromSingleNote:', error)
    return { success: false, message: (error as Error).message }
  }
}

// storno
export async function getLinesFromInvoices(invoiceIds: string[]): Promise<
  | {
      success: true
      data: {
        lines: InvoiceLineInput[]
        header: {
          clientId: string
          clientSnapshot: ClientSnapshot
          deliveryAddressId: string
          deliveryAddress: ClientSnapshot['address']
          salesAgentId: string
          salesAgentSnapshot: { name: string }
        }
      }
    }
  | { success: false; message: string }
> {
  try {
    await connectToDatabase()

    const objectIds = invoiceIds.map((id) => new Types.ObjectId(id))

    const sourceInvoices = await InvoiceModel.find({
      _id: { $in: objectIds },
      invoiceType: 'STANDARD',
    })
      .select(
        'clientId clientSnapshot deliveryAddressId deliveryAddress ' +
          'salesAgentId salesAgentSnapshot ' +
          'items totals'
      )
      .lean()

    if (!sourceInvoices || sourceInvoices.length === 0) {
      throw new Error('Facturile sursă nu au fost găsite.')
    }

    const firstInvoice = sourceInvoices[0]
    const headerData = {
      clientId: firstInvoice.clientId.toString(),
      clientSnapshot: firstInvoice.clientSnapshot,
      deliveryAddressId: firstInvoice.deliveryAddressId.toString(),
      deliveryAddress: firstInvoice.deliveryAddress,
      salesAgentId: firstInvoice.salesAgentId.toString(),
      salesAgentSnapshot: firstInvoice.salesAgentSnapshot,
    }

    const stornoLines: InvoiceLineInput[] = []

    for (const invoice of sourceInvoices) {
      for (const item of invoice.items) {
        const stornedQty = item.stornedQuantity || 0
        const originalQty = item.quantity
        const remainingQty = round2(originalQty - stornedQty)

        if (remainingQty > 0) {
          stornoLines.push({
            // Datele liniei originale
            ...item,

            // Legătura cu sursa
            sourceInvoiceLineId: item._id?.toString(),
            sourceInvoiceId: invoice._id.toString(),
            // --- Cantitățile Negative (cu fallback) ---
            quantity: -remainingQty,
            quantityInBaseUnit: -(item.quantityInBaseUnit || remainingQty),

            // --- Calculele Financiare (Negative) (cu fallback) ---
            lineValue: -(item.lineValue || 0),
            vatRateDetails: {
              ...item.vatRateDetails,
              value: -(item.vatRateDetails.value || 0),
            },
            lineTotal: -(item.lineTotal || 0),

            // Costurile și profitul (cu fallback)
            lineCostFIFO: -(item.lineCostFIFO || 0),
            lineProfit: -(item.lineProfit || 0),

            // Resetăm câmpurile noi
            stornedQuantity: 0,
            relatedAdvanceId: undefined,
          })
        }
      }
    }

    return {
      success: true,
      data: {
        lines: JSON.parse(JSON.stringify(stornoLines)),
        header: JSON.parse(JSON.stringify(headerData)),
      },
    }
  } catch (error) {
    console.error('❌ Eroare getLinesFromInvoices:', error)
    return { success: false, message: (error as Error).message }
  }
}
export async function createStornoInvoice(
  data: CreateStornoInput
): Promise<InvoiceActionResult> {
  await connectToDatabase()

  const session = await startSession()
  try {
    const newStornoInvoice = await session.withTransaction(async (session) => {
      // 1. Validare
      const validatedData = CreateStornoSchema.parse(data)

      // 2. Autentificare
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      // 3. Preluare Setări Companie (Snapshot)
      const companySettings = await getSetting()
      if (!companySettings)
        throw new Error('Setările companiei nu sunt configurate.')
      const companySnapshot = buildCompanySnapshot(companySettings)

      // --- FIX: Preluare și Construire Client Snapshot (Lipseau) ---
      const client = (await ClientModel.findById(validatedData.clientId)
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
      // -------------------------------------------------------------

      // 4. Generare Număr Factură Storno
      const year = validatedData.invoiceDate.getFullYear()
      const nextSeq = await generateNextDocumentNumber(
        validatedData.seriesName,
        {
          session,
        }
      )
      const invoiceNumber = String(nextSeq).padStart(5, '0')

      // 5. PREGĂTIREA DATELOR PENTRU NOTA DE RETUR
      const returnNoteItems: CreateReturnNoteInput['items'] = []

      for (const item of validatedData.items) {
        if (item.productId && item.stockableItemType) {
          const itemQty = Math.abs(item.quantity)
          const itemCost = Math.abs(item.lineCostFIFO || 0)
          const unitCost = itemQty > 0 ? round2(itemCost / itemQty) : 0

          returnNoteItems.push({
            productId: item.productId,
            stockableItemType: item.stockableItemType as
              | 'ERPProduct'
              | 'Packaging',
            productName: item.productName,
            productCode: item.productCode || 'N/A',
            quantity: itemQty,
            unitOfMeasure: item.unitOfMeasure,
            baseUnit: item.baseUnit || item.unitOfMeasure,
            quantityInBaseUnit: Math.abs(item.quantityInBaseUnit || itemQty),
            costBreakdown: item.costBreakdown.map((cb) => ({
              ...cb,
              entryDate: new Date(cb.entryDate),
              movementId: cb.movementId,
            })),
            unitCost: unitCost,
            sourceInvoiceLineId: item.sourceInvoiceLineId,
            sourceDeliveryNoteLineId: item.sourceDeliveryNoteLineId,
          })
        }
      }

      // 6. Creare Notă de Retur
      let returnNoteId: Types.ObjectId | undefined = undefined
      if (returnNoteItems.length > 0) {
        const returnNoteData: CreateReturnNoteInput = {
          seriesName: validatedData.returnNoteSeriesName,
          returnNoteDate: validatedData.invoiceDate,
          clientId: validatedData.clientId as string,
          deliveryAddressId: validatedData.deliveryAddressId as string,
          locationTo: 'DEPOZIT',
          reason: 'STORNO_INVOICE',
          items: returnNoteItems,
        }

        const returnNoteResult = await createReturnNote(
          returnNoteData,
          'COMPLETED',
          session
        )
        if (!returnNoteResult.success) {
          throw new Error(
            `Eroare la crearea Notei de Retur: ${returnNoteResult.message}`
          )
        }
        returnNoteId = new Types.ObjectId(returnNoteResult.data._id)
      }

      // 7. Creare Factură Storno (Includem clientSnapshot)
      const [createdInvoice] = await InvoiceModel.create(
        [
          {
            ...validatedData,
            companySnapshot: companySnapshot,
            clientSnapshot: clientSnapshot, // <--- ADĂUGAT AICI
            sequenceNumber: nextSeq,
            invoiceNumber: invoiceNumber,
            year: year,
            status: 'CREATED',
            eFacturaStatus: 'PENDING',
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
            salesAgentId: new Types.ObjectId(validatedData.salesAgentId),
            salesAgentSnapshot: validatedData.salesAgentSnapshot,
          },
        ],
        { session }
      )

      // 8. Actualizăm Nota de Retur cu ID-ul Stornării
      if (returnNoteId) {
        await ReturnNoteModel.findByIdAndUpdate(
          returnNoteId,
          { $set: { relatedInvoiceId: createdInvoice._id } },
          { session }
        )
      }

      // 9. Actualizăm `stornedQuantity` pe facturile originale
      for (const item of validatedData.items) {
        await InvoiceModel.updateOne(
          { 'items._id': new Types.ObjectId(item.sourceInvoiceLineId) },
          {
            $inc: { 'items.$.stornedQuantity': Math.abs(item.quantity) },
          },
          { session }
        )
      }

      return createdInvoice
    }) // Sfârșitul Tranzacției

    await session.endSession()

    if (newStornoInvoice) {
      return {
        success: true,
        data: JSON.parse(JSON.stringify(newStornoInvoice)),
      }
    } else {
      throw new Error('Tranzacția nu a returnat o factură storno.')
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare createStornoInvoice:', error)
    return { success: false, message: (error as Error).message }
  }
}

export async function getStornableProductsList(
  clientId: string,
  deliveryAddressId: string,
  searchTerm: string
): Promise<
  | { success: true; data: StornableProductDTO[] }
  | { success: false; message: string }
> {
  try {
    await connectToDatabase()

    if (
      !Types.ObjectId.isValid(clientId) ||
      !Types.ObjectId.isValid(deliveryAddressId)
    ) {
      return { success: true, data: [] }
    }

    // NU căutăm pe server dacă termenul e prea scurt.
    // Asta previne irosirea resurselor.
    if (searchTerm.length < 3) {
      return { success: true, data: [] }
    }

    const validClientId = new Types.ObjectId(clientId)
    const validAddressId = new Types.ObjectId(deliveryAddressId)
    const oneYearAgo = sub(new Date(), { years: 1 })

    const stornableProducts: StornableProductDTO[] =
      await InvoiceModel.aggregate([
        // --- Faza 1: Găsește facturile relevante ---
        {
          $match: {
            clientId: validClientId,
            deliveryAddressId: validAddressId,
            status: { $in: ['APPROVED', 'PAID'] }, // <-- Asta e cheia!
          },
        },
        // --- Faza 2: "Sparge" facturile în linii individuale ---
        {
          $unwind: '$items',
        },
        // --- Faza 3: Filtrează Liniile care pot fi stornate ---
        {
          $match: {
            // FILTRU DE CĂUTARE NOU
            'items.productName': {
              $regex: searchTerm,
              $options: 'i', // 'i' = insensitive (nu ține cont de majuscule)
            },
            'items.productId': { $exists: true, $ne: null },
            // Verifică dacă mai e ceva de stornat
            $expr: {
              $gt: [
                '$items.quantity',
                { $ifNull: ['$items.stornedQuantity', 0] },
              ],
            },
            // Aplică regula de timp
            $or: [
              { 'items.stockableItemType': 'Packaging' },
              {
                'items.stockableItemType': 'ERPProduct',
                invoiceDate: { $gte: oneYearAgo },
              },
            ],
          },
        },
        // --- Faza 4: Grupează după Produs și Sumarizează ---
        {
          $group: {
            _id: '$items.productId',
            productName: { $first: '$items.productName' },
            unitOfMeasure: { $first: '$items.unitOfMeasure' },
            totalRemainingToStorno: {
              $sum: {
                $subtract: [
                  '$items.quantity',
                  { $ifNull: ['$items.stornedQuantity', 0] },
                ],
              },
            },
          },
        },
        // --- Faza 5: Formatează frumos output-ul ---
        {
          $project: {
            _id: 0,
            productId: '$_id',
            productName: '$productName',
            unitOfMeasure: '$unitOfMeasure',
            totalRemainingToStorno: { $round: ['$totalRemainingToStorno', 2] },
          },
        },
        // --- Faza 6: Sortează alfabetic ---
        {
          $sort: { productName: 1 },
        },
      ])

    return {
      success: true,
      data: JSON.parse(JSON.stringify(stornableProducts)),
    }
  } catch (error) {
    console.error('❌ Eroare getStornableProductsList:', error)
    return { success: false, message: (error as Error).message }
  }
}
export async function generateStornoLinesForQuantity(
  clientId: string,
  deliveryAddressId: string,
  productId: string,
  quantityToStorno: number // Cantitatea e POZITIVĂ (ex: 100)
): Promise<
  | {
      success: true
      data: {
        lines: InvoiceLineInput[]
        sourceInvoiceRefs: string[]
        sourceInvoiceIds: string[]
      }
    }
  | { success: false; message: string }
> {
  if (quantityToStorno <= 0) {
    return { success: false, message: 'Cantitatea trebuie să fie pozitivă.' }
  }

  try {
    await connectToDatabase()

    const validClientId = new Types.ObjectId(clientId)
    const validAddressId = new Types.ObjectId(deliveryAddressId)
    const validProductId = new Types.ObjectId(productId)
    const oneYearAgo = sub(new Date(), { years: 1 })

    // --- Faza 1: Găsește TOATE liniile eligibile, sortate FIFO ---
    const eligibleLinesResult = await InvoiceModel.aggregate([
      // Găsește facturile
      {
        $match: {
          clientId: validClientId,
          deliveryAddressId: validAddressId,
          status: { $in: ['APPROVED', 'PAID'] },
        },
      },
      // Sortează facturile (FIFO)
      { $sort: { invoiceDate: 1 } },
      // Sparge în linii
      { $unwind: '$items' },
      // Găsește liniile potrivite
      {
        $match: {
          'items.productId': validProductId,
          // Verifică dacă mai e ceva de stornat
          $expr: {
            $gt: [
              '$items.quantity',
              { $ifNull: ['$items.stornedQuantity', 0] },
            ],
          },
          // Aplică regula de timp
          $or: [
            { 'items.stockableItemType': 'Packaging' },
            {
              'items.stockableItemType': 'ERPProduct',
              invoiceDate: { $gte: oneYearAgo },
            },
          ],
        },
      },
      // Proiectează doar ce e necesar
      {
        $project: {
          invoiceId: '$_id',
          invoiceRef: { $concat: ['$seriesName', '-', '$invoiceNumber'] },
          line: '$items',
        },
      },
    ])

    // --- Faza 2: Procesează liniile și generează stornarea ---
    let remainingQtyToStorno = quantityToStorno
    const newStornoLines: InvoiceLineInput[] = []
    const sourceInvoiceRefs = new Set<string>()
    const sourceInvoiceIds = new Set<string>()

    for (const doc of eligibleLinesResult) {
      if (remainingQtyToStorno <= 0) break // Am terminat

      const line = doc.line as InvoiceLineInput & { _id: Types.ObjectId }
      const availableQty = round2(line.quantity - (line.stornedQuantity || 0))

      // Cât luăm din această linie
      const qtyToTake = Math.min(remainingQtyToStorno, availableQty)

      if (qtyToTake > 0) {
        // Adaugă la sumarul pentru toast
        sourceInvoiceRefs.add(`${doc.invoiceRef} (${qtyToTake} buc)`)
        sourceInvoiceIds.add(doc.invoiceId.toString())

        // Calculează proporțional valorile
        const ratio = qtyToTake / line.quantity
        const lineValue = round2(line.lineValue * ratio)
        const vatValue = round2(line.vatRateDetails.value * ratio)
        const lineTotal = round2(line.lineTotal * ratio)
        const lineCost = round2((line.lineCostFIFO || 0) * ratio)
        const lineProfit = round2((line.lineProfit || 0) * ratio)

        // Generează linia storno (negativă)
        newStornoLines.push({
          ...line,
          sourceInvoiceLineId: line._id.toString(),
          sourceInvoiceId: doc.invoiceId.toString(),
          quantity: -qtyToTake, // Negativ
          quantityInBaseUnit: -(line.quantityInBaseUnit || qtyToTake), // Negativ
          lineValue: -lineValue,
          vatRateDetails: {
            rate: line.vatRateDetails.rate,
            value: -vatValue,
          },
          lineTotal: -lineTotal,
          lineCostFIFO: -lineCost,
          lineProfit: -lineProfit,
          lineMargin: line.lineMargin, // Marja % rămâne aceeași
          stornedQuantity: 0, // Resetăm
          relatedAdvanceId: undefined, // Resetăm
        })

        // Scade din totalul necesar
        remainingQtyToStorno = round2(remainingQtyToStorno - qtyToTake)
      }
    }

    // Verificare de siguranță
    if (remainingQtyToStorno > 0) {
      const foundQty = quantityToStorno - remainingQtyToStorno
      throw new Error(
        `Cantitate insuficientă. Ați cerut ${quantityToStorno}, dar s-au găsit doar ${foundQty} disponibile pentru stornare.`
      )
    }

    return {
      success: true,
      data: {
        lines: JSON.parse(JSON.stringify(newStornoLines)),
        sourceInvoiceRefs: Array.from(sourceInvoiceRefs),
        sourceInvoiceIds: Array.from(sourceInvoiceIds),
      },
    }
  } catch (error) {
    console.error('❌ Eroare generateStornoLinesForQuantity:', error)
    return { success: false, message: (error as Error).message }
  }
}
export async function getAllInvoices(
  page: number = 1,
  filters: InvoiceFilters = {}
): Promise<{ data: PopulatedInvoice[]; totalPages: number }> {
  try {
    await connectToDatabase()

    const { q, status, eFacturaStatus, minTotal, agentId, clientId } = filters

    const skip = (page - 1) * PAGE_SIZE
    const limit = PAGE_SIZE

    const pipeline: PipelineStage[] = []

    // --- Faza 1: Filtrare Inițială ($match) ---
    const matchStage: FilterQuery<IInvoiceDoc> = {}
    if (status) {
      matchStage.status = status
    }
    if (eFacturaStatus) {
      matchStage.eFacturaStatus = eFacturaStatus
    }
    if (minTotal) {
      matchStage['totals.grandTotal'] = { $gte: Number(minTotal) }
    }
    if (agentId && Types.ObjectId.isValid(agentId)) {
      matchStage.salesAgentId = new Types.ObjectId(agentId)
    }
    if (clientId && Types.ObjectId.isValid(clientId)) {
      matchStage.clientId = new Types.ObjectId(clientId)
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage })
    }

    // --- Faza 2: Populare Client & Agent ($lookup) ---
    pipeline.push({
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: 'clientDoc',
      },
    })
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'salesAgentId',
        foreignField: '_id',
        as: 'agentDoc',
      },
    })

    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creatorDoc',
      },
    })

    // De-normalizăm array-urile (le transformăm în obiecte)
    pipeline.push({
      $unwind: { path: '$clientDoc', preserveNullAndEmptyArrays: true },
    })
    pipeline.push({
      $unwind: { path: '$agentDoc', preserveNullAndEmptyArrays: true },
    })
    pipeline.push({
      $unwind: { path: '$creatorDoc', preserveNullAndEmptyArrays: true },
    })

    // --- Faza 3: Filtrare Text (după ce am populat) ---
    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { invoiceNumber: { $regex: q, $options: 'i' } },
            { seriesName: { $regex: q, $options: 'i' } },
            { 'clientDoc.name': { $regex: q, $options: 'i' } },
          ],
        },
      })
    }

    // --- Faza 4: Paginare și Numărare ($facet) ---
    pipeline.push({
      $facet: {
        totalCount: [{ $count: 'count' }],
        data: [
          { $sort: { invoiceDate: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              ...Object.keys(InvoiceModel.schema.paths).reduce(
                (acc: Record<string, number>, path) => {
                  acc[path] = 1
                  return acc
                },
                {}
              ),
              clientId: '$clientDoc',
              salesAgentId: {
                // Acesta e agentul de vânzări
                _id: '$agentDoc._id',
                name: '$agentDoc.name',
              },
              createdByName: '$creatorDoc.name',
            },
          },
        ],
      },
    })

    const result = await InvoiceModel.aggregate(pipeline)

    const data = result[0].data as PopulatedInvoice[]
    const totalItems = result[0].totalCount[0]?.count || 0
    const totalPages = Math.ceil(totalItems / PAGE_SIZE)

    return {
      data: JSON.parse(JSON.stringify(data)),
      totalPages: totalPages,
    }
  } catch (error) {
    console.error('Eroare la preluarea facturilor:', error)
    return { data: [], totalPages: 0 }
  }
}
export async function approveInvoice(
  invoiceId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth()

    if (!session || !session.user || !session.user.id) {
      throw new Error('Utilizator neautentificat.')
    }

    const userRole = session?.user?.role || 'user'
    const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())

    if (!isAdmin) {
      throw new Error('Nu aveți permisiunea de a aproba facturi.')
    }

    await connectToDatabase()

    const invoice = await InvoiceModel.findById(invoiceId)
    if (!invoice) {
      throw new Error('Factura nu a fost găsită.')
    }

    if (invoice.status !== 'CREATED' && invoice.status !== 'REJECTED') {
      throw new Error(
        `Factura cu statusul ${invoice.status} nu poate fi aprobată.`
      )
    }

    invoice.status = 'APPROVED'
    invoice.eFacturaStatus = 'PENDING'
    invoice.approvedBy = new Types.ObjectId(session.user.id)
    invoice.approvedByName = session.user.name || 'Admin'

    await invoice.save()

    try {
      await recalculateClientSummary(
        invoice.clientId.toString(),
        'auto-recalc',
        true
      )
    } catch (err) {
      console.error('Eroare recalculare sold (approve invoice):', err)
    }

    revalidatePath('/financial/invoices')
    return { success: true, message: 'Factura a fost aprobată.' }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

export async function rejectInvoice(
  invoiceId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth()

    if (!session || !session.user || !session.user.id) {
      throw new Error('Utilizator neautentificat.')
    }

    const userRole = session?.user?.role || 'user'
    const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())

    if (!isAdmin) {
      throw new Error('Nu aveți permisiunea de a respinge facturi.')
    }

    if (!reason) {
      throw new Error('Motivul respingerii este obligatoriu.')
    }

    await connectToDatabase()

    const invoice = await InvoiceModel.findById(invoiceId)
    if (!invoice) {
      throw new Error('Factura nu a fost găsită.')
    }

    if (invoice.status !== 'CREATED') {
      throw new Error(
        `Factura cu statusul ${invoice.status} nu poate fi respinsă.`
      )
    }

    invoice.status = 'REJECTED'
    invoice.rejectionReason = reason
    await invoice.save()

    revalidatePath('/financial/invoices')
    return { success: true, message: 'Factura a fost respinsă.' }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}
export async function getInvoiceById(
  invoiceId: string
): Promise<{ success: boolean; data?: PopulatedInvoice; message?: string }> {
  try {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new Error('ID-ul facturii este invalid.')
    }

    await connectToDatabase()

    // 1. Folosim .populate() normal, FĂRĂ .lean()
    const invoice = await InvoiceModel.findById(invoiceId)
      .populate<{ clientId: IClientDoc }>({
        // Hint de tip pentru TS
        path: 'clientId',
        select: 'name cui nrRegComert address bankAccountLei',
      })
      .populate<{ salesAgentId: Pick<IUser, '_id' | 'name'> }>({
        // Hint de tip
        path: 'salesAgentId',
        select: 'name',
      })

    if (!invoice) {
      throw new Error('Factura nu a fost găsită.')
    }

    // 2. Convertim documentul Mongoose într-un obiect simplu
    // Acum `invoice.clientId` ESTE un obiect IClientDoc, nu un ObjectId
    const plainObject = invoice.toObject()

    // 3. Construim DTO-ul final
    const populatedData: PopulatedInvoice = {
      ...plainObject,
      clientId: plainObject.clientId,
      salesAgentId: plainObject.salesAgentId,
    }

    // 4. JSON.parse/stringify convertește toate ObjectId-urile rămase (ca _id, deliveryAddressId)
    // în string-uri, exact cum are nevoie formularul.
    return { success: true, data: JSON.parse(JSON.stringify(populatedData)) }
  } catch (error) {
    console.error('Eroare la getInvoiceById:', error)
    return { success: false, message: (error as Error).message }
  }
}
export async function updateInvoice(
  invoiceId: string,
  data: InvoiceInput
): Promise<InvoiceActionResult> {
  await connectToDatabase()

  const session = await startSession()
  try {
    let updatedInvoice: IInvoiceDoc | null = null

    // Stocăm ID-urile vechi înainte de tranzacție (sau în interior)
    const originalInvoiceForCheck = await InvoiceModel.findById(invoiceId)
      .select('sourceDeliveryNotes status')
      .lean()

    if (!originalInvoiceForCheck) {
      throw new Error('Factura originală nu a fost găsită.')
    }

    // Salvăm ID-urile vechi
    const originalSourceNoteIds =
      originalInvoiceForCheck.sourceDeliveryNotes || []

    await session.withTransaction(async (session) => {
      // ... (validarea, autentificarea) ...
      const validatedData = InvoiceInputSchema.parse(data) // Parsează datele noi

      // 2. Găsește documentul original (de data asta full, pentru tranzacție)
      const originalInvoice =
        await InvoiceModel.findById(invoiceId).session(session)
      if (!originalInvoice) {
        throw new Error('Factura originală nu a fost găsită.')
      }

      // 3. Verifică statusul (folosind datele deja luate)
      if (
        originalInvoiceForCheck.status !== 'CREATED' &&
        originalInvoiceForCheck.status !== 'REJECTED'
      ) {
        throw new Error(
          `Factura cu statusul ${originalInvoice.status} nu mai poate fi modificată.`
        )
      }

      // 4. Recalculează totalurile
      const newTotals = calculateInvoiceTotals(validatedData.items)

      // 5. Actualizează factura
      originalInvoice.set({
        invoiceDate: validatedData.invoiceDate,
        dueDate: validatedData.dueDate,
        clientId: validatedData.clientId,
        clientSnapshot: validatedData.clientSnapshot,
        deliveryAddressId: validatedData.deliveryAddressId,
        deliveryAddress: validatedData.deliveryAddress,
        items: validatedData.items,
        totals: newTotals,
        notes: validatedData.notes,
        status: 'CREATED',
        rejectionReason: undefined,
        // --- AICI E IMPORTANT ---
        // Setează noua listă de avize sursă
        sourceDeliveryNotes: validatedData.sourceDeliveryNotes.map(
          (id) => new Types.ObjectId(id)
        ),
      })

      updatedInvoice = await originalInvoice.save({ session })

      // 6. Actualizează documentele relaționate (ȘTERGEM TODO)
      await updateRelatedDocuments(
        updatedInvoice, // Trimitem factura *actualizată*
        {
          originalSourceNoteIds: originalSourceNoteIds, // Trimitem ID-urile *vechi*
        },
        { session }
      )
    })

    await session.endSession()

    if (updatedInvoice) {
      revalidatePath('/financial/invoices')
      revalidatePath(`/financial/invoices/${invoiceId}/edit`)

      return {
        success: true,
        data: JSON.parse(JSON.stringify(updatedInvoice)),
      }
    } else {
      throw new Error('Tranzacția nu a returnat o factură actualizată.')
    }
  } catch (error) {
    await session.endSession()
    console.error('❌ Eroare updateInvoice:', error)
    return { success: false, message: (error as Error).message }
  }
}
