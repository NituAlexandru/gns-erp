import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ProductModel from '@/lib/db/modules/product/product.model'
import PackagingModel from '@/lib/db/modules/packaging-products/packaging.model'
import { escapeRegex } from '@/lib/db/modules/product/utils'
import { IAdminCatalogItem } from '@/lib/db/modules/catalog/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get('q')?.trim() || ''
  const type = searchParams.get('type')
  const q = escapeRegex(rawQuery)

  if (!q) {
    return NextResponse.json([], { status: 200 })
  }

  await connectToDatabase()

  // --- Pipeline-ul de bază pentru a adăuga datele de inventar ---
  const addInventoryAndPackagingOptionsPipeline = [
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
    {
      $project: {
        _id: 1,
        name: 1,
        unit: 1,
        packagingUnit: 1,
        packagingQuantity: 1,
        itemsPerPallet: 1,
        averagePurchasePrice: 1,
        packagingOptions: 1,
        productCode: 1,
        isPublished: 1,
        totalStock: 1,
        defaultMarkups: 1,
        images: { $ifNull: ['$images', []] },
        image: { $arrayElemAt: [{ $ifNull: ['$images', []] }, 0] },
      },
    },
  ]

  // --- Pipeline-ul pentru Produse ---
  const productQuery = [
    {
      $match: {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { productCode: { $regex: q, $options: 'i' } },
          { barCode: { $regex: q, $options: 'i' } },
        ],
      },
    },
    ...addInventoryAndPackagingOptionsPipeline,
    { $limit: 50 },
  ]

  // --- Pipeline-ul pentru Ambalaje ---
  const packagingQuery = [
    {
      $match: {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { productCode: { $regex: q, $options: 'i' } },
        ],
      },
    },
    { $addFields: { unit: '$packagingUnit' } },
    ...addInventoryAndPackagingOptionsPipeline,
    { $limit: 50 },
  ]

  let products: IAdminCatalogItem[] = []
  let packages: IAdminCatalogItem[] = []

  if (type === 'product') {
    products = await ProductModel.aggregate(productQuery)
  } else if (type === 'packaging') {
    packages = await PackagingModel.aggregate(packagingQuery)
  } else {
    const [productResults, packageResults] = await Promise.all([
      ProductModel.aggregate(productQuery),
      PackagingModel.aggregate(packagingQuery),
    ])
    products = productResults
    packages = packageResults
  }

  const results: IAdminCatalogItem[] = [...products, ...packages]

  return NextResponse.json(JSON.parse(JSON.stringify(results)), { status: 200 })
}
