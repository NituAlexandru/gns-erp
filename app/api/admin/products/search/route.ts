import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ProductModel from '@/lib/db/modules/product/product.model'
import PackagingModel from '@/lib/db/modules/packaging-products/packaging.model'
import type { AdminProductSearchResult } from '@/lib/db/modules/product/types'
import { escapeRegex } from '@/lib/db/modules/product/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get('q')?.trim() || ''
  const type = searchParams.get('type')
  const q = escapeRegex(rawQuery)

  if (!q) {
    return NextResponse.json<AdminProductSearchResult[]>([], { status: 200 })
  }

  await connectToDatabase()

  // Inițializăm listele ca fiind goale
  //eslint-disable-next-line
  let products: any[] = []
  //eslint-disable-next-line
  let packages: any[] = []

  // Extragem logica de interogare pentru a o refolosi
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
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'cat',
      },
    },
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: 1,
        productCode: 1,
        averagePurchasePrice: 1,
        defaultMarkups: 1,
        image: { $arrayElemAt: ['$images', 0] },
        category: '$cat.name',
        barCode: 1,
        isPublished: 1,
        unit: 1,
        packagingUnit: 1,
        packagingQuantity: 1,
        itemsPerPallet: 1,
      },
    },
    { $limit: 50 },
  ]

  const packagingQuery = [
    {
      $match: {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { productCode: { $regex: q, $options: 'i' } },
          { slug: { $regex: q, $options: 'i' } },
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
      $project: {
        _id: 1,
        name: 1,
        productCode: 1,
        averagePurchasePrice: 1,
        defaultMarkups: 1,
        image: { $arrayElemAt: ['$images', 0] },
        category: '$cat.name',
        barCode: 1,
        isPublished: 1,
        unit: 1,
        packagingUnit: 1,
        packagingQuantity: 1,
        itemsPerPallet: 1,
      },
    },
    { $limit: 50 },
  ]

  // ---  Logica de filtrare ---
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
  // --- Sfârșitul logicii de filtrare ---

  const results: AdminProductSearchResult[] = [
    ...products.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      unit: p.unit,
      packagingUnit: p.packagingUnit,
      packagingQuantity: p.packagingQuantity,
      itemsPerPallet: p.itemsPerPallet,
      productCode: p.productCode,
      averagePurchasePrice: p.averagePurchasePrice ?? 0,
      defaultMarkups: {
        markupDirectDeliveryPrice:
          p.defaultMarkups?.markupDirectDeliveryPrice ?? 0,
        markupFullTruckPrice: p.defaultMarkups?.markupFullTruckPrice ?? 0,
        markupSmallDeliveryBusinessPrice:
          p.defaultMarkups?.markupSmallDeliveryBusinessPrice ?? 0,
        markupRetailPrice: p.defaultMarkups?.markupRetailPrice ?? 0,
      },
      image: p.image ?? null,
      category: p.category ?? null,
      barCode: p.barCode ?? null,
      isPublished: p.isPublished,
    })),
    ...packages.map((pkg) => ({
      _id: pkg._id.toString(),
      name: pkg.name,
      unit: pkg.unit,
      packagingUnit: pkg.packagingUnit,
      packagingQuantity: pkg.packagingQuantity,
      itemsPerPallet: pkg.itemsPerPallet,
      productCode: pkg.productCode,
      averagePurchasePrice: pkg.averagePurchasePrice ?? 0,
      defaultMarkups: {
        markupDirectDeliveryPrice:
          pkg.defaultMarkups?.markupDirectDeliveryPrice ?? 0,
        markupFullTruckPrice: pkg.defaultMarkups?.markupFullTruckPrice ?? 0,
        markupSmallDeliveryBusinessPrice:
          pkg.defaultMarkups?.markupSmallDeliveryBusinessPrice ?? 0,
        markupRetailPrice: pkg.defaultMarkups?.markupRetailPrice ?? 0,
      },
      image: pkg.image ?? null,
      category: pkg.category ?? null,
      barCode: pkg.barCode ?? null,
      isPublished: pkg.isPublished,
    })),
  ]

  return NextResponse.json<AdminProductSearchResult[]>(results, { status: 200 })
}
