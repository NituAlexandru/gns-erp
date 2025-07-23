import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ProductModel from '@/lib/db/modules/product/product.model'
import PackagingModel from '@/lib/db/modules/packaging-products/packaging.model'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // await params before destructuring
  const { id } = await params
  const { isPublished } = await request.json()

  await connectToDatabase()

  // Try ERP products
  const prod = await ProductModel.findById(id)
  if (prod) {
    prod.isPublished = isPublished
    await prod.save()
    return NextResponse.json({ success: true })
  }

  // Fallback to packagings
  const pack = await PackagingModel.findById(id)
  if (pack) {
    pack.isPublished = isPublished
    await pack.save()
    return NextResponse.json({ success: true })
  }

  // Not found anywhere
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  await connectToDatabase()
  const doc = await ProductModel.findById(id)
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(doc)
}
