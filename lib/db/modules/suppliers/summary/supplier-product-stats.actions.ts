'use server'

import { connectToDatabase } from '@/lib/db'
import ReceptionModel from '../../reception/reception.model' 
import { CLIENT_DETAIL_PAGE_SIZE } from '@/lib/constants'
import mongoose, { PipelineStage, Types } from 'mongoose'

export interface SupplierProductStat {
  _id: string
  productName: string
  itemType: 'Produs' | 'Ambalaj'
  totalValue: number
}

export type SupplierProductStatsPage = {
  success: boolean
  data: SupplierProductStat[]
  totalPages: number
  total: number
  message?: string
}

export async function getProductStatsForSupplier(
  supplierId: string,
  page: number = 1
): Promise<SupplierProductStatsPage> {
  try {
    await connectToDatabase()

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      throw new Error('ID Furnizor invalid')
    }

    const objectId = new Types.ObjectId(supplierId)
    const limit = CLIENT_DETAIL_PAGE_SIZE
    const skip = (page - 1) * limit

    const aggregationPipeline: PipelineStage[] = [
      // 1. Filtrare: Doar recepțiile acestui furnizor care sunt CONFIRMATE
      {
        $match: {
          supplier: objectId,
          status: 'CONFIRMAT',
        },
      },
      // 2. Proiectăm un singur array 'allItems' care combină Produsele și Ambalajele
      {
        $project: {
          allItems: {
            $concatArrays: [
              // Mapăm Produsele
              {
                $map: {
                  input: { $ifNull: ['$products', []] },
                  as: 'p',
                  in: {
                    name: '$$p.productName',
                    type: 'Produs',
                    // Calculăm valoarea liniei: quantity * invoicePricePerUnit
                    value: {
                      $multiply: [
                        { $ifNull: ['$$p.quantity', 0] },
                        { $ifNull: ['$$p.invoicePricePerUnit', 0] },
                      ],
                    },
                  },
                },
              },
              // Mapăm Ambalajele
              {
                $map: {
                  input: { $ifNull: ['$packagingItems', []] },
                  as: 'pkg',
                  in: {
                    name: '$$pkg.packagingName',
                    type: 'Ambalaj',
                    value: {
                      $multiply: [
                        { $ifNull: ['$$pkg.quantity', 0] },
                        { $ifNull: ['$$pkg.invoicePricePerUnit', 0] },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
      // 3. "Spargem" array-ul combinat
      { $unwind: '$allItems' },
      // 4. Grupăm după Nume și Tip
      {
        $group: {
          _id: {
            name: '$allItems.name',
            type: '$allItems.type',
          },
          totalValue: { $sum: '$allItems.value' },
        },
      },
      // 5. Sortăm descrescător după valoare
      { $sort: { totalValue: -1 } },
      // 6. Paginare
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
      // 7. Formatare finală
      { $unwind: '$metadata' },
      {
        $project: {
          total: '$metadata.total',
          data: {
            $map: {
              input: '$data',
              as: 'item',
              in: {
                _id: { $concat: ['$$item._id.name', '-', '$$item._id.type'] },
                productName: '$$item._id.name',
                itemType: '$$item._id.type',
                totalValue: '$$item.totalValue',
              },
            },
          },
        },
      },
    ]

    const result = await ReceptionModel.aggregate(aggregationPipeline)

    if (result.length === 0) {
      return { success: true, data: [], totalPages: 0, total: 0 }
    }

    const pageData = result[0]

    return {
      success: true,
      data: JSON.parse(JSON.stringify(pageData.data)),
      totalPages: Math.ceil(pageData.total / limit),
      total: pageData.total,
    }
  } catch (error) {
    console.error('Eroare la getProductStatsForSupplier:', error)
    return {
      success: false,
      data: [],
      totalPages: 0,
      total: 0,
      message: error instanceof Error ? error.message : 'Eroare necunoscută',
    }
  }
}
