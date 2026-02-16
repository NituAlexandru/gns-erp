'use server'

import { Types } from 'mongoose'
import { connectToDatabase } from '@/lib/db'
import InvoiceModel from '@/lib/db/modules/financial/invoices/invoice.model'
import { SalesFilterOptions, AgentOverviewResponse } from './agent-sales.types'
import { TIMEZONE } from '@/lib/constants'

async function buildAgentReassignmentStage(
  useManualAssignments: boolean | undefined,
) {
  if (!useManualAssignments) return []

  return [
    // 1. LOOKUP robust folosind pipeline pentru a asigura match-ul de ID-uri
    {
      $lookup: {
        from: 'agentclientlists',
        let: { invoiceClientId: '$clientId' }, // Definim clientId din factură ca variabilă
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$$invoiceClientId', '$clientIds'], // Verificăm apartenența în array-ul de ID-uri
              },
            },
          },
          { $project: { agentId: 1 } },
        ],
        as: 'matchedAgentList',
      },
    },
    // 2. Aplicăm realocarea ID-ului agentului
    {
      $addFields: {
        salesAgentId: {
          $cond: [
            { $gt: [{ $size: '$matchedAgentList' }, 0] },
            { $arrayElemAt: ['$matchedAgentList.agentId', 0] },
            '$salesAgentId',
          ],
        },
        // Flag pentru debug (îl poți vedea în obiectul final dacă e nevoie)
        isReassigned: { $gt: [{ $size: '$matchedAgentList' }, 0] },
      },
    },
    // 3. Lookup pentru a lua numele proaspăt din colecția 'users'
    {
      $lookup: {
        from: 'users',
        localField: 'salesAgentId',
        foreignField: '_id',
        as: 'reassignedUserDoc',
      },
    },
    {
      $addFields: {
        // Punem numele nou în computedAgentName (folosit mai jos în grouping)
        computedAgentName: {
          $let: {
            vars: { firstUser: { $arrayElemAt: ['$reassignedUserDoc', 0] } },
            in: '$$firstUser.name',
          },
        },
      },
    },
    // Curățăm câmpurile temporare
    { $project: { matchedAgentList: 0, reassignedUserDoc: 0 } },
  ]
}

export async function getAgentSalesStats(filters: SalesFilterOptions): Promise<{
  success: boolean
  data?: AgentOverviewResponse
  message?: string
}> {
  try {
    await connectToDatabase()
    const reassignmentStage = await buildAgentReassignmentStage(
      filters.useManualAssignments,
    )
    const allowedStatuses = [
      'APPROVED',
      'PAID',
      'PARTIAL_PAID',
      'SENT',
      'ACCEPTED',
    ]
    if (filters.includeDrafts) {
      allowedStatuses.push('CREATED')
    }

    const formatDate = (d: Date) => d.toISOString().split('T')[0]
    const startDateStr = formatDate(filters.startDate)
    const endDateStr = formatDate(filters.endDate)

    const pipeline: any[] = [
      // 1. Filtrare Facturi
      {
        $match: {
          invoiceType: { $ne: 'PROFORMA' },
          status: { $in: allowedStatuses },
          $expr: {
            $and: [
              {
                $gte: [
                  {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$invoiceDate',
                      timezone: TIMEZONE,
                    },
                  },
                  startDateStr,
                ],
              },
              {
                $lte: [
                  {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$invoiceDate',
                      timezone: TIMEZONE,
                    },
                  },
                  endDateStr,
                ],
              },
            ],
          },
        },
      },
      ...reassignmentStage,
      ...(filters.agentId
        ? [{ $match: { salesAgentId: new Types.ObjectId(filters.agentId) } }]
        : []),

      // 2. Desfacem liniile
      { $unwind: '$items' },

      // 3. Doar Produse ERP
      {
        $match: {
          'items.stockableItemType': 'ERPProduct',
          'items.serviceId': { $exists: false },
          'items.isManualEntry': false,
        },
      },

      // 4. Calcul Net Quantity (Folosim cantitatea brută, scăderea se face prin facturi Storno separate)
      {
        $addFields: {
          netQuantity: '$items.quantity',
        },
      },
      // Eliminăm cantitățile 0, dar păstrăm negativele pentru moment (le tratăm cu abs mai jos)
      { $match: { netQuantity: { $ne: 0 } } },

      // 5. LOOKUP PRODUSE
      {
        $lookup: {
          from: 'erpproducts',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },

      // 6. LOOKUP STOC
      {
        $lookup: {
          from: 'inventoryitems',
          let: { prodId: '$items.productId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$stockableItem', '$$prodId'] } } },
            { $sort: { maxPurchasePrice: -1 } },
            { $limit: 1 },
            { $project: { maxPurchasePrice: 1, unitMeasure: 1 } },
          ],
          as: 'stockData',
        },
      },
      { $unwind: { path: '$stockData', preserveNullAndEmptyArrays: true } },

      // 7. CALCULE FACTORI CONVERSIE
      {
        $addFields: {
          invoiceLineBaseFactor: {
            $let: {
              vars: {
                matchedOption: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: { $ifNull: ['$items.packagingOptions', []] },
                        as: 'opt',
                        cond: {
                          $eq: ['$$opt.unitName', '$items.unitOfMeasure'],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
              in: { $ifNull: ['$$matchedOption.baseUnitEquivalent', 1] },
            },
          },
          stockPriceBaseFactor: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      '$stockData.unitMeasure',
                      '$productDoc.packagingUnit',
                    ],
                  },
                  then: { $ifNull: ['$productDoc.packagingQuantity', 1] },
                },
                {
                  case: { $eq: ['$stockData.unitMeasure', '$productDoc.unit'] },
                  then: 1,
                },
              ],
              default: 1,
            },
          },
        },
      },

      // 8. CALCUL COST ESTIMAT & AUXILIARE
      {
        $addFields: {
          // Folosim ABS la netQuantity aici pentru a calcula un cost fizic pozitiv inițial
          absQuantity: { $abs: '$netQuantity' },
          usageRatio: {
            $cond: [
              { $ne: ['$items.quantity', 0] },
              { $divide: ['$netQuantity', '$items.quantity'] },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          estimatedLineCost: {
            $multiply: [
              { $multiply: ['$absQuantity', '$invoiceLineBaseFactor'] },
              {
                $cond: [
                  { $gt: ['$stockPriceBaseFactor', 0] },
                  {
                    $divide: [
                      { $ifNull: ['$stockData.maxPurchasePrice', 0] },
                      '$stockPriceBaseFactor',
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },

      // 9. APLICARE SEMN (STORNO) ȘI CALCUL FINAL - FIXED
      {
        $addFields: {
          // IMPORTANT: Determinăm semnul strict după tipul facturii
          signMultiplier: {
            $cond: [{ $eq: ['$invoiceType', 'STORNO'] }, -1, 1],
          },
        },
      },
      {
        $addFields: {
          isFallback: { $lte: [{ $ifNull: ['$items.lineCostFIFO', 0] }, 1] },

          // RECALCULĂM VENITUL: Cantitate ABSOLUTĂ * Pret * Semn
          // Asta previne eroarea "-5 * -1 = +5". Acum e "|-5| * -1 = -5"
          finalRevenue: {
            $multiply: ['$absQuantity', '$items.unitPrice', '$signMultiplier'],
          },

          // COSTUL FINAL: Cost ABSOLUT * Semn
          // Dacă e Storno, costul devine negativ (se scade din costul total al agentului)
          finalCost: {
            $multiply: [
              {
                $cond: [
                  // Dacă avem cost FIFO valid, luăm valoarea absolută a lui (just in case)
                  { $gt: [{ $abs: '$items.lineCostFIFO' }, 1] },
                  {
                    $multiply: [
                      { $abs: '$items.lineCostFIFO' },
                      { $abs: '$usageRatio' },
                    ],
                  },
                  // Altfel costul estimat (care e deja calculat cu absQuantity)
                  '$estimatedLineCost',
                ],
              },
              '$signMultiplier',
            ],
          },
        },
      },

      // 10. GRUPARE & FORMATARE
      {
        $group: {
          _id: '$salesAgentId',
          agentName: {
            $first: {
              $ifNull: [
                '$computedAgentName',
                '$salesAgentSnapshot.name',
                'Necunoscut',
              ],
            },
          },
          totalRevenue: { $sum: '$finalRevenue' },
          totalCost: { $sum: '$finalCost' },
          uniqueInvoices: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          agentId: '$_id',
          agentName: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalCost: { $round: ['$totalCost', 2] },
          totalProfit: {
            $round: [{ $subtract: ['$totalRevenue', '$totalCost'] }, 2],
          },
          invoiceCount: { $size: '$uniqueInvoices' },
          profitMargin: {
            $cond: [
              { $ne: ['$totalRevenue', 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$totalRevenue', '$totalCost'] },
                      '$totalRevenue',
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]

    const result = await InvoiceModel.aggregate(pipeline)

    const formattedSummary = result.map((item) => ({
      agentId: item.agentId ? item.agentId.toString() : 'unknown',
      agentName: item.agentName || 'Necunoscut',
      totalRevenue: item.totalRevenue,
      totalCost: item.totalCost,
      totalProfit: item.totalProfit,
      profitMargin: Number(item.profitMargin.toFixed(2)),
      invoiceCount: item.invoiceCount,
    }))

    return {
      success: true,
      data: {
        summary: formattedSummary,
        chartData: [],
      },
    }
  } catch (error) {
    console.error('Eroare agregare:', error)
    return { success: false, message: 'Eroare server.' }
  }
}

export async function getAgentSalesDetails(filters: SalesFilterOptions) {
  try {
    await connectToDatabase()
    const reassignmentStage = await buildAgentReassignmentStage(
      filters.useManualAssignments,
    )

    const allowedStatuses = [
      'APPROVED',
      'PAID',
      'PARTIAL_PAID',
      'SENT',
      'ACCEPTED',
    ]
    if (filters.includeDrafts) {
      allowedStatuses.push('CREATED', 'REJECTED')
    }

    const startDateStr = filters.startDate.toISOString().split('T')[0]
    const endDateStr = filters.endDate.toISOString().split('T')[0]

    const pipeline: any[] = [
      {
        $match: {
          invoiceType: { $ne: 'PROFORMA' },
          status: { $in: allowedStatuses },
          $expr: {
            $and: [
              {
                $gte: [
                  {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$invoiceDate',
                      timezone: TIMEZONE,
                    },
                  },
                  startDateStr,
                ],
              },
              {
                $lte: [
                  {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$invoiceDate',
                      timezone: TIMEZONE,
                    },
                  },
                  endDateStr,
                ],
              },
            ],
          },
        },
      },
      ...reassignmentStage,
      ...(filters.agentId && filters.agentId !== 'ALL'
        ? [{ $match: { salesAgentId: new Types.ObjectId(filters.agentId) } }]
        : []),

      { $unwind: '$items' },
      {
        $match: {
          'items.stockableItemType': 'ERPProduct',
          'items.serviceId': { $exists: false },
          'items.isManualEntry': false,
        },
      },
      // Lookup-uri
      {
        $lookup: {
          from: 'erpproducts',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'inventoryitems',
          let: { prodId: '$items.productId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$stockableItem', '$$prodId'] } } },
            { $sort: { maxPurchasePrice: -1 } },
            { $limit: 1 },
          ],
          as: 'stockData',
        },
      },
      { $unwind: { path: '$stockData', preserveNullAndEmptyArrays: true } },

      // Calcule intermediare
      {
        $addFields: {
          netQuantity: '$items.quantity',
          invoiceLineBaseFactor: {
            $let: {
              vars: {
                matchedOption: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: { $ifNull: ['$items.packagingOptions', []] },
                        as: 'opt',
                        cond: {
                          $eq: ['$$opt.unitName', '$items.unitOfMeasure'],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
              in: { $ifNull: ['$$matchedOption.baseUnitEquivalent', 1] },
            },
          },
          stockPriceBaseFactor: {
            $cond: [
              { $eq: ['$stockData.unitMeasure', '$productDoc.packagingUnit'] },
              { $ifNull: ['$productDoc.packagingQuantity', 1] },
              1,
            ],
          },
        },
      },
      // Absolutizarea cantitatii si calcule cost
      {
        $addFields: {
          absQuantity: { $abs: '$netQuantity' },
          usageRatio: {
            $cond: [
              { $ne: ['$items.quantity', 0] },
              { $divide: ['$netQuantity', '$items.quantity'] },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          isFallback: { $lte: [{ $ifNull: ['$items.lineCostFIFO', 0] }, 1] },
          estimatedLineCost: {
            $multiply: [
              { $multiply: ['$absQuantity', '$invoiceLineBaseFactor'] },
              {
                $cond: [
                  { $gt: ['$stockPriceBaseFactor', 0] },
                  {
                    $divide: [
                      { $ifNull: ['$stockData.maxPurchasePrice', 0] },
                      '$stockPriceBaseFactor',
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },

      // --- CALCUL FINAL CU STORNO (FIXED) ---
      {
        $addFields: {
          signMultiplier: {
            $cond: [{ $eq: ['$invoiceType', 'STORNO'] }, -1, 1],
          },
        },
      },
      {
        $addFields: {
          // Folosim absQuantity pentru a evita dubla negare
          finalRevenue: {
            $multiply: ['$absQuantity', '$items.unitPrice', '$signMultiplier'],
          },
          finalCost: {
            $multiply: [
              {
                $cond: [
                  { $gt: [{ $abs: '$items.lineCostFIFO' }, 1] },
                  {
                    $multiply: [
                      { $abs: '$items.lineCostFIFO' },
                      { $abs: '$usageRatio' },
                    ],
                  },
                  '$estimatedLineCost',
                ],
              },
              '$signMultiplier',
            ],
          },
        },
      },

      {
        $sort: {
          invoiceDate: 1,
          invoiceNumber: 1,
        },
      },
      // --- GRUPARE PE AGENT ---
      {
        $group: {
          _id: '$salesAgentId',
          agentName: {
            $first: {
              $ifNull: [
                '$computedAgentName',
                '$salesAgentSnapshot.name',
                'Necunoscut',
              ],
            },
          },
          totalRevenue: { $sum: '$finalRevenue' },
          totalCost: { $sum: '$finalCost' },
          lines: {
            $push: {
              _id: '$_id',
              invoiceType: '$invoiceType',
              invoiceSeries: '$seriesName',
              invoiceNumber: '$invoiceNumber',
              invoiceDate: '$invoiceDate',
              clientName: '$clientSnapshot.name',
              productName: '$items.productName',
              productCode: '$items.productCode',
              unitOfMeasure: '$items.unitOfMeasure',
              quantity: '$netQuantity',
              unitPrice: '$items.unitPrice',
              lineValue: '$finalRevenue',
              costUsed: '$finalCost',
              isFallback: '$isFallback',
              lineProfit: { $subtract: ['$finalRevenue', '$finalCost'] },
            },
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]

    const result = await InvoiceModel.aggregate(pipeline)
    return { success: true, data: JSON.parse(JSON.stringify(result)) }
  } catch (error) {
    console.error('Error in getAgentSalesDetails:', error)
    return { success: false, message: 'Eroare server la preluarea detaliilor.' }
  }
}
