'use server'

import { connectToDatabase } from '@/lib/db'
import ERPProductModel from '../product/product.model'
import type { PipelineStage, Types } from 'mongoose'
import { PRODUCT_PAGE_SIZE } from '../product/constants'
import { ICatalogItem, ICatalogPage } from './types'

type RawCatalogDoc = {
  _id: Types.ObjectId
  productCode: string
  images: string[]
  name: string
  categoryDoc?: { name: string }
  directDeliveryPrice: number
  fullTruckPrice: number
  smallDeliveryBusinessPrice: number
  retailPrice: number
  totalStock: number
  barCode: string | null
  isPublished: boolean
  createdAt: Date
  unit: string
  packagingOptions: {
    unitName: string
    baseUnitEquivalent: number
  }[]
}

export async function getCatalogPage({
  page = 1,
  limit = PRODUCT_PAGE_SIZE,
}: {
  page?: number
  limit?: number
}): Promise<ICatalogPage> {
  await connectToDatabase()
  const skip = (page - 1) * limit

  const agg: PipelineStage[] = [
    { $match: { isPublished: true } },
    {
      $project: {
        _id: 1,
        name: 1,
        defaultMarkups: 1,
        images: 1,
        category: 1,
        barCode: 1,
        productCode: 1,
        createdAt: 1,
        isPublished: 1,
        unit: 1,
        packagingUnit: 1,
        packagingQuantity: 1,
        itemsPerPallet: 1,
      },
    },
    {
      $unionWith: {
        coll: 'packagings',
        pipeline: [
          { $match: { isPublished: true } },
          {
            $project: {
              _id: 1,
              name: 1,
              defaultMarkups: 1,
              images: 1,
              category: '$mainCategory',
              barCode: '$productCode',
              productCode: 1,
              createdAt: 1,
              isPublished: 1,
              unit: '$packagingUnit',
              packagingUnit: null,
              packagingQuantity: null,
              itemsPerPallet: { $ifNull: ['$itemsPerPallet', 0] },
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDoc',
      },
    },
    { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'inventoryitems',
        localField: '_id',
        foreignField: 'stockableItem',
        as: 'inventoryDocs',
      },
    },
    {
      $addFields: {
        totalStock: { $ifNull: [{ $sum: '$inventoryDocs.totalStock' }, 0] },
        purchasePrice: {
          $ifNull: [{ $max: '$inventoryDocs.maxPurchasePrice' }, 0],
        },
        packagingOptions: {
          $concatArrays: [
            {
              $cond: {
                if: {
                  $and: [
                    '$packagingUnit',
                    '$packagingQuantity',
                    { $gt: ['$packagingQuantity', 0] },
                  ],
                },
                then: [
                  {
                    unitName: '$packagingUnit',
                    baseUnitEquivalent: '$packagingQuantity',
                  },
                ],
                else: [],
              },
            },
            {
              $cond: {
                if: { $gt: ['$itemsPerPallet', 0] },
                then: [
                  {
                    unitName: 'Palet',
                    baseUnitEquivalent: {
                      $multiply: [
                        '$itemsPerPallet',
                        { $ifNull: ['$packagingQuantity', 1] },
                      ],
                    },
                  },
                ],
                else: [],
              },
            },
          ],
        },
      },
    },
    {
      $addFields: {
        'defaultMarkups.markupDirectDeliveryPrice': {
          $ifNull: ['$defaultMarkups.markupDirectDeliveryPrice', 0],
        },
        'defaultMarkups.markupFullTruckPrice': {
          $ifNull: ['$defaultMarkups.markupFullTruckPrice', 0],
        },
        'defaultMarkups.markupSmallDeliveryBusinessPrice': {
          $ifNull: ['$defaultMarkups.markupSmallDeliveryBusinessPrice', 0],
        },
        'defaultMarkups.markupRetailPrice': {
          $ifNull: ['$defaultMarkups.markupRetailPrice', 0],
        },
      },
    },
    {
      $addFields: {
        directDeliveryPrice: {
          $multiply: [
            '$purchasePrice',
            {
              $add: [
                1,
                { $divide: ['$defaultMarkups.markupDirectDeliveryPrice', 100] },
              ],
            },
          ],
        },
        fullTruckPrice: {
          $multiply: [
            '$purchasePrice',
            {
              $add: [
                1,
                { $divide: ['$defaultMarkups.markupFullTruckPrice', 100] },
              ],
            },
          ],
        },
        smallDeliveryBusinessPrice: {
          $multiply: [
            '$purchasePrice',
            {
              $add: [
                1,
                {
                  $divide: [
                    '$defaultMarkups.markupSmallDeliveryBusinessPrice',
                    100,
                  ],
                },
              ],
            },
          ],
        },
        retailPrice: {
          $multiply: [
            '$purchasePrice',
            {
              $add: [
                1,
                { $divide: ['$defaultMarkups.markupRetailPrice', 100] },
              ],
            },
          ],
        },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
    { $unwind: { path: '$metadata', preserveNullAndEmptyArrays: true } },
    { $project: { total: '$metadata.total', data: 1 } },
  ]

  const [res] = await ERPProductModel.aggregate(agg)
  const total = res?.total ?? 0

  const rawData = (res?.data ?? []) as RawCatalogDoc[]

  const data: ICatalogItem[] = rawData.map((doc: RawCatalogDoc) => ({
    _id: doc._id.toString(),
    productCode: doc.productCode,
    image: doc.images?.[0] ?? null,
    name: doc.name,
    category: doc.categoryDoc?.name ?? null,
    directDeliveryPrice: doc.directDeliveryPrice ?? 0,
    fullTruckPrice: doc.fullTruckPrice ?? 0,
    smallDeliveryBusinessPrice: doc.smallDeliveryBusinessPrice ?? 0,
    retailPrice: doc.retailPrice ?? 0,
    totalStock: doc.totalStock ?? 0,
    barCode: doc.barCode ?? null,
    isPublished: doc.isPublished,
    unit: doc.unit,
    packagingOptions: doc.packagingOptions,
  }))

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit),
    from: skip + 1,
    to: skip + data.length,
  }
}
