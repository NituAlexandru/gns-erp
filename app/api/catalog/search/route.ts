import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ProductModel from '@/lib/db/modules/product/product.model'
import PackagingModel from '@/lib/db/modules/packaging-products/packaging.model'
import type { ICatalogItem } from '@/lib/db/modules/catalog/types'
import { escapeRegex } from '@/lib/db/modules/product/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get('q')?.trim() || ''
  const q = escapeRegex(rawQuery)

  if (!q) {
    return NextResponse.json<ICatalogItem[]>([], { status: 200 })
  }

  await connectToDatabase()

  // --- Pipeline-ul de bază pentru a adăuga datele de inventar ---
  const addInventoryAndUMPipeline = [
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
  ]

  // --- Pipeline-ul pentru Produse ---
  const productQuery = [
    {
      $match: {
        isPublished: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { productCode: { $regex: q, $options: 'i' } },
          { barCode: { $regex: q, $options: 'i' } },
        ],
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'cat',
      },
    },
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
    ...addInventoryAndUMPipeline,
    {
      $project: {
        _id: 1,
        productCode: 1,
        image: { $arrayElemAt: ['$images', 0] },
        name: 1,
        category: '$cat.name',
        directDeliveryPrice: 1,
        fullTruckPrice: 1,
        smallDeliveryBusinessPrice: 1,
        retailPrice: 1,
        totalStock: 1,
        barCode: 1,
        isPublished: 1,
        unit: 1,
        packagingOptions: 1,
      },
    },
    { $limit: 25 },
  ]

  // --- Pipeline-ul pentru Ambalaje ---
  const packagingQuery = [
    {
      $match: {
        isPublished: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { productCode: { $regex: q, $options: 'i' } },
        ],
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'mainCategory',
        foreignField: '_id',
        as: 'cat',
      },
    },
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        unit: '$packagingUnit',
        packagingUnit: null,
        packagingQuantity: null,
        itemsPerPallet: { $ifNull: ['$itemsPerPallet', 0] },
      },
    }, // Aliniere de date
    ...addInventoryAndUMPipeline,
    {
      $project: {
        _id: 1,
        productCode: 1,
        image: { $arrayElemAt: ['$images', 0] },
        name: 1,
        category: '$cat.name',
        directDeliveryPrice: 1,
        fullTruckPrice: 1,
        smallDeliveryBusinessPrice: 1,
        retailPrice: 1,
        totalStock: 1,
        barCode: 1,
        isPublished: 1,
        unit: 1,
        packagingOptions: 1,
      },
    },
    { $limit: 25 },
  ]

  const [products, packages] = await Promise.all([
    ProductModel.aggregate(productQuery),
    PackagingModel.aggregate(packagingQuery),
  ])

  const items: ICatalogItem[] = [...products, ...packages]

  return NextResponse.json(JSON.parse(JSON.stringify(items)), { status: 200 })
}
