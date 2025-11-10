'use server'

import { connectToDatabase } from '@/lib/db'
import mongoose, { FilterQuery, Types } from 'mongoose'
import { revalidatePath } from 'next/cache'
import { formatError, round2 } from '@/lib/utils'
import { auth } from '@/auth'
import DeliveryModel, { IDelivery, IDeliveryLineItem } from './delivery.model'
import OrderModel, { IOrder } from '../order/order.model'
import {
  IOrderLineItem,
  NewDeliveryData,
  NewDeliveryLineData,
  DeliveryDataForInsert,
  PlannerItem,
  PlannedDelivery,
  DeliveryStatusKey,
} from './types'
import { generateDeliveryNumber } from '../numbering/numbering.actions'
import { endOfDay, isValid, parseISO, startOfDay } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { ScheduleDeliveryInput } from './planner-validator'
import AssignmentModel from '../fleet/assignments/assignments.model'
import { IPopulatedAssignmentDoc } from '../fleet/assignments/types'
import { PAGE_SIZE, TIMEZONE } from '@/lib/constants'
import TrailerModel from '../fleet/trailers/trailers.model'

function buildDeliveryLine(
  item: PlannerItem,
  originalLine: IOrderLineItem
): NewDeliveryLineData {
  const allUnits = [
    { unitName: item.baseUnit, baseUnitEquivalent: 1 },
    ...(item.packagingOptions || []),
  ]
  const unitInfo = allUnits.find((u) => u.unitName === item.unitOfMeasure)
  const conversionFactor = unitInfo?.baseUnitEquivalent || 1
  const quantityInBaseUnit = round2(item.quantityToAllocate * conversionFactor)
  const basePrice =
    originalLine.priceInBaseUnit ?? originalLine.priceAtTimeOfOrder
  const lineValue = round2(basePrice * quantityInBaseUnit)
  const lineVatValue = round2(
    lineValue * (originalLine.vatRateDetails.rate / 100)
  )
  const lineTotal = round2(lineValue + lineVatValue)
  const productCodeValue = originalLine.productCode
    ? originalLine.productCode.trim()
    : 'N/A'
  const lineData: NewDeliveryLineData = {
    orderLineItemId: item.orderLineItemId
      ? new Types.ObjectId(item.orderLineItemId)
      : undefined,
    productId: originalLine.productId,
    serviceId: originalLine.serviceId,
    isManualEntry: originalLine.isManualEntry,
    isPerDelivery: originalLine.isPerDelivery,
    productName: originalLine.productName,
    productCode: productCodeValue,
    quantity: item.quantityToAllocate,
    unitOfMeasure: item.unitOfMeasure,
    unitOfMeasureCode: item.unitOfMeasureCode ?? undefined,
    priceAtTimeOfOrder: originalLine.priceAtTimeOfOrder,
    minimumSalePrice: originalLine.minimumSalePrice,
    baseUnit: originalLine.baseUnit,
    conversionFactor: conversionFactor,
    quantityInBaseUnit: quantityInBaseUnit,
    priceInBaseUnit: originalLine.priceInBaseUnit,
    packagingOptions: originalLine.packagingOptions ?? [],
    stockableItemType: originalLine.stockableItemType,
    lineValue: lineValue,
    lineVatValue: lineVatValue,
    lineTotal: lineTotal,
    vatRateDetails: {
      rate: originalLine.vatRateDetails.rate,
      value: lineVatValue,
    },
  }
  return lineData
}
function calculateDeliveryTotals(
  deliveryLines: NewDeliveryLineData[]
): IDelivery['totals'] {
  const totals: IDelivery['totals'] = {
    productsSubtotal: 0,
    servicesSubtotal: 0,
    packagingSubtotal: 0,
    packagingVat: 0,
    manualSubtotal: 0,
    productsVat: 0,
    servicesVat: 0,
    manualVat: 0,
    subtotal: 0,
    vatTotal: 0,
    grandTotal: 0,
  }
  for (const line of deliveryLines) {
    if (line.isManualEntry) {
      // Caz 1: Manual
      totals.manualSubtotal += line.lineValue
      totals.manualVat += line.lineVatValue
    } else if (line.serviceId) {
      // Caz 2: Serviciu
      totals.servicesSubtotal += line.lineValue
      totals.servicesVat += line.lineVatValue
    } else if (line.stockableItemType === 'Packaging') {
      // Caz 3: Ambalaj
      totals.packagingSubtotal += line.lineValue
      totals.packagingVat += line.lineVatValue
    } else if (line.productId || line.stockableItemType === 'ERPProduct') {
      // Caz 4: Produs (default)
      totals.productsSubtotal += line.lineValue
      totals.productsVat += line.lineVatValue
    }
  }
  totals.subtotal = round2(
    totals.productsSubtotal +
      totals.packagingSubtotal +
      totals.servicesSubtotal +
      totals.manualSubtotal
  )
  totals.vatTotal = round2(
    totals.productsVat +
      totals.packagingVat +
      totals.servicesVat +
      totals.manualVat
  )
  totals.grandTotal = round2(totals.subtotal + totals.vatTotal)

  // Rotunjim totul la final
  Object.keys(totals).forEach((key) => {
    totals[key as keyof IDelivery['totals']] = round2(
      totals[key as keyof IDelivery['totals']]
    )
  })

  return totals
}
function createSingleDeliveryDocument(
  plan: PlannedDelivery,
  originalOrder: IOrder,
  originalLinesMap: Map<string, IOrderLineItem>,
  user: { id: string; name: string }
): NewDeliveryData {
  const deliveryLinesData = plan.items.map((item) => {
    const originalLine = originalLinesMap.get(item.orderLineItemId!)
    if (!originalLine)
      throw new Error(
        `Integrity Error: Original line ${item.orderLineItemId} not found.`
      )
    return buildDeliveryLine(item, originalLine)
  })
  const deliveryTotals = calculateDeliveryTotals(deliveryLinesData)

  if (!originalOrder.deliveryAddressId)
    throw new Error(`Comanda ${originalOrder.orderNumber} nu are ID adresă.`)

  const deliveryData: NewDeliveryData = {
    requestedDeliveryDate: plan.requestedDeliveryDate,
    requestedDeliverySlots: plan.requestedDeliverySlots, // Folosim array-ul
    deliveryDate: plan.deliveryDate, // Rămâne undefined la creare
    deliverySlots: plan.deliverySlots, //
    vehicleType: originalOrder.estimatedVehicleType || 'N/A',
    createdBy: new Types.ObjectId(user.id),
    createdByName: user.name,
    orderId: new Types.ObjectId(originalOrder._id),
    orderNumber: originalOrder.orderNumber,
    client: new Types.ObjectId(originalOrder.client),
    clientSnapshot: originalOrder.clientSnapshot,
    salesAgent: new Types.ObjectId(originalOrder.salesAgent),
    salesAgentSnapshot: originalOrder.salesAgentSnapshot,
    deliveryAddress: originalOrder.deliveryAddress,
    deliveryAddressId: new Types.ObjectId(originalOrder.deliveryAddressId),
    items: deliveryLinesData,
    totals: deliveryTotals,
    deliveryNotes: plan.deliveryNotes,
    orderNotes: originalOrder.notes,
    uitCode: plan.uitCode,
  }
  return deliveryData
}
export async function createSingleDelivery(
  orderId: string,
  plan: PlannedDelivery
) {
  const mongoSession = await mongoose.startSession()
  mongoSession.startTransaction()
  try {
    await connectToDatabase()
    const authSession = await auth()
    if (!authSession?.user?.id || !authSession?.user?.name)
      throw new Error('Utilizator neautentificat.')
    const user = { id: authSession.user.id, name: authSession.user.name }
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId))
      throw new Error('ID Comandă invalid.')

    const originalOrder: IOrder | null =
      await OrderModel.findById(orderId).lean<IOrder>()
    if (!originalOrder) throw new Error('Comanda sursă nu a fost găsită.')

    const originalLinesMap = new Map<string, IOrderLineItem>(
      originalOrder.lineItems.map((line: IOrderLineItem) => [
        line._id.toString(),
        line,
      ])
    )

    // 1. Construim documentul de livrare
    const deliveryData = createSingleDeliveryDocument(
      plan,
      originalOrder,
      originalLinesMap,
      user
    )

    // 2. Generăm numărul de livrare folosind funcția atomică

    const deliveryNumber = await generateDeliveryNumber(
      originalOrder.orderNumber,
      { session: mongoSession }
    )

    const deliveryForInsert: DeliveryDataForInsert = {
      ...deliveryData,
      deliveryNumber: deliveryNumber,
      status: 'CREATED',
    }

    // 3. Inserăm livrarea
    const [savedDelivery] = await DeliveryModel.insertMany(
      [deliveryForInsert],
      { session: mongoSession }
    )

    // 4. Actualizăm statusul comenzii la 'SCHEDULED' (dacă nu e deja)
    if (
      originalOrder.status !== 'SCHEDULED' &&
      originalOrder.status !== 'PARTIALLY_DELIVERED'
    ) {
      await OrderModel.findByIdAndUpdate(
        orderId,
        { $set: { status: 'SCHEDULED' } },
        { session: mongoSession }
      )
    }

    await mongoSession.commitTransaction()

    revalidatePath(`/orders/${orderId}`)
    revalidatePath('/deliveries')

    return {
      success: true,
      message: `Livrarea ${deliveryNumber} a fost creată cu succes.`,
      data: JSON.parse(JSON.stringify(savedDelivery)),
    }
  } catch (error) {
    await mongoSession.abortTransaction()
    console.error('Eroare la crearea livrării:', error)
    return {
      success: false,
      message: formatError(error) || 'Eroare la salvarea livrării.',
    }
  } finally {
    await mongoSession.endSession()
  }
}
export async function deleteDeliveryPlan(deliveryId: string) {
  const mongoSession = await mongoose.startSession()
  mongoSession.startTransaction()
  try {
    await connectToDatabase()

    const authSession = await auth()
    if (!authSession?.user?.id || !authSession?.user?.name)
      throw new Error('Utilizator neautentificat.')

    if (!deliveryId || !mongoose.Types.ObjectId.isValid(deliveryId)) {
      throw new Error('ID Livrare invalid.')
    }

    const delivery =
      await DeliveryModel.findById(deliveryId).session(mongoSession)
    if (!delivery) {
      throw new Error('Livrarea nu a fost găsită. Poate a fost ștearsă deja.')
    }

    const cancellableStatuses: DeliveryStatusKey[] = ['CREATED', 'SCHEDULED'] // Folosim tipul corect
    if (!cancellableStatuses.includes(delivery.status)) {
      throw new Error(
        `Nu se poate anula o livrare cu statusul "${delivery.status}".`
      )
    }

    // Setăm statusul la 'CANCELLED'
    delivery.status = 'CANCELLED'
    // Salvăm și informațiile utilizatorului care a anulat
    delivery.lastUpdatedBy = new Types.ObjectId(authSession.user.id)
    delivery.lastUpdatedByName = authSession.user.name || 'Sistem'

    await delivery.save({ session: mongoSession })

    const remainingActiveDeliveries = await DeliveryModel.countDocuments({
      orderId: delivery.orderId,
      status: { $nin: ['CANCELLED'] }, // Excludem livrările anulate
    }).session(mongoSession)

    // Dacă nu mai rămâne nicio livrare activă, setăm statusul comenzii înapoi la CONFIRMED
    if (remainingActiveDeliveries === 0) {
      // Găsim comanda și verificăm statusul curent înainte de a-l schimba
      const order = await OrderModel.findById(delivery.orderId).session(
        mongoSession
      )
      // Schimbăm statusul doar dacă e 'SCHEDULED' sau 'PARTIALLY_DELIVERED'
      if (
        order &&
        (order.status === 'SCHEDULED' || order.status === 'PARTIALLY_DELIVERED')
      ) {
        await OrderModel.findByIdAndUpdate(
          delivery.orderId,
          { $set: { status: 'CONFIRMED' } },
          { session: mongoSession }
        )
      }
    }

    await mongoSession.commitTransaction()

    revalidatePath(`/orders/${delivery.orderId.toString()}`)
    revalidatePath('/deliveries')

    return { success: true, message: 'Livrarea a fost anulată cu succes.' }
  } catch (error) {
    await mongoSession.abortTransaction()
    console.error('Eroare la anularea livrării:', error)
    return {
      success: false,
      message: formatError(error) || 'Eroare la anularea livrării.',
    }
  } finally {
    await mongoSession.endSession()
  }
}
export async function updateSingleDelivery(
  deliveryId: string,
  plan: PlannedDelivery
) {
  const mongoSession = await mongoose.startSession()
  mongoSession.startTransaction()
  try {
    await connectToDatabase()

    const authSession = await auth()
    if (!authSession?.user?.id || !authSession?.user?.name)
      throw new Error('Utilizator neautentificat.')
    const user = { id: authSession.user.id, name: authSession.user.name }

    if (!deliveryId || !mongoose.Types.ObjectId.isValid(deliveryId)) {
      throw new Error('ID Livrare invalid.')
    }

    // 1. Găsim livrarea existentă
    const delivery =
      await DeliveryModel.findById(deliveryId).session(mongoSession)
    if (!delivery) {
      throw new Error('Livrarea nu a fost găsită.')
    }

    // 2. Verificăm statusul
    const readOnlyStatuses: string[] = ['INVOICED', 'CANCELLED']
    if (readOnlyStatuses.includes(delivery.status)) {
      throw new Error(
        `Nu se poate modifica o livrare cu statusul "${delivery.status}".`
      )
    }

    // 3. Preluăm comanda originală
    const originalOrder: IOrder | null = await OrderModel.findById(
      delivery.orderId
    ).lean<IOrder>()
    if (!originalOrder) throw new Error('Comanda sursă nu a fost găsită.')

    const originalLinesMap = new Map<string, IOrderLineItem>(
      originalOrder.lineItems.map((line: IOrderLineItem) => [
        line._id.toString(),
        line,
      ])
    )

    // 4. Reconstruim datele
    const newDeliveryLinesData = plan.items.map((item) => {
      const originalLine = originalLinesMap.get(item.orderLineItemId!)
      if (!originalLine)
        throw new Error(
          `Integrity Error: Linia originală ${item.orderLineItemId} nu a fost găsită.`
        )
      return buildDeliveryLine(item, originalLine)
    })
    const newDeliveryTotals = calculateDeliveryTotals(newDeliveryLinesData)

    // 5. Actualizăm documentul de livrare
    delivery.set({
      requestedDeliveryDate: plan.requestedDeliveryDate,
      requestedDeliverySlots: plan.requestedDeliverySlots,
      deliveryNotes: plan.deliveryNotes,
      uitCode: plan.uitCode,
      deliveryDate: plan.deliveryDate,
      deliverySlots: plan.deliverySlots,
      items: newDeliveryLinesData as Types.DocumentArray<IDeliveryLineItem>,
      totals: newDeliveryTotals,
      lastUpdatedBy: new Types.ObjectId(user.id),
      lastUpdatedByName: user.name,
    })

    const savedDelivery = await delivery.save({ session: mongoSession })

    await mongoSession.commitTransaction()

    revalidatePath(`/orders/${delivery.orderId.toString()}`)
    revalidatePath('/deliveries')

    return {
      success: true,
      message: `Livrarea ${savedDelivery.deliveryNumber} a fost actualizată.`,
      data: JSON.parse(JSON.stringify(savedDelivery)),
    }
  } catch (error) {
    await mongoSession.abortTransaction()
    console.error('Eroare la actualizarea livrării:', error)
    return {
      success: false,
      message: formatError(error) || 'Eroare la actualizarea livrării.',
    }
  } finally {
    await mongoSession.endSession()
  }
}
/** Preia livrările asociate unei comenzi */
export async function getDeliveriesByOrderId(
  orderId: string
): Promise<IDelivery[]> {
  try {
    await connectToDatabase()
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) return []
    const deliveries = await DeliveryModel.find({
      orderId: new Types.ObjectId(orderId),
    })
      .sort({ createdAt: 1 })
      .lean<IDelivery[]>()
    return deliveries
  } catch (error) {
    console.error(`Eroare preluare livrări pt comanda ${orderId}:`, error)
    return []
  }
}
// ----------------------- For Delivery Planner ----------------------- //
export async function getUnassignedDeliveriesForDate(
  selectedDate: Date
): Promise<IDelivery[]> {
  try {
    await connectToDatabase()

    const startOfDayLocal = startOfDay(selectedDate)
    const endOfDayLocal = endOfDay(selectedDate)
    const startDate = fromZonedTime(startOfDayLocal, TIMEZONE)
    const endDate = fromZonedTime(endOfDayLocal, TIMEZONE)

    const deliveries = await DeliveryModel.find({
      status: 'CREATED',
      requestedDeliveryDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ requestedDeliverySlots: 1, createdAt: 1 })
      .lean<IDelivery[]>()

    return JSON.parse(JSON.stringify(deliveries))
  } catch (error) {
    console.error('Eroare la preluarea livrărilor neasignate:', error)
    return []
  }
}
/**
 * Preia livrările DEJA ASIGNATE (programate) pentru o anumită zi.
 * Acestea sunt livrările care apar în grid-ul din dreapta.
 */
export async function getAssignedDeliveriesForDate(
  selectedDate: Date
): Promise<IDelivery[]> {
  try {
    await connectToDatabase()

    const startOfDayLocal = startOfDay(selectedDate)
    const endOfDayLocal = endOfDay(selectedDate)

    const startDate = fromZonedTime(startOfDayLocal, TIMEZONE)
    const endDate = fromZonedTime(endOfDayLocal, TIMEZONE)

    const deliveries = await DeliveryModel.find({
      deliveryDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ assemblyId: 1, 'deliverySlots.0': 1 }) // Sortează după ansamblu, apoi după primul slot orar
      .lean<IDelivery[]>()

    return JSON.parse(JSON.stringify(deliveries))
  } catch (error) {
    console.error('Eroare la preluarea livrărilor asignate:', error)
    return []
  }
}

export async function scheduleDelivery(
  deliveryId: string,
  data: ScheduleDeliveryInput
) {
  const mongoSession = await mongoose.startSession()
  mongoSession.startTransaction()
  try {
    await connectToDatabase()

    const authSession = await auth()
    if (!authSession?.user?.id || !authSession?.user?.name)
      throw new Error('Utilizator neautentificat.')
    const user = { id: authSession.user.id, name: authSession.user.name }

    if (!deliveryId || !mongoose.Types.ObjectId.isValid(deliveryId)) {
      throw new Error('ID Livrare invalid.')
    }
    if (!data.assemblyId || !mongoose.Types.ObjectId.isValid(data.assemblyId)) {
      throw new Error('ID Ansamblu invalid.')
    }

    //  Găsim livrarea
    const delivery =
      await DeliveryModel.findById(deliveryId).session(mongoSession)
    if (!delivery) {
      throw new Error('Livrarea nu a fost găsită.')
    }

    //  Verificăm statusul (nu poți programa ceva anulat/facturat)
    const editableStatuses: DeliveryStatusKey[] = ['CREATED', 'SCHEDULED']
    if (!editableStatuses.includes(delivery.status)) {
      throw new Error(
        `Nu se poate (re)programa o livrare cu statusul "${delivery.status}".`
      )
    }

    // --- VALIDARE SUPRAPUNERE  ---

    const slotsToBook = data.deliverySlots
    // Verificăm dacă se dorește blocarea întregii zile
    const isBookingAllDay = slotsToBook.includes('08:00 - 17:00')

    // Construim interogarea de bază pentru suprapunere
    const overlapQuery: FilterQuery<IDelivery> = {
      _id: { $ne: deliveryId }, // Exclude livrarea curentă
      assemblyId: new Types.ObjectId(data.assemblyId), // Același ansamblu
      deliveryDate: startOfDay(data.deliveryDate), // Aceeași zi
      status: { $ne: 'CANCELLED' },
    }

    if (isBookingAllDay) {
      // Dacă vrem să rezervăm TOATĂ ziua, verificăm dacă există ORICE altă livrare (care are sloturi) în acea zi
      overlapQuery.deliverySlots = { $exists: true, $ne: [] }
    } else {
      // Dacă vrem să rezervăm sloturi individuale, verificăm dacă se suprapun
      // cu alte sloturi individuale SAU cu o rezervare "Toată Ziua" existentă
      overlapQuery.$or = [
        { deliverySlots: { $in: slotsToBook } }, // Se suprapune cu cel puțin un slot
        { deliverySlots: '08:00 - 17:00' }, // Sau există deja o rezervare "Toată Ziua"
      ]
    }

    // Căutăm suprapunerea
    const existingOverlap = await DeliveryModel.findOne(overlapQuery)
      .session(mongoSession)
      .lean()

    if (existingOverlap) {
      throw new Error(
        `Suprapunere detectată. Ansamblul este deja programat pe slotul/sloturile selectate (Livrarea ${existingOverlap.deliveryNumber}).`
      )
    }

    // Găsim ansamblul pentru a crea snapshot-ul
    const assignment = await AssignmentModel.findById(data.assemblyId)
      .populate<{ driverId: { name: string } }>('driverId', 'name')
      .populate<{ vehicleId: { carNumber: string } }>('vehicleId', 'carNumber')
      .lean<IPopulatedAssignmentDoc>()

    if (!assignment) {
      throw new Error('Ansamblul selectat nu a fost găsit.')
    }

    // Verificăm tipurile populate (Fără 'as any')
    const driverName =
      assignment.driverId && typeof assignment.driverId === 'object'
        ? assignment.driverId.name
        : 'N/A'
    const finalDriverId =
      assignment.driverId && typeof assignment.driverId === 'object'
        ? assignment.driverId._id
        : null

    const vehicleNumber =
      assignment.vehicleId && typeof assignment.vehicleId === 'object'
        ? assignment.vehicleId.carNumber
        : 'N/A'
    const finalVehicleId =
      assignment.vehicleId && typeof assignment.vehicleId === 'object'
        ? assignment.vehicleId._id
        : null

    let finalTrailerId: Types.ObjectId | null = null
    let finalTrailerNumber: string | undefined = undefined

    if (data.trailerId && data.trailerId !== 'none') {
      // Cazul 1: O remorcă specifică a fost selectată în formular
      finalTrailerId = new Types.ObjectId(data.trailerId)

      // Căutăm remorca pentru a-i crea snapshot-ul
      const selectedTrailer = await TrailerModel.findById(finalTrailerId)
        .lean()
        .session(mongoSession)

      if (!selectedTrailer) {
        throw new Error('Remorca selectată (trailerId) nu a fost găsită.')
      }
      finalTrailerNumber = selectedTrailer.licensePlate
    } else if (data.trailerId === 'none') {
      // Cazul 2: S-a selectat explicit "Fără Remorcă"
      finalTrailerId = null
      finalTrailerNumber = undefined
    }

    // Actualizăm documentul de livrare
    delivery.set({
      status: 'SCHEDULED',
      deliveryDate: data.deliveryDate,
      deliverySlots: data.deliverySlots,
      assemblyId: new Types.ObjectId(data.assemblyId),
      driverId: finalDriverId,
      vehicleId: finalVehicleId,
      trailerId: finalTrailerId,
      deliveryNotes: data.deliveryNotes,
      driverName: driverName,
      vehicleNumber: vehicleNumber,
      trailerNumber: finalTrailerNumber,
      lastUpdatedBy: new Types.ObjectId(user.id),
      lastUpdatedByName: user.name,
    })

    const savedDelivery = await delivery.save({ session: mongoSession })

    await mongoSession.commitTransaction()

    revalidatePath(`/orders/${delivery.orderId.toString()}`)
    revalidatePath('/deliveries')

    return {
      success: true,
      message: `Livrarea ${savedDelivery.deliveryNumber} a fost programată.`,
    }
  } catch (error) {
    await mongoSession.abortTransaction()
    console.error('Eroare la programarea livrării:', error)
    return {
      success: false,
      message: formatError(error) || 'Eroare la programarea livrării.',
    }
  } finally {
    await mongoSession.endSession()
  }
}

/**
 * Dezalocă o livrare, mutând-o înapoi la statusul 'CREATED'.
 * Resetează câmpurile de programare.
 */
export async function unassignDelivery(deliveryId: string) {
  const mongoSession = await mongoose.startSession()
  mongoSession.startTransaction()
  try {
    await connectToDatabase()

    const authSession = await auth()
    if (!authSession?.user?.id || !authSession?.user?.name)
      throw new Error('Utilizator neautentificat.')
    const user = { id: authSession.user.id, name: authSession.user.name }

    if (!deliveryId || !mongoose.Types.ObjectId.isValid(deliveryId)) {
      throw new Error('ID Livrare invalid.')
    }

    // Găsim livrarea
    const delivery =
      await DeliveryModel.findById(deliveryId).session(mongoSession)
    if (!delivery) {
      throw new Error('Livrarea nu a fost găsită.')
    }

    // Verificăm statusul (nu poți dezaloca ceva în tranzit, livrat etc.)
    const unassignableStatuses: DeliveryStatusKey[] = ['SCHEDULED']
    if (!unassignableStatuses.includes(delivery.status)) {
      throw new Error(
        `Nu se poate dezaloca o livrare cu statusul "${delivery.status}".`
      )
    }

    // Resetăm câmpurile și setăm statusul 'CREATED'
    delivery.set({
      status: 'CREATED', // Statusul revine la 'Creat'
      deliveryDate: undefined, // Ștergem data programată
      deliverySlots: [], // Ștergem sloturile programate
      assemblyId: undefined, // Ștergem ansamblul
      driverName: undefined,
      vehicleNumber: undefined,
      trailerNumber: undefined,
      lastUpdatedBy: new Types.ObjectId(user.id),
      lastUpdatedByName: user.name,
    })

    await delivery.save({ session: mongoSession })

    await mongoSession.commitTransaction()

    revalidatePath(`/orders/${delivery.orderId.toString()}`)
    revalidatePath('/deliveries')

    return {
      success: true,
      message: 'Livrarea a fost dezalocată și mutată la "De Programat".',
    }
  } catch (error) {
    await mongoSession.abortTransaction()
    console.error('Eroare la dezalocarea livrării:', error)
    return {
      success: false,
      message: formatError(error) || 'Eroare la dezalocarea livrării.',
    }
  } finally {
    await mongoSession.endSession()
  }
}

// deliveries list page

export async function getFilteredDeliveries({
  search,
  status,
  date,
  page = 1,
}: {
  search?: string
  status?: string
  date?: string
  page?: number
}) {
  await connectToDatabase()

  const query: FilterQuery<IDelivery> = {}

  // căutare: client / nr comandă / nr livrare
  if (search) {
    const regex = { $regex: search, $options: 'i' }
    query.$or = [
      { 'clientSnapshot.name': regex },
      { orderNumber: regex },
      { deliveryNumber: regex },
    ]
  }

  // filtrare după zi (pe deliveryDate)
  if (date) {
    const d = parseISO(date)
    if (isValid(d)) {
      query.deliveryDate = { $gte: startOfDay(d), $lte: endOfDay(d) }
    }
  }

  // status
  if (status && status !== 'all') {
    query.status = status
  }

  const safePage = Math.max(1, page)
  const skipCount = (safePage - 1) * PAGE_SIZE

  const totalCount = await DeliveryModel.countDocuments(query)

  const deliveries = await DeliveryModel.find(query)
    .sort({ createdAt: -1 }) // afișăm după data creării
    .skip(skipCount)
    .limit(PAGE_SIZE)
    .lean()

  return JSON.parse(
    JSON.stringify({
      data: deliveries,
      pagination: {
        totalCount,
        currentPage: safePage,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        pageSize: PAGE_SIZE,
      },
    })
  )
}
