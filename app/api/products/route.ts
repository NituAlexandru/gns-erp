import { ADMIN_PAGE_SIZE } from '@/lib/constants'
import {
  getAllProducts,
  createProduct,
} from '@/lib/db/modules/product/product.actions'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page')) || 1
  const limit = Number(searchParams.get('limit')) || ADMIN_PAGE_SIZE

  const result = await getAllProducts({
    query: 'all',
    category: 'all',
    mainCategory: 'all',
    tag: 'all',
    price: 'all',
    rating: 'all',
    sort: 'latest',
    page,
    limit,
  })

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const data = await req.json()
  const result = await createProduct(data)
  return result.success
    ? NextResponse.json(result, { status: 201 })
    : NextResponse.json({ message: result.message }, { status: 400 })
}
