'use server'

import { connectToDatabase } from '@/lib/db'
import mongoose, { startSession, FilterQuery, Types } from 'mongoose'
import DeliveryNoteModel, {
  IDeliveryNoteDoc,
  IDeliveryNoteLine,
} from './delivery-note.model'
import { UpdateDeliveryNoteStatusSchema } from './delivery-note.validator'
import { DELIVERY_NOTE_STATUSES } from './delivery-note.constants'
import { revalidatePath } from 'next/cache'
import DeliveryModel, {
  IDelivery,
  IDeliveryLineItem,
} from '../../deliveries/delivery.model'
import { unreserveStock } from '../../inventory/inventory.actions.reservation'
import {
  CreateDeliveryNoteResult,
  DeliveryNoteDTO,
} from './delivery-note.types'
import {
  generateNextDocumentNumber,
  getActiveSeriesForDocumentType,
} from '../../numbering/numbering.actions'
import { ISeries } from '../../numbering/series.model'
import { getSetting } from '../../setting/setting.actions'
import Order from '../../order/order.model'
import { IOrderLineItem } from '../../order/types'
import { auth } from '@/auth'
import Service from '../../setting/services/service.model'
import { round2 } from '@/lib/utils'
import { PAGE_SIZE } from '@/lib/constants'
import { DELIVERY_METHODS } from '../../order/constants'
import { recordStockMovement } from '../../inventory/inventory.actions.core'

// -------------------------------------------------------------
// CREATE DELIVERY NOTE
// -------------------------------------------------------------
export async function createDeliveryNote({
  deliveryId,
  seriesName,
  manualNumber,
}: {
  deliveryId: string
  seriesName?: string
  manualNumber?: string
}): Promise<CreateDeliveryNoteResult> {
  try {
    await connectToDatabase()

    let activeSeries = seriesName

    // -------------------------------------------------------
    // 🔹 Obținem seria ÎNAINTE de a porni tranzacția
    // -------------------------------------------------------
    if (!activeSeries) {
      const documentType = 'Aviz' as unknown as DocumentType
      const seriesList = await getActiveSeriesForDocumentType(documentType)

      if (seriesList.length === 0) {
        throw new Error(
          'Nu există nicio serie activă pentru documente de tip Aviz.'
        )
      }

      if (seriesList.length === 1) {
        activeSeries = seriesList[0].name
      } else {
        const seriesNames = seriesList.map((s: ISeries) => s.name)
        console.log(`🟡 Info: Solicitare de selecție a seriei pentru Aviz.`)
        return {
          success: false,
          requireSelection: true,
          message: `Există mai multe serii active (${seriesNames.join(
            ', '
          )}). Utilizatorul trebuie să aleagă una.`,
          series: seriesNames,
        }
      }
    }

    // --- ABIA ACUM pornim tranzacția ---
    const session = await startSession()

    // 🔽 MODIFICARE: Facem 'withTransaction' să returneze valoarea 🔽
    const createdNote = await session.withTransaction(async (session) => {
      const delivery = await DeliveryModel.findById(deliveryId).lean()
      if (!delivery) throw new Error('Livrarea nu a fost găsită.')

      const companySettings = await getSetting() // Preluăm setările
      if (!companySettings) {
        throw new Error(
          'Setările companiei nu sunt configurate. Nu se poate genera avizul.'
        )
      }

      // Găsește datele default
      const defaultEmail = companySettings.emails.find((e) => e.isDefault)
      const defaultPhone = companySettings.phones.find((p) => p.isDefault)
      const defaultBank = companySettings.bankAccounts.find((b) => b.isDefault)

      // Validare că există date default
      if (!defaultEmail || !defaultPhone || !defaultBank) {
        throw new Error(
          'Datele implicite (email, telefon, bancă) nu sunt setate în Setări Companie.'
        )
      }

      // Construiește snapshot-ul cu datele complete
      const companySnapshot = {
        name: companySettings.name,
        cui: companySettings.cui,
        regCom: companySettings.regCom,
        address: {
          judet: companySettings.address.judet,
          localitate: companySettings.address.localitate,
          strada: companySettings.address.strada,
          numar: companySettings.address.numar,
          codPostal: companySettings.address.codPostal,
          tara: companySettings.address.tara,
          alteDetalii: companySettings.address.alteDetalii,
        },
        email: defaultEmail.address,
        phone: defaultPhone.number,
        bank: defaultBank.bankName,
        iban: defaultBank.iban,
        currency: defaultBank.currency,
      }

      const year = new Date().getFullYear()

      // --- COD NOU ÎNCEPE AICI ---
      let nextSeq: number
      let padded: string

      if (manualNumber && manualNumber.trim()) {
        // Logica pentru SERIE MANUALĂ
        padded = manualNumber.trim()
        const numericPart = parseInt(padded.replace(/\D/g, ''))
        nextSeq = isNaN(numericPart) ? 0 : numericPart

        // Verificăm duplicat
        const existingNote = await DeliveryNoteModel.findOne({
          seriesName: activeSeries,
          noteNumber: padded,
        }).session(session)

        if (existingNote) {
          throw new Error(
            `Numărul ${padded} există deja pe seria ${activeSeries}.`
          )
        }
      } else {
        // Logica standard (AUTOMATĂ)
        nextSeq = await generateNextDocumentNumber(activeSeries!, { session })
        padded = String(nextSeq).padStart(5, '0')
      }

      const items = delivery.items as unknown as IDeliveryLineItem[]
      const noteItems = items.map((it) => ({
        orderLineItemId: it.orderLineItemId,
        productId: it.productId,
        serviceId: it.serviceId,
        isManualEntry: it.isManualEntry,
        isPerDelivery: it.isPerDelivery,
        productName: it.productName,
        productCode: it.productCode,
        productBarcode: it.productBarcode,
        quantity: it.quantity,
        unitOfMeasure: it.unitOfMeasure,
        unitOfMeasureCode: it.unitOfMeasureCode,
        priceAtTimeOfOrder: it.priceAtTimeOfOrder,
        minimumSalePrice: it.minimumSalePrice,
        lineValue: it.lineValue,
        lineVatValue: it.lineVatValue,
        lineTotal: it.lineTotal,
        vatRateDetails: it.vatRateDetails,
        stockableItemType: it.stockableItemType ?? 'ERPProduct',
        baseUnit: it.baseUnit,
        conversionFactor: it.conversionFactor,
        quantityInBaseUnit: it.quantityInBaseUnit,
        priceInBaseUnit: it.priceInBaseUnit,
        packagingOptions: it.packagingOptions,
      }))

      const [newNote] = await DeliveryNoteModel.create(
        [
          {
            noteNumber: padded,
            seriesName: activeSeries!,
            sequenceNumber: nextSeq,
            year,
            deliveryId: delivery._id,
            orderId: delivery.orderId,
            orderNumberSnapshot: delivery.orderNumber,
            deliveryNumberSnapshot: delivery.deliveryNumber,
            clientId: delivery.client,
            clientSnapshot: delivery.clientSnapshot,
            companySnapshot: companySnapshot,
            salesAgentId: delivery.salesAgent,
            salesAgentSnapshot: delivery.salesAgentSnapshot,
            deliveryAddress: delivery.deliveryAddress,
            deliveryAddressId: delivery.deliveryAddressId,
            driverId: delivery.driverId,
            driverName: delivery.driverName,
            vehicleId: delivery.vehicleId,
            vehicleNumber: delivery.vehicleNumber,
            vehicleType: delivery.vehicleType,
            deliveryType: delivery.deliveryType,
            trailerId: delivery.trailerId,
            trailerNumber: delivery.trailerNumber,
            deliveryDate: delivery.deliveryDate,
            deliverySlots: delivery.deliverySlots,
            orderNotesSnapshot: delivery.orderNotes,
            deliveryNotesSnapshot: delivery.deliveryNotes,
            items: noteItems,
            totals: delivery.totals,
            status: 'IN_TRANSIT',
            isInvoiced: false,
            eTransportStatus: 'NOT_REQUIRED',
            createdBy: delivery.createdBy,
            createdByName: delivery.createdByName,
            noteDate: new Date(),
          },
        ],
        { session }
      )

      await DeliveryModel.findByIdAndUpdate(
        delivery._id,
        {
          $set: {
            isNoticed: true,
            status: 'IN_TRANSIT',
            // Salvăm referința
            deliveryNoteId: newNote._id,
            deliveryNoteNumber: `${newNote.seriesName}-${newNote.noteNumber}`,
          },
        },
        { session }
      )
      await Order.findByIdAndUpdate(
        delivery.orderId,
        // TODO: Aici poți adăuga logică mai complexă
        // (ex: 'PARTIALLY_IN_TRANSIT' dacă e prima livrare)
        // Deocamdată, 'IN_TRANSIT' este corect.
        { status: 'PARTIALLY_DELIVERED' },
        { session }
      )
      // 🔽 MODIFICARE: Returnăm nota din tranzacție 🔽
      return JSON.parse(JSON.stringify(newNote)) as DeliveryNoteDTO
    }) // <--- Aici se termină tranzacția

    await session.endSession()

    // 🔽 MODIFICARE: 'createdNote' este acum corect tipat 🔽
    // (Și am șters blocul 'return' duplicat de la final)
    if (createdNote) {
      revalidatePath('/deliveries') // Păstrează asta
      return { success: true, data: createdNote }
    } else {
      // Asta se va întâmpla dacă tranzacția eșuează
      return { success: false, message: 'Eroare la crearea avizului.' }
    }
  } catch (error) {
    console.error('❌ Eroare createDeliveryNote:', error)
    return { success: false, message: (error as Error).message }
  }
}

// -------------------------------------------------------------
// CONFIRM DELIVERY NOTE (DELIVERED → scade stoc)
// -------------------------------------------------------------
export async function confirmDeliveryNote({
  deliveryNoteId,
  userId,
  userName,
}: {
  deliveryNoteId: string
  userId: string
  userName: string
}): Promise<{ success: boolean; message: string; data?: DeliveryNoteDTO }> {
  const session = await startSession()

  try {
    const transactionResult = await session.withTransaction(async (session) => {
      // 1. Găsește Avizul și Comanda
      const note =
        await DeliveryNoteModel.findById(deliveryNoteId).session(session)
      if (!note) throw new Error('Avizul nu a fost găsit.')
      if (note.status !== 'IN_TRANSIT') {
        throw new Error('Doar avizele "În Tranzit" pot fi confirmate.')
      }

      const order = await Order.findById(note.orderId)
        .populate('lineItems')
        .session(session)
      if (!order) throw new Error('Comanda asociată nu a fost găsită.')

      // 2. Anulează Rezervările
      const noteItemOrderLineIds = note.items.map((item) =>
        item.orderLineItemId?.toString()
      )

      const orderLinesToUnreserve = order.lineItems.filter(
        (
          ol: IOrderLineItem // <-- Tipăm 'ol'
        ) => noteItemOrderLineIds.includes(ol._id.toString())
      ) as unknown as IOrderLineItem[]

      if (orderLinesToUnreserve.length > 0) {
        await unreserveStock(orderLinesToUnreserve, session)
      }

      // --- DATE PENTRU AFISARE (Client / Doc) ---
      const methodObj = DELIVERY_METHODS.find(
        (m) => m.key === note.deliveryType
      )
      const friendlyDeliveryName = methodObj
        ? methodObj.label
        : note.deliveryType

      // 3. Consumă Stocul (FIFO) și salvează Costul
      for (const item of note.items) {
        // --- LOGICĂ NOUĂ: Mapare Tip și Locație ---
        // Folosim tipul de livrare din aviz ca tip de mișcare stoc (sunt aliniate acum)
        // TS Cast necesar pentru siguranță
        const movementType = note.deliveryType as unknown as
          | 'DIRECT_SALE'
          | 'DELIVERY_FULL_TRUCK'
          | 'DELIVERY_CRANE'
          | 'DELIVERY_SMALL_VEHICLE_PJ'
          | 'RETAIL_SALE_PF'
          | 'PICK_UP_SALE'
        // Determinăm locația sursă
        let locationFrom = 'DEPOZIT'
        if (movementType === 'DIRECT_SALE') {
          locationFrom = 'LIVRARE_DIRECTA' // Vânzările directe nu pleacă din Depozit
        }

        // --- CAZ 1: Este Produs Stocabil ---
        if (
          item.productId &&
          item.stockableItemType &&
          item.quantityInBaseUnit
        ) {
          const { costInfo } = await recordStockMovement(
            {
              stockableItem: item.productId.toString(),
              stockableItemType: item.stockableItemType,

              // Folosim valorile calculate dinamic
              movementType: movementType,
              locationFrom: locationFrom,

              quantity: item.quantityInBaseUnit,
              unitMeasure: item.baseUnit || item.unitOfMeasure,
              referenceId: note._id.toString(),
              responsibleUser: userId,
              clientId: note.clientId.toString(),
              note: `Livrare (${friendlyDeliveryName}) conf. Aviz Seria ${note.seriesName} nr. ${note.noteNumber}`,
              timestamp: new Date(),
            },
            session
          )

          if (costInfo) {
            item.unitCostFIFO = costInfo.unitCostFIFO
            item.lineCostFIFO = costInfo.lineCostFIFO
            item.costBreakdown = costInfo.costBreakdown
          } else {
            console.warn(
              `Nu s-a putut calcula costul FIFO pentru ${item.productName} pe avizul ${note.noteNumber}`
            )
          }
        } else if (item.serviceId) {
          // --- CAZ 2: Este Serviciu (Blocul nou) ---
          const service = await Service.findById(item.serviceId)
            .select('cost')
            .lean()
            .session(session)

          const serviceCost = service?.cost || 0
          const quantity = item.quantityInBaseUnit || item.quantity

          item.lineCostFIFO = round2(serviceCost * quantity)
          item.unitCostFIFO = serviceCost
          item.costBreakdown = []
        } // Liniile manuale (isManualEntry: true) vor fi ignorate,
        // așa cum sunt și acum, și vor păstra costul default (0).
      }

      // 4. Actualizează Statusurile

      // A. Status Aviz
      note.status = 'DELIVERED'
      note.lastUpdatedBy = new Types.ObjectId(userId)
      note.lastUpdatedByName = userName
      await note.save({ session })

      // B. Status Livrare
      const delivery = await DeliveryModel.findByIdAndUpdate(
        note.deliveryId,
        { status: 'DELIVERED' },
        { session, new: true }
      )
      if (!delivery) throw new Error('Livrarea asociată nu a fost găsită.')

      // C. Status Comandă (Logica complexă)
      const otherDeliveries = await DeliveryModel.find({
        orderId: order._id,
        _id: { $ne: delivery._id },
      }).session(session)

      const allDeliveriesDone = otherDeliveries.every(
        (d) => d.status === 'DELIVERED'
      )

      if (allDeliveriesDone) {
        order.status = 'DELIVERED'
      } else {
        order.status = 'PARTIALLY_DELIVERED'
      }
      await order.save({ session })

      return {
        confirmedNote: JSON.parse(JSON.stringify(note)) as DeliveryNoteDTO,
      }
    })

    // --- Sfârșitul Tranzacției ---
    await session.endSession()

    if (transactionResult) {
      // 6. Invalidează Cache-ul
      revalidatePath('/deliveries')
      revalidatePath('/financial/delivery-notes')

      return {
        success: true,
        message: 'Aviz confirmat cu succes.',
        data: transactionResult.confirmedNote,
      }
    } else {
      throw new Error('Tranzacția nu a returnat un aviz confirmat.')
    }
  } catch (error) {
    await session.endSession()
    console.error('❌ Eroare confirmDeliveryNote:', error)
    return { success: false, message: (error as Error).message }
  }
}

export async function confirmDeliveryFromPlanner({
  deliveryId,
}: {
  deliveryId: string
}): Promise<{ success: boolean; message: string; data?: DeliveryNoteDTO }> {
  // 1. Autentifică utilizatorul pe server
  const session = await auth()
  const userId = session?.user?.id
  const userName = session?.user?.name

  if (!userId || !userName) {
    return { success: false, message: 'Utilizator neautentificat.' }
  }

  try {
    // 2. Găsește Avizul care trebuie confirmat
    // Folosim .lean() pentru o căutare rapidă, non-tranzacțională
    const noteToConfirm = await DeliveryNoteModel.findOne({
      deliveryId: deliveryId,
      status: 'IN_TRANSIT', // Găsește doar avizul care așteaptă confirmare
    }).lean()

    if (!noteToConfirm) {
      throw new Error(
        'Avizul nu a fost găsit sau nu este "În Tranzit". Generați un aviz înainte de a confirma.'
      )
    }

    // 3. Apelează funcția de logică principală
    const result = await confirmDeliveryNote({
      deliveryNoteId: noteToConfirm._id.toString(),
      userId,
      userName,
    })

    return result
  } catch (error) {
    console.error('❌ Eroare confirmDeliveryFromPlanner:', error)
    return { success: false, message: (error as Error).message }
  }
}
// -------------------------------------------------------------
// UPDATE DELIVERY NOTE STATUS
// -------------------------------------------------------------
export async function updateDeliveryNoteStatus(data: unknown) {
  try {
    const payload = UpdateDeliveryNoteStatusSchema.parse(data)
    await connectToDatabase()

    const note = await DeliveryNoteModel.findById(payload.deliveryNoteId)
    if (!note) throw new Error('Avizul nu a fost găsit.')

    note.status = payload.status
    note.lastUpdatedBy = new mongoose.Types.ObjectId(payload.updatedBy)
    note.lastUpdatedByName = payload.updatedByName
    await note.save()

    if (payload.status === 'DELIVERED') {
      await DeliveryModel.findByIdAndUpdate(note.deliveryId, {
        status: 'DELIVERED',
      })
    }

    revalidatePath('/financiar/delivery-notes')
    return { success: true, message: 'Statusul avizului a fost actualizat.' }
  } catch (error) {
    console.error('❌ Eroare updateDeliveryNoteStatus:', error)
    return { success: false, message: (error as Error).message }
  }
}

export async function cancelDeliveryNote({
  deliveryNoteId,
  reason,
  userId,
  userName,
}: {
  deliveryNoteId: string
  reason: string
  userId: string
  userName: string
}): Promise<{ success: boolean; message: string; data?: DeliveryNoteDTO }> {
  // 1. Validarea datelor (fără autentificare)
  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      message: 'Motivul anulării este obligatoriu (min. 5 caractere).',
    }
  }

  const dbSession = await startSession()
  let cancelledNote: DeliveryNoteDTO | null = null

  try {
    const transactionResult = await dbSession.withTransaction(
      async (session) => {
        // 1. Găsește Avizul
        const note =
          await DeliveryNoteModel.findById(deliveryNoteId).session(session)
        if (!note) throw new Error('Avizul nu a fost găsit.')
        if (note.status !== 'IN_TRANSIT') {
          throw new Error('Doar avizele "În Tranzit" pot fi anulate.')
        }

        // 2. Actualizează Avizul (Anulează-l)
        note.status = 'CANCELLED'
        note.cancellationReason = reason
        note.cancelledAt = new Date()
        note.cancelledBy = new Types.ObjectId(userId) // Folosim ID-ul primit
        note.cancelledByName = userName // Folosim numele primit
        note.lastUpdatedBy = new Types.ObjectId(userId)
        note.lastUpdatedByName = userName
        await note.save({ session })

        // 3. Actualizează Livrarea (Deblocheaz-o)
        const delivery = await DeliveryModel.findByIdAndUpdate(
          note.deliveryId,
          {
            status: 'SCHEDULED', // Revine la Programat
            isNoticed: false, // Nu mai este avizat
          },
          { session, new: true }
        )
        if (!delivery) throw new Error('Livrarea asociată nu a fost găsită.')

        // 4. Actualizează Comanda (Logica complexă)
        const order = await Order.findById(note.orderId).session(session)
        if (!order) throw new Error('Comanda asociată nu a fost găsită.')

        const otherDeliveries = await DeliveryModel.find({
          orderId: order._id,
          _id: { $ne: delivery._id },
        }).session(session)

        const isAnyOtherDeliveryActive = otherDeliveries.some(
          (d) => d.status === 'IN_TRANSIT' || d.status === 'DELIVERED'
        )

        if (isAnyOtherDeliveryActive) {
          order.status = 'PARTIALLY_DELIVERED'
        } else {
          order.status = 'CONFIRMED'
        }
        await order.save({ session })

        return {
          cancelledNote: JSON.parse(JSON.stringify(note)) as DeliveryNoteDTO,
        }
      }
    )

    // --- Sfârșitul Tranzacției ---
    await dbSession.endSession()

    if (transactionResult) {
      cancelledNote = transactionResult.cancelledNote

      // 6. Invalidează Cache-ul
      revalidatePath('/deliveries')

      revalidatePath('/financial/delivery-notes')

      return {
        success: true,
        message: 'Avizul a fost anulat cu succes.',
        data: cancelledNote,
      }
    } else {
      throw new Error('Tranzacția nu a returnat un rezultat.')
    }
  } catch (error) {
    await dbSession.endSession()
    console.error('❌ Eroare cancelDeliveryNote:', error)
    return { success: false, message: (error as Error).message }
  }
}

export async function cancelDeliveryNoteFromPlanner({
  deliveryId,
  reason,
}: {
  deliveryId: string
  reason: string
}): Promise<{ success: boolean; message: string; data?: DeliveryNoteDTO }> {
  // 1. Validare și Autentificare (Munca de "Manager")
  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      message: 'Motivul anulării este obligatoriu (min. 5 caractere).',
    }
  }

  const session = await auth()
  const userId = session?.user?.id
  const userName = session?.user?.name

  if (!userId || !userName) {
    return { success: false, message: 'Utilizator neautentificat.' }
  }

  try {
    // 2. Găsește Avizul (Munca de "Manager")
    const noteToCancel = await DeliveryNoteModel.findOne({
      deliveryId: deliveryId,
      status: 'IN_TRANSIT',
    }).lean() // .lean() e ok, avem nevoie doar de ID

    if (!noteToCancel) {
      throw new Error('Avizul nu a fost găsit sau nu este "În Tranzit".')
    }

    // 3. Apelează "Specialistul" cu toate datele pregătite
    const result = await cancelDeliveryNote({
      deliveryNoteId: noteToCancel._id.toString(),
      reason: reason,
      userId: userId, // Pasează ID-ul
      userName: userName, // Pasează Numele
    })

    return result
  } catch (error) {
    console.error('❌ Eroare cancelDeliveryNoteFromPlanner:', error)
    return { success: false, message: (error as Error).message }
  }
}
// -------------------------------------------------------------
// GET DELIVERY NOTES (filter / list)
// -------------------------------------------------------------
export async function getDeliveryNotes(
  page: number = 1,
  filters?: {
    status?: (typeof DELIVERY_NOTE_STATUSES)[number]
    clientId?: string
    q?: string
  }
): Promise<{ data: DeliveryNoteDTO[]; totalPages: number }> {
  try {
    await connectToDatabase()

    // Construim query-ul
    const query: FilterQuery<IDeliveryNoteDoc> = {}

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (filters?.status && filters.status !== ('ALL' as any)) {
      query.status = filters.status
    }

    if (filters?.clientId) {
      query.clientId = filters.clientId
    }

    if (filters?.q) {
      const regex = new RegExp(filters.q, 'i')
      // Căutăm după număr aviz sau nume client (din snapshot)
      query.$or = [
        { noteNumber: regex },
        { 'clientSnapshot.name': regex },
        { seriesName: regex }, // Optional: căutare și după serie
      ]
    }

    // Calculăm skip pentru paginare
    const skip = (page - 1) * PAGE_SIZE

    // Executăm ambele query-uri în paralel pentru performanță
    const [totalDocs, results] = await Promise.all([
      DeliveryNoteModel.countDocuments(query),
      DeliveryNoteModel.find(query)
        .sort({ createdAt: -1 }) // Cele mai noi primele
        .skip(skip)
        .limit(PAGE_SIZE)
        .lean(),
    ])

    const totalPages = Math.ceil(totalDocs / PAGE_SIZE)

    return {
      data: JSON.parse(JSON.stringify(results)),
      totalPages: totalPages,
    }
  } catch (error) {
    console.error('❌ Eroare getDeliveryNotes:', error)
    // În caz de eroare returnăm structura goală, nu doar array gol
    return { data: [], totalPages: 0 }
  }
}
export async function syncDeliveryNoteWithDelivery(
  delivery: IDelivery,
  session: mongoose.ClientSession,
  user: { id: string; name: string }
) {
  const existingNote = await DeliveryNoteModel.findOne({
    deliveryId: delivery._id,
  }).session(session)

  if (!existingNote) return

  if (existingNote.status !== 'IN_TRANSIT') {
    return
  }

  // 1. Mapăm itemele noi. TS va deduce tipul corect.
  const updatedNoteItems = delivery.items.map((dItem) => ({
    orderLineItemId: dItem.orderLineItemId,
    productId: dItem.productId,
    serviceId: dItem.serviceId,
    stockableItemType: dItem.stockableItemType,
    isManualEntry: dItem.isManualEntry,
    isPerDelivery: dItem.isPerDelivery,
    productName: dItem.productName,
    productCode: dItem.productCode,
    productBarcode: dItem.productBarcode,
    quantity: dItem.quantity,
    unitOfMeasure: dItem.unitOfMeasure,
    unitOfMeasureCode: dItem.unitOfMeasureCode,
    priceAtTimeOfOrder: dItem.priceAtTimeOfOrder,
    minimumSalePrice: dItem.minimumSalePrice,
    lineValue: dItem.lineValue,
    lineVatValue: dItem.lineVatValue,
    lineTotal: dItem.lineTotal,
    vatRateDetails: dItem.vatRateDetails,
    baseUnit: dItem.baseUnit,
    conversionFactor: dItem.conversionFactor,
    quantityInBaseUnit: dItem.quantityInBaseUnit,
    priceInBaseUnit: dItem.priceInBaseUnit,
    packagingOptions: dItem.packagingOptions,
    unitCostFIFO: 0,
    lineCostFIFO: 0,
    costBreakdown: [],
  }))

  // 2. Atribuire Type-Safe pentru Mongoose Array
  existingNote.items =
    updatedNoteItems as unknown as Types.DocumentArray<IDeliveryNoteLine>

  existingNote.totals = delivery.totals

  // Date Logistice
  existingNote.driverId = delivery.driverId
  existingNote.driverName = delivery.driverName
  existingNote.vehicleId = delivery.vehicleId
  existingNote.vehicleNumber = delivery.vehicleNumber
  existingNote.vehicleType = delivery.vehicleType
  existingNote.deliveryType = delivery.deliveryType
  existingNote.trailerId = delivery.trailerId
  existingNote.trailerNumber = delivery.trailerNumber
  existingNote.deliveryDate = delivery.deliveryDate
  existingNote.deliverySlots = delivery.deliverySlots
  existingNote.deliveryNotesSnapshot = delivery.deliveryNotes
  existingNote.orderNotesSnapshot = delivery.orderNotes
  existingNote.uitCode = delivery.uitCode
  existingNote.lastUpdatedBy = new Types.ObjectId(user.id)
  existingNote.lastUpdatedByName = user.name

  await existingNote.save({ session })
}
export async function getDeliveryNoteById(
  id: string
): Promise<{ success: boolean; data?: DeliveryNoteDTO; message?: string }> {
  try {
    await connectToDatabase()
    const note = await DeliveryNoteModel.findById(id).lean()

    if (!note) {
      return { success: false, message: 'Avizul nu a fost găsit.' }
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(note)) as DeliveryNoteDTO,
    }
  } catch (error) {
    console.error('❌ Eroare getDeliveryNoteById:', error)
    return { success: false, message: 'Eroare la preluarea avizului.' }
  }
}
export type DeliveryNoteStats = {
  inTransit: number // Avize în tranzit (neconfirmate)
  toInvoice: number
  overdue: number
}

export async function getDeliveryNoteStats(): Promise<DeliveryNoteStats> {
  await connectToDatabase()

  try {
    // Data limită: Acum 3 zile
    const dateLimitForOverdue = new Date()
    dateLimitForOverdue.setDate(dateLimitForOverdue.getDate() - 3)

    const stats = await DeliveryNoteModel.aggregate([
      {
        $match: {
          status: { $in: ['IN_TRANSIT', 'DELIVERED'] },
        },
      },
      {
        $group: {
          _id: null,
          // 1. În Tranzit (Total)
          inTransit: {
            $sum: { $cond: [{ $eq: ['$status', 'IN_TRANSIT'] }, 1, 0] },
          },
          // 2. Întârziate (În Tranzit + Mai vechi de 3 zile)
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'IN_TRANSIT'] },
                    { $lt: ['$createdAt', dateLimitForOverdue] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          // 3. De Facturat (Livrate dar nefacturate)
          toInvoice: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'DELIVERED'] },
                    { $eq: ['$isInvoiced', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])

    if (stats.length > 0) {
      return {
        inTransit: stats[0].inTransit || 0,
        toInvoice: stats[0].toInvoice || 0,
        overdue: stats[0].overdue || 0,
      }
    }

    return { inTransit: 0, toInvoice: 0, overdue: 0 }
  } catch (error) {
    console.error('Eroare la calcularea statisticilor pentru avize:', error)
    return { inTransit: 0, toInvoice: 0, overdue: 0 }
  }
}
