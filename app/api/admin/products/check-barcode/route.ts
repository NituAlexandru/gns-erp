import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ProductModel from '@/lib/db/modules/product/product.model'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    await connectToDatabase()
    const existingProduct = await ProductModel.findOne({ barCode: code }).lean()

    return NextResponse.json({ isAvailable: !existingProduct })
  } catch {
    return NextResponse.json({ message: 'Eroare de server' }, { status: 500 })
  }
}
