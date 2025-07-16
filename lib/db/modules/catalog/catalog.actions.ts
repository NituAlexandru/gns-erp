'use server'

import { connectToDatabase } from '@/lib/db'
import ERPProductModel from '../product/product.model'
import type { PipelineStage } from 'mongoose'
import { Types } from 'mongoose'
import { PRODUCT_PAGE_SIZE } from '../product/constants'

export interface ICatalogItem {
  _id: string
  productCode: string
  image: string | null
  name: string
  category: string | null
  averagePurchasePrice: number
  defaultMarkups: {
    markupDirectDeliveryPrice: number
    markupFullTruckPrice: number
    markupSmallDeliveryBusinessPrice: number
    markupRetailPrice: number
  }
  countInStock: number | null
  barCode: string | null
}

export interface ICatalogPage {
  data: ICatalogItem[]
  total: number
  totalPages: number
  from: number
  to: number
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
    // 1) Lookup categorie pentru produse
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDoc',
      },
    },
    { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },

    // 2) Proiectăm produsul
    {
      $project: {
        _id: 1,
        productCode: 1,
        image: { $arrayElemAt: ['$images', 0] },
        name: 1,
        category: '$categoryDoc.name',
        averagePurchasePrice: { $ifNull: ['$averagePurchasePrice', 0] },
        defaultMarkups: {
          $ifNull: [
            '$defaultMarkups',
            {
              markupDirectDeliveryPrice: 0,
              markupFullTruckPrice: 0,
              markupSmallDeliveryBusinessPrice: 0,
              markupRetailPrice: 0,
            },
          ],
        },
        countInStock: 1,
        barCode: 1,
        createdAt: 1,
      },
    },

    // 3) UnionWith ambalaje (cu lookup pentru mainCategory)
    {
      $unionWith: {
        coll: 'packagings',
        pipeline: [
          {
            $lookup: {
              from: 'categories',
              localField: 'mainCategory',
              foreignField: '_id',
              as: 'categoryDoc',
            },
          },
          {
            $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true },
          },
          {
            $project: {
              _id: 1,
              productCode: 1,
              image: { $arrayElemAt: ['$images', 0] },
              name: 1,
              category: '$categoryDoc.name',

              averagePurchasePrice: {
                $ifNull: ['$averagePurchasePrice', 0],
              },
              defaultMarkups: {
                $ifNull: [
                  '$defaultMarkups',
                  {
                    markupDirectDeliveryPrice: 0,
                    markupFullTruckPrice: 0,
                    markupSmallDeliveryBusinessPrice: 0,
                    markupRetailPrice: 0,
                  },
                ],
              },

              countInStock: '$countInStock',
              barCode: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },

    // 4) Sortare + facet pentru paginare
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

  type RawDoc = {
    _id: Types.ObjectId
    productCode: string
    image: string | null
    name: string
    category: string | null
    averagePurchasePrice: number
    defaultMarkups: {
      markupDirectDeliveryPrice: number
      markupFullTruckPrice: number
      markupSmallDeliveryBusinessPrice: number
      markupRetailPrice: number
    }
    countInStock: number | null
    barCode: string | null
  }
  const raw = (res?.data ?? []) as RawDoc[]

  const data: ICatalogItem[] = raw.map((doc) => ({
    _id: doc._id.toString(),
    productCode: doc.productCode,
    image: doc.image,
    name: doc.name,
    category: doc.category ?? null,
    averagePurchasePrice: doc.averagePurchasePrice,
    defaultMarkups: doc.defaultMarkups,
    countInStock: doc.countInStock,
    barCode: doc.barCode,
  }))

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit),
    from: skip + 1,
    to: skip + data.length,
  }
}
