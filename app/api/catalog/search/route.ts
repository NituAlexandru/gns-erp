import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ProductModel from '@/lib/db/modules/product/product.model'
import PackagingModel from '@/lib/db/modules/packaging-products/packaging.model'
import type { ICatalogItem } from '@/lib/db/modules/catalog/catalog.actions'
import { escapeRegex } from '@/lib/db/modules/product/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get('q')?.trim() || ''
  const q = escapeRegex(rawQuery)

  if (!q) {
    return NextResponse.json<ICatalogItem[]>([], { status: 200 })
  }

  await connectToDatabase()

  // 1) ERP products
  const products = await ProductModel.aggregate([
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
    {
      $project: {
        _id: 1,
        productCode: 1,
        image: { $arrayElemAt: ['$images', 0] },
        name: 1,
        category: '$cat.name',
        averagePurchasePrice: {
          $ifNull: ['$averagePurchasePrice', '$entryPrice', 0],
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
        countInStock: 1,
        barCode: 1,
      },
    },
    { $limit: 50 },
  ])

  // 2) packagings
  const packages = await PackagingModel.aggregate([
    {
      $match: {
        isPublished: true,
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
        productCode: 1,
        image: { $arrayElemAt: ['$images', 0] },
        name: 1,
        category: '$cat.name',
        averagePurchasePrice: {
          $ifNull: ['$averagePurchasePrice', '$entryPrice', 0],
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
        countInStock: 1,
        barCode: 1,
      },
    },
    { $limit: 50 },
  ])

  // 3) merge into ICatalogItem[]
  const items: ICatalogItem[] = [
    ...products.map((p) => ({
      _id: p._id.toString(),
      productCode: p.productCode,
      image: p.image,
      name: p.name,
      category: p.category ?? null,
      averagePurchasePrice: p.averagePurchasePrice,
      defaultMarkups: p.defaultMarkups,
      countInStock: p.countInStock,
      barCode: p.barCode ?? null,
    })),
    ...packages.map((p) => ({
      _id: p._id.toString(),
      productCode: p.productCode,
      image: p.image,
      name: p.name,
      category: p.category ?? null,
      averagePurchasePrice: p.averagePurchasePrice,
      defaultMarkups: p.defaultMarkups,
      countInStock: p.countInStock,
      barCode: p.barCode ?? null,
    })),
  ]

  return NextResponse.json(items, { status: 200 })
}
