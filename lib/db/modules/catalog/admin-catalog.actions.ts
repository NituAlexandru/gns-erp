'use server'

import { connectToDatabase } from '@/lib/db'
import ERPProductModel from '@/lib/db/modules/product/product.model'
import type { PipelineStage } from 'mongoose'
import { ADMIN_PRODUCT_PAGE_SIZE } from '@/lib/db/modules/product/constants'

export interface IAdminCatalogItem {
  _id: string
  productCode: string
  image: string | null
  name: string
  averagePurchasePrice: number
  defaultMarkups: {
    markupDirectDeliveryPrice: number
    markupFullTruckPrice: number
    markupSmallDeliveryBusinessPrice: number
    markupRetailPrice: number
  }
  barCode: string | null
  createdAt: Date
}
export interface IAdminCatalogPage {
  data: IAdminCatalogItem[]
  total: number
  totalPages: number
  from: number
  to: number
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
    // proiectare produse
    {
      $project: {
        _id: 1,
        productCode: 1,
        image: { $arrayElemAt: ['$images', 0] },
        name: 1,
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
        barCode: 1,
        createdAt: 1,
      },
    },
    // union cu ambalajele
    {
      $unionWith: {
        coll: 'packagings',
        pipeline: [
          {
            $project: {
              _id: 1,
              productCode: '$productCode',
              image: { $arrayElemAt: ['$images', 0] },
              name: 1,
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
              barCode: '$productCode',
              createdAt: 1,
            },
          },
        ],
      },
    },
    // sort + paginate
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
  //eslint-disable-next-line
  const raw = (res?.data ?? []) as any[]

  const data: IAdminCatalogItem[] = raw.map((doc) => ({
    _id: doc._id.toString(),
    productCode: doc.productCode,
    image: doc.image ?? null,
    name: doc.name,
    averagePurchasePrice: doc.averagePurchasePrice,
    defaultMarkups: doc.defaultMarkups,
    barCode: doc.barCode ?? null,
    createdAt: doc.createdAt,
  }))

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit),
    from: skip + 1,
    to: skip + data.length,
  }
}
