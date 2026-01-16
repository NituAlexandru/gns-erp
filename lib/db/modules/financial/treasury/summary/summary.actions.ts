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
                invoiceType: { $ne: 'PROFORMA' },
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
 * 2. Prelucrează datele DINAMICE pentru:
 * - Total Încasat (Cashflow)
 * - Total Facturat (Vânzări)
 * - Sume Nealocate (Bani "în aer")
 */
export async function getDynamicClientSummary(
  startDate: Date,
  endDate: Date
): Promise<ClientPaymentSummary> {
  try {
    await connectToDatabase()
    const endOfDayTo = new Date(endDate)
    endOfDayTo.setHours(23, 59, 59, 999)

    const [paymentResults, invoiceResults] = await Promise.all([
      // A. Agregare PLĂȚI (Încasări + Nealocate)
      ClientPaymentModel.aggregate([
        {
          $match: {
            paymentDate: { $gte: startDate, $lte: endDate },
            status: { $ne: 'ANULATA' },
          },
        },
        {
          $facet: {
            // 1. Total Încasat (Toți banii)
            totalIncasat: [
              { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ],

            // 2. Total Nealocat (Suma banilor care nu au factură legată)
            totalNealocat: [
              { $group: { _id: null, total: { $sum: '$unallocatedAmount' } } },
            ],

            // 3. Lista pe Clienți (Top încasări)
            byClient: [
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

            // 4. Lista Plăților Nealocate (Detaliată pentru acțiune)
            unallocatedPayments: [
              {
                $match: {
                  unallocatedAmount: { $gt: 0.01 }, // Doar cele care mai au bani de alocat
                },
              },
              {
                $lookup: {
                  from: 'clients',
                  localField: 'clientId',
                  foreignField: '_id',
                  as: 'clientDetails',
                },
              },
              {
                $project: {
                  _id: 1,
                  paymentNumber: 1,
                  seriesName: 1,
                  paymentDate: 1,
                  totalAmount: 1,
                  unallocatedAmount: 1,
                  clientName: {
                    $ifNull: [
                      { $arrayElemAt: ['$clientDetails.name', 0] },
                      'Client Necunoscut',
                    ],
                  },
                },
              },
              { $sort: { paymentDate: -1 } }, // Cele mai recente primele
            ],
          },
        },
      ]),

      // B. Agregare FACTURI (Rămâne la fel)
      InvoiceModel.aggregate([
        {
          $match: {
            invoiceDate: { $gte: startDate, $lte: endOfDayTo },
            status: { $in: ['CREATED', 'APPROVED', 'PAID', 'PARTIAL_PAID'] },
            invoiceType: { $ne: 'PROFORMA' },
          },
        },
        {
          $group: {
            _id: null,
            totalInvoiced: {
              $sum: {
                $cond: {
                  if: { $eq: ['$invoiceType', 'STORNO'] },
                  then: { $multiply: ['$totals.grandTotal', -1] },
                  else: '$totals.grandTotal',
                },
              },
            },
          },
        },
      ]),
    ])

    // Extragem datele
    const totalIncasat = paymentResults[0]?.totalIncasat[0]?.total || 0
    const totalNealocat = paymentResults[0]?.totalNealocat[0]?.total || 0
    const summaryList = paymentResults[0]?.byClient || []
    const unallocatedList = paymentResults[0]?.unallocatedPayments || []
    const totalFacturat = invoiceResults[0]?.totalInvoiced || 0

    return JSON.parse(
      JSON.stringify({
        totalIncasatPerioada: totalIncasat,
        totalFacturatPerioada: totalFacturat,
        totalNealocat: totalNealocat,
        summaryList: summaryList,
        unallocatedList: unallocatedList,
      })
    )
  } catch (error) {
    console.error('❌ Eroare getDynamicClientSummary:', error)
    return {
      totalIncasatPerioada: 0,
      totalFacturatPerioada: 0,
      totalNealocat: 0,
      summaryList: [],
      unallocatedList: [],
    }
  }
}

/**
 * 3. Prelucrează datele DINAMICE pentru Plăți (Card 4 și Lista 6)
 * Include plățile fără categorie în "Nealocat" și sortează subcategoriile descrescător.
 */
export async function getDynamicBudgetSummary(
  startDate: Date,
  endDate: Date
): Promise<BudgetPaymentSummary> {
  try {
    await connectToDatabase()

    const results = await SupplierPaymentModel.aggregate([
      // 1. Filtrează plățile pe perioadă
      {
        $match: {
          paymentDate: { $gte: startDate, $lte: endDate },
          status: { $ne: 'ANULATA' },
        },
      },
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
          // --- Lista 6: Sumar pe Buget (Inclusiv Nealocat) ---
          summaryList: [
            // A. Grupare inițială pe Categorie Principală și Subcategorie
            {
              $group: {
                _id: {
                  main: {
                    $ifNull: [
                      '$budgetCategorySnapshot.mainCategoryName',
                      'Nealocat',
                    ],
                  },
                  sub: {
                    $ifNull: [
                      '$budgetCategorySnapshot.subCategoryName',
                      'General',
                    ],
                  },
                },
                total: { $sum: '$totalAmount' },
              },
            },
            // B. SORTARE INTERMEDIARĂ (Critic pentru ordinea subcategoriilor)
            // Sortăm totul descrescător după sumă înainte de a le grupa în array
            {
              $sort: { total: -1 },
            },
            // C. Regrupare pe Categoria Principală
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
            // D. Sortare finală a Categoriilor Principale
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
/**
 * 4. Calculează Clienții Restanți (All-Time)
 * Include toate facturile emise care nu sunt plătite și au termen depășit.
 */
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
          status: { $in: ['APPROVED', 'PARTIAL_PAID', 'SENT', 'CREATED'] },

          remainingAmount: { $gt: 0.01 }, // Fix pentru resturi infime (ex: 0.00001)
          dueDate: { $lt: today }, // Scadența este în trecut
          invoiceType: { $ne: 'PROFORMA' }, // Excludem proformele
        },
      },
      // 2. Calculează zilele de întârziere
      {
        $addFields: {
          daysOverdue: {
            $floor: {
              $divide: [
                { $subtract: [today, '$dueDate'] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },
      // 3. Grupează după Client
      {
        $group: {
          _id: '$clientId',
          totalOverdue: { $sum: '$remainingAmount' },
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
      // 4. Populate Nume Client
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'clientDetails',
        },
      },
      {
        $unwind: {
          path: '$clientDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      // 5. Format final
      {
        $project: {
          _id: 1,
          clientName: { $ifNull: ['$clientDetails.name', 'Client Necunoscut'] },
          totalOverdue: 1,
          overdueInvoices: 1,
        },
      },
      // 6. Sortează descrescător după suma datorată
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

/**
 * 5. Calculează Totalul Facturat (Volum Vânzări) într-o perioadă.
 * Aceasta este funcție separată pentru Cardul "Total Facturat".
 */
export async function getDynamicInvoicedTotal(
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    await connectToDatabase()

    // Ajustăm data de final să includă toată ziua (23:59:59)
    const endOfDayTo = new Date(endDate)
    endOfDayTo.setHours(23, 59, 59, 999)

    const result = await InvoiceModel.aggregate([
      {
        $match: {
          invoiceDate: { $gte: startDate, $lte: endOfDayTo },
          status: { $in: ['CREATED', 'APPROVED', 'PAID', 'PARTIAL_PAID'] },
          invoiceType: { $ne: 'PROFORMA' }, // Ignorăm proformele
        },
      },
      {
        $group: {
          _id: null,
          totalInvoiced: {
            $sum: {
              $cond: {
                if: { $eq: ['$invoiceType', 'STORNO'] },
                then: { $multiply: ['$totals.grandTotal', -1] }, // Storno scade
                else: '$totals.grandTotal', // Standard și Avans adună
              },
            },
          },
        },
      },
    ])

    return result[0]?.totalInvoiced || 0
  } catch (error) {
    console.error('❌ Eroare getDynamicInvoicedTotal:', error)
    return 0
  }
}
