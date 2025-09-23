'use server'

import { connectToDatabase } from '@/lib/db'
import ERPProductModel from '@/lib/db/modules/product/product.model'
import type { PipelineStage, Types } from 'mongoose'
import { ADMIN_PRODUCT_PAGE_SIZE } from '@/lib/db/modules/product/constants'
import { IAdminCatalogItem, IAdminCatalogPage } from './types'

type DefaultMarkups = {
  markupDirectDeliveryPrice?: number
  markupFullTruckPrice?: number
  markupSmallDeliveryBusinessPrice?: number
  markupRetailPrice?: number
}

type RawAdminCatalogDoc = {
  _id: Types.ObjectId
  productCode: string
  image: string | null
  name: string
  averagePurchasePrice: number
  defaultMarkups?: DefaultMarkups
  barCode: string | null
  isPublished: boolean
  createdAt: Date
  unit: string
  packagingOptions: {
    unitName: string
    baseUnitEquivalent: number
  }[]
  totalStock: number
}

export async function getAdminCatalogPage({
  page = 1,
  limit = ADMIN_PRODUCT_PAGE_SIZE,
}: {
  page?: number
  limit?: number
}): Promise<IAdminCatalogPage> {
  await connectToDatabase()
  const skip = (page - 1) * limit

  const agg: PipelineStage[] = [
    {
      $project: {
        _id: 1,
        productCode: 1,
        image: { $arrayElemAt: ['$images', 0] },
        name: 1,
        defaultMarkups: 1,
        barCode: 1,
        isPublished: 1,
        createdAt: 1,
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
          {
            $project: {
              _id: 1,
              productCode: 1,
              image: { $arrayElemAt: ['$images', 0] },
              name: 1,
              defaultMarkups: 1,
              barCode: '$productCode',
              isPublished: 1,
              createdAt: 1,
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
        from: 'inventoryitems',
        localField: '_id',
        foreignField: 'stockableItem',
        as: 'inventoryDocs',
      },
    },
    {
      $addFields: {
        totalStock: { $ifNull: [{ $sum: '$inventoryDocs.totalStock' }, 0] },
        averagePurchasePrice: {
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
    { $sort: { name: 1 } },
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

  const rawData = (res?.data ?? []) as RawAdminCatalogDoc[]

  const data: IAdminCatalogItem[] = rawData.map((doc) => ({
    _id: doc._id.toString(),
    productCode: doc.productCode,
    image: doc.image ?? null,
    name: doc.name,
    averagePurchasePrice: doc.averagePurchasePrice,
    defaultMarkups: {
      markupDirectDeliveryPrice:
        doc.defaultMarkups?.markupDirectDeliveryPrice ?? 0,
      markupFullTruckPrice: doc.defaultMarkups?.markupFullTruckPrice ?? 0,
      markupSmallDeliveryBusinessPrice:
        doc.defaultMarkups?.markupSmallDeliveryBusinessPrice ?? 0,
      markupRetailPrice: doc.defaultMarkups?.markupRetailPrice ?? 0,
    },
    barCode: doc.barCode ?? null,
    createdAt: doc.createdAt,
    isPublished: doc.isPublished ?? false,
    // Câmpuri lipsă adăugate:
    totalStock: doc.totalStock,
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
