import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import {
  deleteSupplier,
  getSupplierById,
  updateSupplier,
} from '@/lib/db/modules/suppliers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const doc = await getSupplierById(id)
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json(
      { message: 'Supplier inexistent' },
      { status: 404 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  if (data._id !== id) {
    return NextResponse.json(
      { message: 'ID-urile nu corespund.' },
      { status: 400 }
    )
  }
  const result = await updateSupplier(data)
  if (!result.success)
    return NextResponse.json({ message: result.message }, { status: 400 })
  revalidatePath('/admin/suppliers')
  revalidatePath(`/admin/suppliers/${id}`)
  return NextResponse.json(result)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const result = await deleteSupplier(id)
    revalidatePath('/admin/suppliers')
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json(
      { message: (err as Error).message },
      { status: 400 }
    )
  }
}
