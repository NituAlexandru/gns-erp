'use server'

import { connectToDatabase } from '@/lib/db'
import { ClientSession, Types } from 'mongoose'
import {
  addDays,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { TIMEZONE } from '@/lib/constants'
import { round2 } from '@/lib/utils'

import InvoiceModel from '../invoices/invoice.model'
import PaymentAllocationModel from '../treasury/receivables/payment-allocation.model'
import PenaltyRuleModel from './penalty-rule.model'
import PenaltyRecordModel from './penalty-record.model'

import { CalculatedPenaltyResult, PenaltyRuleDTO } from './penalty.types'
import {
  SavePenaltyRuleInput,
  SaveDefaultPenaltyRuleInput,
} from './penalty.validator'
import { auth } from '@/auth'

// ==========================================
// 1. GESTIONAREA LISTELOR DE PENALIZĂRI (CRUD)
// ==========================================

export async function getPenaltyRules(): Promise<{
  success: boolean
  data?: PenaltyRuleDTO[]
  message?: string
}> {
  try {
    await connectToDatabase()

    // Aducem toate listele, sortând cu lista default prima
    const rules = await PenaltyRuleModel.find()
      .sort({ isDefault: -1, name: 1 })
      .lean()

    const formattedRules: PenaltyRuleDTO[] = rules.map((r) => ({
      _id: r._id.toString(),
      name: r.name,
      percentagePerDay: r.percentagePerDay,
      autoBillDays: r.autoBillDays,
      isDefault: r.isDefault,
      clientIds: r.clientIds ? r.clientIds.map((id) => id.toString()) : [],
      clientCount: r.clientIds ? r.clientIds.length : 0,
      updatedBy: r.updatedBy?.toString(),
      updatedByName: r.updatedByName,
      updatedAt: r.updatedAt?.toISOString(),
    }))

    return { success: true, data: formattedRules }
  } catch (error) {
    console.error('Eroare la aducerea regulilor:', error)
    return {
      success: false,
      message: 'A apărut o eroare la încărcarea listelor de penalizare.',
    }
  }
}

export async function savePenaltyRule(
  data: SavePenaltyRuleInput,
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, message: 'Neautorizat' }

    await connectToDatabase()

    const objectIdClients = data.clientIds.map((id) => new Types.ObjectId(id))

    if (data.id) {
      // Editare listă existentă
      await PenaltyRuleModel.findByIdAndUpdate(data.id, {
        name: data.name,
        percentagePerDay: data.percentagePerDay,
        autoBillDays: data.autoBillDays,
        clientIds: objectIdClients,
        updatedBy: new Types.ObjectId(session.user.id),
        updatedByName: session.user.name || 'Operator',
      })
      return { success: true, message: 'Lista a fost actualizată.' }
    } else {
      // Creare listă nouă
      await PenaltyRuleModel.create({
        name: data.name,
        percentagePerDay: data.percentagePerDay,
        autoBillDays: data.autoBillDays,
        isDefault: false, // Default-ul se salvează doar din funcția dedicată
        clientIds: objectIdClients,
        updatedBy: new Types.ObjectId(session.user.id),
        updatedByName: session.user.name || 'Operator',
      })
      return { success: true, message: 'Lista de penalizare a fost creată.' }
    }
  } catch (error) {
    console.error('Eroare salvare regulă:', error)
    return { success: false, message: 'Eroare la salvarea listei.' }
  }
}

export async function saveDefaultPenaltyRule(
  data: SaveDefaultPenaltyRuleInput,
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, message: 'Neautorizat' }

    await connectToDatabase()

    // Căutăm dacă există deja o regulă marcată ca default
    const existingDefault = await PenaltyRuleModel.findOne({ isDefault: true })

    if (existingDefault) {
      existingDefault.percentagePerDay = data.percentagePerDay
      existingDefault.autoBillDays = data.autoBillDays
      existingDefault.updatedBy = new Types.ObjectId(session.user.id)
      existingDefault.updatedByName = session.user.name || 'Operator'
      await existingDefault.save()
    } else {
      await PenaltyRuleModel.create({
        name: 'Standard (Global)',
        percentagePerDay: data.percentagePerDay,
        autoBillDays: data.autoBillDays,
        isDefault: true,
        clientIds: [],
        updatedBy: new Types.ObjectId(session.user.id),
        updatedByName: session.user.name || 'Operator',
      })
    }

    return { success: true, message: 'Setările globale au fost actualizate.' }
  } catch (error) {
    console.error('Eroare salvare default:', error)
    return { success: false, message: 'Eroare la salvarea setărilor globale.' }
  }
}

// ==========================================
// 2. MOTORUL MATEMATIC (THE CORE ENGINE)
// ==========================================

function calculateInvoicePenaltySegments(
  grandTotal: number,
  dueDate: Date,
  allocations: { amount: number; date: Date }[],
  lastBilledDate: Date | null,
  percentagePerDay: number,
  calculateUpToDate: Date,
): { penaltyAmount: number; unbilledDays: number } {
  // Păstrăm funcția matematică exact așa cum o aveai, este perfectă
  const zonedDueDate = toZonedTime(dueDate, TIMEZONE)
  const zonedLastBilled = lastBilledDate
    ? toZonedTime(lastBilledDate, TIMEZONE)
    : null
  const startDate = zonedLastBilled
    ? startOfDay(zonedLastBilled)
    : startOfDay(zonedDueDate)
  const endDate = startOfDay(calculateUpToDate)

  if (!isBefore(startDate, endDate))
    return { penaltyAmount: 0, unbilledDays: 0 }

  let totalPenalty = 0
  let totalUnbilledDays = 0
  let currentBalance = grandTotal

  const pastAllocations = allocations.filter(
    (a) => !isAfter(startOfDay(toZonedTime(a.date, TIMEZONE)), startDate),
  )
  pastAllocations.forEach((a) => {
    currentBalance -= a.amount
  })

  const futureAllocations = allocations
    .filter((a) => {
      const zonedAllocDate = startOfDay(toZonedTime(a.date, TIMEZONE))
      return (
        isAfter(zonedAllocDate, startDate) && !isAfter(zonedAllocDate, endDate)
      )
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  let currentDate = startDate
  const percentageMultiplier = percentagePerDay / 100

  for (const allocation of futureAllocations) {
    const allocationDate = startOfDay(toZonedTime(allocation.date, TIMEZONE))
    const daysInSegment = differenceInCalendarDays(allocationDate, currentDate)

    if (daysInSegment > 0 && currentBalance > 0) {
      const segmentPenalty =
        currentBalance * percentageMultiplier * daysInSegment
      totalPenalty += segmentPenalty
      totalUnbilledDays += daysInSegment
    }
    currentBalance = round2(currentBalance - allocation.amount)
    currentDate = allocationDate
  }

  const finalSegmentDays = differenceInCalendarDays(endDate, currentDate)
  if (finalSegmentDays > 0 && currentBalance > 0) {
    const finalPenalty =
      currentBalance * percentageMultiplier * finalSegmentDays
    totalPenalty += finalPenalty
    totalUnbilledDays += finalSegmentDays
  }

  return {
    penaltyAmount: round2(totalPenalty),
    unbilledDays: totalUnbilledDays,
  }
}

export async function getPendingPenaltiesList(): Promise<{
  success: boolean
  data?: CalculatedPenaltyResult[]
  message?: string
}> {
  try {
    await connectToDatabase()

    const now = new Date()
    const todayZoned = startOfDay(toZonedTime(now, TIMEZONE))

    const overdueInvoices = await InvoiceModel.aggregate([
      {
        $match: {
          status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
          invoiceType: 'STANDARD',
          remainingAmount: { $gt: 0 },
          dueDate: { $lt: todayZoned },
          seriesName: { $ne: 'PEN' },
        },
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'clientDoc',
        },
      },
      { $unwind: { path: '$clientDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          sequenceNumber: 1,
          invoiceNumber: 1,
          seriesName: 1,
          dueDate: 1,
          totals: 1,
          remainingAmount: 1,
          clientId: 1,
          clientName: { $ifNull: ['$clientDoc.name', '$clientSnapshot.name'] },
        },
      },
    ])

    if (!overdueInvoices.length) {
      return { success: true, data: [] }
    }

    const invoiceIds = overdueInvoices.map((inv) => inv._id)

    // --- LOGICA NOUĂ PENTRU REGULI ---
    const allRules = await PenaltyRuleModel.find().lean()
    const defaultRule = allRules.find((r) => r.isDefault)

    // Fallback suprem în caz că nu există nici măcar o regulă default în DB
    const globalPercentage = defaultRule ? defaultRule.percentagePerDay : 0.01

    // Mapăm clienții către lista lor specifică
    const clientRuleMap = new Map<string, any>()
    allRules.forEach((rule) => {
      if (!rule.isDefault && rule.clientIds) {
        rule.clientIds.forEach((clientId) => {
          clientRuleMap.set(clientId.toString(), rule)
        })
      }
    })
    // ----------------------------------

    const allAllocations = await PaymentAllocationModel.find({
      invoiceId: { $in: invoiceIds },
    })
      .select('invoiceId amountAllocated allocationDate')
      .lean()

    const lastRecords = await PenaltyRecordModel.aggregate([
      { $match: { invoiceId: { $in: invoiceIds } } },
      { $sort: { periodEnd: -1 } },
      {
        $group: { _id: '$invoiceId', lastPeriodEnd: { $first: '$periodEnd' } },
      },
    ])

    const recordMap = new Map(
      lastRecords.map((rec) => [rec._id.toString(), rec.lastPeriodEnd]),
    )
    const allocationMap = new Map<string, { amount: number; date: Date }[]>()

    allAllocations.forEach((alloc) => {
      const invId = alloc.invoiceId.toString()
      if (!allocationMap.has(invId)) allocationMap.set(invId, [])
      allocationMap
        .get(invId)!
        .push({ amount: alloc.amountAllocated, date: alloc.allocationDate })
    })

    const results: CalculatedPenaltyResult[] = []

    for (const invoice of overdueInvoices) {
      // Determinam procentul aplicabil
      const clientIdStr = invoice.clientId.toString()
      const specificRule = clientRuleMap.get(clientIdStr)
      const percentage = specificRule
        ? specificRule.percentagePerDay
        : globalPercentage

      const lastBilledDate = recordMap.get(invoice._id.toString()) || null
      const allocations = allocationMap.get(invoice._id.toString()) || []

      const calculation = calculateInvoicePenaltySegments(
        invoice.totals.grandTotal,
        invoice.dueDate,
        allocations,
        lastBilledDate,
        percentage,
        todayZoned,
      )

      if (calculation.penaltyAmount > 0) {
        results.push({
          invoiceId: invoice._id.toString(),
          clientId: clientIdStr,
          clientName: invoice.clientName || 'Client Necunoscut',
          documentNumber: invoice.invoiceNumber,
          seriesName: invoice.seriesName,
          dueDate: invoice.dueDate.toISOString(),
          remainingAmount: invoice.remainingAmount,
          unbilledDays: calculation.unbilledDays,
          penaltyAmount: calculation.penaltyAmount,
          appliedPercentage: percentage,
          isManualBilling: false, // Menținut pt tipuri, dar nu-l mai folosim
        })
      }
    }

    results.sort((a, b) => b.penaltyAmount - a.penaltyAmount)
    return { success: true, data: results }
  } catch (error) {
    console.error('Eroare calcul penalități:', error)
    return { success: false, message: (error as Error).message }
  }
}

/**
 * Pregătește datele necesare pentru calculul penalităților la nivel de sistem.
 * Aduce regulile și istoricul ultimelor facturări.
 */
export async function getPenaltyCalculationContext() {
  const allRules = await PenaltyRuleModel.find().lean()
  const defaultRule = allRules.find((r) => r.isDefault)

  // Mapăm clienții către lista lor (pentru viteză)
  const clientRuleMap = new Map<string, any>()
  allRules.forEach((r) => {
    if (!r.isDefault)
      r.clientIds.forEach((id) => clientRuleMap.set(id.toString(), r))
  })

  return {
    globalPercentage: defaultRule ? defaultRule.percentagePerDay : 0,
    globalAutoDays: defaultRule ? defaultRule.autoBillDays : 0,
    clientRuleMap,
    allRules,
  }
}

/**
 * Helper pur care calculează penalitatea curentă pentru o factură pe baza contextului primit
 */
export async function getPenaltyForInvoice(
  invoice: {
    _id: string
    clientId: string
    dueDate: Date
    remainingAmount: number
  },
  context: any,
  lastBilledDate: Date | null,
  todayZoned: Date,
) {
  const clientIdStr = invoice.clientId.toString()
  const specificRule = context.clientRuleMap.get(clientIdStr)

  const percentage = specificRule
    ? specificRule.percentagePerDay
    : context.globalPercentage
  const autoBillDays = specificRule
    ? specificRule.autoBillDays
    : context.globalAutoDays

  const penaltyStartDate = lastBilledDate
    ? new Date(lastBilledDate)
    : new Date(invoice.dueDate)
  const daysToPenalty = Math.max(
    0,
    differenceInCalendarDays(todayZoned, penaltyStartDate),
  )

  const penaltyAmount =
    invoice.remainingAmount > 0
      ? round2(invoice.remainingAmount * (percentage / 100) * daysToPenalty)
      : 0

  const nextBillingDate = addDays(new Date(invoice.dueDate), autoBillDays + 1)

  return {
    penaltyAmount: Math.max(0, penaltyAmount),
    appliedPercentage: percentage,
    nextBillingDate: nextBillingDate.toISOString(),
    autoBillDays,
  }
}

/**
 * Salvează istoricul penalităților ÎN INTERIORUL unei tranzacții.
 * Se apelează atunci când se generează cu succes factura de penalitate.
 */
export async function insertPenaltyRecords(
  clientId: string,
  penaltyInvoiceId: Types.ObjectId,
  overdueInvoices: { invoiceId: string; penaltyAmount: number }[],
  periodEnd: Date,
  userId: string,
  userName: string,
  session: ClientSession,
) {
  const records = overdueInvoices.map((inv) => ({
    invoiceId: new Types.ObjectId(inv.invoiceId),
    clientId: new Types.ObjectId(clientId),
    periodEnd: periodEnd,
    amountCalculated: inv.penaltyAmount,
    penaltyInvoiceId: penaltyInvoiceId,
    createdBy: new Types.ObjectId(userId),
    createdByName: userName,
  }))

  // Salvăm tot array-ul dintr-o singură lovitură (bulk insert)
  await PenaltyRecordModel.insertMany(records, { session })
}
