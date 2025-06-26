import { NextResponse } from 'next/server'
import Product from '@/lib/db/models/product.model'

export async function GET() {
  const pallets = await Product.find({ category: 'Paleti' })
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
