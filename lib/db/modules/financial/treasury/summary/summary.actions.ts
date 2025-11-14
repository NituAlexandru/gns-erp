'use server'

import { connectToDatabase } from '@/lib/db'
import InvoiceModel from '../../../financial/invoices/invoice.model'
import ClientPaymentModel from '../receivables/client-payment.model'
import SupplierPaymentModel from '../payables/supplier-payment.model'
import {
  TreasuryStaticStats,
  ClientPaymentSummary,
  BudgetPaymentSummary,
  OverdueClientSummary,
} from './summary.types'

/**
 * 1. Prelucrează datele STATICE (All-Time) pentru Card 2 și 3.
 * Aceasta rulează o singură dată la încărcarea paginii.
 */
export async function getStaticTreasuryStats(): Promise<TreasuryStaticStats> {
  try {
    await connectToDatabase()

    // $facet ne permite să rulăm 2 agregări în paralel într-o singură interogare
    const results = await InvoiceModel.aggregate([
      {
        $facet: {
          // --- Card 2: Total de Încasat (Sold Clienți) ---
          totalDeIncasat: [
            {
              $match: {
                status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$remainingAmount' },
              },
            },
          ],

          // --- Card 3: Total de Plătit (Sold Furnizori) ---
          totalDePlatit: [
            // $facet rulează pe modelul 'InvoiceModel',
            { $limit: 1 }, // Începem cu un singur document
            {
              $lookup: {
                from: 'supplierinvoices',
                as: 'supplierinvoices',
                pipeline: [],
              },
            },
            { $unwind: '$supplierinvoices' },
            {
              $match: {
                'supplierinvoices.status': {
                  $in: ['NEPLATITA', 'PARTIAL_PLATITA'],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$supplierinvoices.remainingAmount' },
              },
            },
          ],
        },
      },
    ])

    const data: TreasuryStaticStats = {
      totalDeIncasat: results[0]?.totalDeIncasat[0]?.total || 0,
      totalDePlatit: results[0]?.totalDePlatit[0]?.total || 0,
    }
    return JSON.parse(JSON.stringify(data))
  } catch (error) {
    console.error('❌ Eroare getStaticTreasuryStats:', error)
    return {
      totalDeIncasat: 0,
      totalDePlatit: 0,
    }
  }
}

/**
 * 2. Prelucrează datele DINAMICE pentru Încasări (Card 1 și Lista 5)
 * pe baza unui interval de date.
 */
export async function getDynamicClientSummary(
  startDate: Date,
  endDate: Date
): Promise<ClientPaymentSummary> {
  try {
    await connectToDatabase()

    const results = await ClientPaymentModel.aggregate([
      // 1. Filtrează documentele
      {
        $match: {
          paymentDate: { $gte: startDate, $lte: endDate },
          status: { $ne: 'ANULATA' },
        },
      },
      // 2. $facet pentru a rula 2 agregări în paralel
      {
        $facet: {
          // --- Card 1: Total Încasat (Perioadă) ---
          totalIncasatPerioada: [
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' },
              },
            },
          ],
          // --- Lista 5: Sumar pe Client ---
          summaryList: [
            {
              $group: {
                _id: '$clientId',
                totalIncasat: { $sum: '$totalAmount' },
              },
            },
            {
              $lookup: {
                from: 'clients',
                localField: '_id',
                foreignField: '_id',
                as: 'clientDetails',
              },
            },
            {
              $project: {
                _id: 1,
                totalIncasat: 1,
                clientName: {
                  $ifNull: [
                    { $arrayElemAt: ['$clientDetails.name', 0] },
                    'Client Șters',
                  ],
                },
              },
            },
            { $sort: { totalIncasat: -1 } },
          ],
        },
      },
    ])

    const data: ClientPaymentSummary = {
      totalIncasatPerioada: results[0]?.totalIncasatPerioada[0]?.total || 0,
      summaryList: results[0]?.summaryList || [],
    }
    return JSON.parse(JSON.stringify(data))
  } catch (error) {
    console.error('❌ Eroare getDynamicClientSummary:', error)
    return { totalIncasatPerioada: 0, summaryList: [] }
  }
}

/**
 * 3. Prelucrează datele DINAMICE pentru Plăți (Card 4 și Lista 6)
 * pe baza unui interval de date.
 */
export async function getDynamicBudgetSummary(
  startDate: Date,
  endDate: Date
): Promise<BudgetPaymentSummary> {
  try {
    await connectToDatabase()

    const results = await SupplierPaymentModel.aggregate([
      // 1. Filtrează plățile
      {
        $match: {
          paymentDate: { $gte: startDate, $lte: endDate },
          status: { $ne: 'ANULATA' },
        },
      },
      // 2. $facet pentru a rula 2 agregări în paralel
      {
        $facet: {
          // --- Card 4: Total Plăți (Perioadă) ---
          totalPlatiPerioada: [
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' },
              },
            },
          ],
          // --- Lista 6: Sumar pe Buget (doar cele care au buget) ---
          summaryList: [
            {
              $match: {
                budgetCategorySnapshot: { $exists: true },
              },
            },
            {
              $group: {
                _id: {
                  main: '$budgetCategorySnapshot.mainCategoryName',
                  sub: {
                    $ifNull: [
                      '$budgetCategorySnapshot.subCategoryName',
                      'Fără Subcategorie',
                    ],
                  },
                },
                total: { $sum: '$totalAmount' },
              },
            },
            {
              $group: {
                _id: '$_id.main',
                mainTotal: { $sum: '$total' },
                subcategories: {
                  $push: {
                    name: '$_id.sub',
                    total: '$total',
                  },
                },
              },
            },
            { $sort: { mainTotal: -1 } },
          ],
        },
      },
    ])

    const data: BudgetPaymentSummary = {
      totalPlatiPerioada: results[0]?.totalPlatiPerioada[0]?.total || 0,
      summaryList: results[0]?.summaryList || [],
    }
    return JSON.parse(JSON.stringify(data))
  } catch (error) {
    console.error('❌ Eroare getDynamicBudgetSummary:', error)
    return { totalPlatiPerioada: 0, summaryList: [] }
  }
}
export async function getOverdueClientsSummary(): Promise<
  OverdueClientSummary[]
> {
  try {
    await connectToDatabase()
    const today = new Date()

    const summary = await InvoiceModel.aggregate([
      // 1. Filtrează facturile relevante
      {
        $match: {
          status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
          remainingAmount: { $gt: 0 },
          dueDate: { $lt: today }, // Scadența este în trecut
        },
      },
      // 2. Calculează zilele de întârziere PENTRU FIECARE factură
      {
        $addFields: {
          daysOverdue: {
            $floor: {
              $divide: [
                { $subtract: [today, '$dueDate'] },
                1000 * 60 * 60 * 24, // Milisecunde într-o zi
              ],
            },
          },
        },
      },
      // 3. Grupează după Client
      {
        $group: {
          _id: '$clientId', // Grupează după ID-ul clientului
          totalOverdue: { $sum: '$remainingAmount' },
          // Adaugă detaliile facturii într-un array
          overdueInvoices: {
            $push: {
              _id: '$_id',
              seriesName: '$seriesName',
              invoiceNumber: '$invoiceNumber',
              dueDate: '$dueDate',
              remainingAmount: '$remainingAmount',
              daysOverdue: '$daysOverdue', 
            },
          },
        },
      },
      // 4. Adaugă detaliile clientului (Numele)
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'clientDetails',
        },
      },
      // 5. Curăță documentele (dacă nu există client, e o problemă, dar îl lăsăm)
      {
        $unwind: {
          path: '$clientDetails',
          preserveNullAndEmptyArrays: true, 
        },
      },
      // 6. Proiectează formatul final
      {
        $project: {
          _id: 1,
          clientName: { $ifNull: ['$clientDetails.name', 'Client Șters'] },
          totalOverdue: 1,
          overdueInvoices: 1,
        },
      },
      // 7. Sortează după cea mai mare datorie
      {
        $sort: { totalOverdue: -1 },
      },
    ])

    return JSON.parse(JSON.stringify(summary))
  } catch (error) {
    console.error('❌ Eroare getOverdueClientsSummary:', error)
    return []
  }
}
