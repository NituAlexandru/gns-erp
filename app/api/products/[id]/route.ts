import { NextResponse } from 'next/server'
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from '@/lib/db/modules/product/product.actions'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const doc = await getProductById(id)
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ message: 'Produs inexistent' }, { status: 404 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await req.json()
  if (data._id !== id) {
    return NextResponse.json({ message: 'ID nu corespunde' }, { status: 400 })
  }
  const result = await updateProduct(data)
  return result.success
    ? NextResponse.json(result)
    : NextResponse.json({ message: result.message }, { status: 400 })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await deleteProduct(id)
  return result.success
    ? NextResponse.json(result)
    : NextResponse.json({ message: result.message }, { status: 400 })
}
