import { NextResponse } from 'next/server'
import { ERPProductModel } from '@/lib/db/modules/product'

export async function GET() {
  const pallets = await ERPProductModel.find({ category: 'Paleti' })
    .select([
      '_id',
      'slug',
      'brand',
      'images',
      'price',
      'countInStock',
      'length',
      'width',
      'height',
      'weight',
      'volume',
      'palletTypeId',
    ])
    .lean()

  return NextResponse.json(pallets)
}
