'use server'

import { Types } from 'mongoose'
import { connectToDatabase } from '@/lib/db'
import InvoiceModel from '@/lib/db/modules/financial/invoices/invoice.model'
import { SalesFilterOptions, AgentOverviewResponse } from './agent-sales.types'
import { TIMEZONE } from '@/lib/constants'

export async function getAgentSalesStats(filters: SalesFilterOptions): Promise<{
  success: boolean
  data?: AgentOverviewResponse
  message?: string
}> {
  try {
    await connectToDatabase()

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

      // 4. Calcul Net Quantity (Scădem Storno)
      {
        $addFields: {
          netQuantity: {
            $subtract: [
              '$items.quantity',
              { $ifNull: ['$items.stornedQuantity', 0] },
            ],
          },
        },
      },
      { $match: { netQuantity: { $gt: 0 } } },

      // 5. LOOKUP PRODUSE (Pentru conversii UM)
      // Avem nevoie de datele produsului (câți saci sunt într-un palet, câte kg are un sac)
      {
        $lookup: {
          from: 'erpproducts',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },

      // 6. LOOKUP STOC (Pentru Fallback Price)
      // Căutăm în InventoryItems prețul maxim de achiziție pentru acest produs
      {
        $lookup: {
          from: 'inventoryitems',
          let: { prodId: '$items.productId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$stockableItem', '$$prodId'] } } },
            // Sortăm descrescător după preț max, ca să luăm "cel mai scump" istoric (safe bet pentru profit)
            { $sort: { maxPurchasePrice: -1 } },
            { $limit: 1 },
            { $project: { maxPurchasePrice: 1, unitMeasure: 1 } },
          ],
          as: 'stockData',
        },
      },
      { $unwind: { path: '$stockData', preserveNullAndEmptyArrays: true } },

      // 7. CALCULE COMPLEXE DE CONVERSIE ȘI COST
      {
        $addFields: {
          // A. Calculăm factorul de conversie pentru linia din FACTURĂ
          // Dacă factura e pe "Palet", vrem să știm câte unități de bază (ex: kg) înseamnă asta.
          // Căutăm în snapshot-ul 'packagingOptions' din factură.
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

          // B. Calculăm factorul de conversie pentru STOC
          // Dacă prețul din stoc e pe "Sac", vrem să știm câte unități de bază (kg) are un sac.
          stockPriceBaseFactor: {
            $switch: {
              branches: [
                // Cazul 1: Stocul e în Unitatea de Ambalare (ex: Sac)
                {
                  case: {
                    $eq: [
                      '$stockData.unitMeasure',
                      '$productDoc.packagingUnit',
                    ],
                  },
                  then: { $ifNull: ['$productDoc.packagingQuantity', 1] },
                },
                // Cazul 2: Stocul e în Unitatea de Bază (ex: Kg/Buc)
                {
                  case: { $eq: ['$stockData.unitMeasure', '$productDoc.unit'] },
                  then: 1,
                },
                // (Putem adăuga caz pentru Palet, dar e rar ca stocul să fie ținut în paleți ca UM principal)
              ],
              default: 1,
            },
          },
        },
      },

      // 8. CALCUL FINAL AL COSTULUI (Cu Fallback)
      {
        $addFields: {
          // Prețul de bază unitar din stoc (ex: Preț per KG)
          // = Preț Stoc (per Sac) / 40 (Kg/Sac)
          fallbackBaseUnitTestPrice: {
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

          // Costul estimat al liniei = (Cantitate Factură * Factor Factură) * Preț Bază Stoc
          // Ex: (1 Palet * 1600kg) * (0.5 RON/kg) = 800 RON
          estimatedLineCost: {
            $multiply: [
              { $multiply: ['$netQuantity', '$invoiceLineBaseFactor'] }, // Cantitate totală în unități de bază
              {
                // Prețul unitar de bază calculat mai sus
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

          // Ratio pentru storno (folosit doar dacă avem cost FIFO valid)
          usageRatio: { $divide: ['$netQuantity', '$items.quantity'] },
        },
      },

      // 9. SELECTAREA COSTULUI FINAL
      {
        $addFields: {
          // Venitul e simplu: valoarea liniei ajustată la storno
          finalRevenue: { $multiply: ['$items.lineValue', '$usageRatio'] },

          // Costul e tricky:
          finalCost: {
            $cond: [
              // Dacă avem un cost FIFO valid (> 1 RON să zicem, ca să evităm 0.00), îl folosim
              { $gt: ['$items.lineCostFIFO', 1] },
              { $multiply: ['$items.lineCostFIFO', '$usageRatio'] },
              // ALTFEL, folosim costul estimat din "Preț Max"
              '$estimatedLineCost',
            ],
          },
        },
      },

      // 10. GRUPARE & FORMATARE (La fel ca înainte)
      {
        $group: {
          _id: '$salesAgentId',
          agentName: { $first: '$salesAgentSnapshot.name' },
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
              { $gt: ['$totalRevenue', 0] },
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
      // Adăugăm filtrarea opțională după agent, dacă filtrul există
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
      // Lookup-uri pentru datele de produs și preț stoc
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

      {
        $addFields: {
          netQuantity: {
            $subtract: [
              '$items.quantity',
              { $ifNull: ['$items.stornedQuantity', 0] },
            ],
          },
          usageRatio: {
            $cond: [
              { $gt: ['$items.quantity', 0] },
              {
                $divide: [
                  {
                    $subtract: [
                      '$items.quantity',
                      { $ifNull: ['$items.stornedQuantity', 0] },
                    ],
                  },
                  '$items.quantity',
                ],
              },
              0,
            ],
          },
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
      {
        $addFields: {
          // Detectăm dacă folosim Fallback (preț stoc) sau FIFO (preț real factură)
          isFallback: { $lte: [{ $ifNull: ['$items.lineCostFIFO', 0] }, 1] },
          finalRevenue: { $multiply: ['$items.lineValue', '$usageRatio'] },
          finalCost: {
            $cond: [
              { $gt: ['$items.lineCostFIFO', 1] },
              { $multiply: ['$items.lineCostFIFO', '$usageRatio'] },
              {
                $multiply: [
                  { $multiply: ['$netQuantity', '$invoiceLineBaseFactor'] },
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
            $first: { $ifNull: ['$salesAgentSnapshot.name', 'Necunoscut'] },
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
