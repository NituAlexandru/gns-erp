import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ProductModel from '@/lib/db/modules/product/product.model'
import PackagingModel from '@/lib/db/modules/packaging-products/packaging.model'
import type { AdminProductSearchResult } from '@/lib/db/modules/product/types'
import { escapeRegex } from '@/lib/db/modules/product/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get('q')?.trim() || ''
  const q = escapeRegex(rawQuery)
  if (!q) {
    return NextResponse.json<AdminProductSearchResult[]>([], { status: 200 })
  }

  await connectToDatabase()

  const products = await ProductModel.aggregate([
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
      },
    },
    { $limit: 50 },
  ])

  const packages = await PackagingModel.aggregate([
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
      },
    },
    { $limit: 50 },
  ])

  const results: AdminProductSearchResult[] = [
    ...products.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
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
