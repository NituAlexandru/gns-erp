import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ProductModel from '@/lib/db/modules/product/product.model'
import PackagingModel from '@/lib/db/modules/packaging-products/packaging.model'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // must await params
  const { id } = await params

  await connectToDatabase()

  // try ERP products
  const prod = await ProductModel.findByIdAndDelete(id)
  if (prod) {
    return NextResponse.json({ success: true })
  }

  // try packaging products
  const pack = await PackagingModel.findByIdAndDelete(id)
  if (pack) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
