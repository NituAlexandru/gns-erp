import { NextResponse } from 'next/server'
import {
  updateCategory,
  deleteCategory,
  getCategoryById,
} from '@/lib/db/modules/category/category.actions'
import { formatError } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await getCategoryById(id)
    return NextResponse.json(category)
  } catch (error) {
    return NextResponse.json(
      { message: formatError(error) || 'Category not found' },
      { status: 404 }
    )
  }
}

// PUT /api/admin/categories/[id] - Actualizează o categorie
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    if (data._id !== id) {
      return NextResponse.json(
        { message: 'ID-urile nu corespund.' },
        { status: 400 }
      )
    }

    const result = await updateCategory(data)
    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 400 })
    }

    revalidatePath('/admin/categories')
    revalidatePath(`/admin/categories/${id}`)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ message: formatError(error) }, { status: 500 })
  }
}

// DELETE /api/admin/categories/[id] - Șterge o categorie
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await deleteCategory(id)

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 400 })
    }

    revalidatePath('/admin/categories')
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ message: formatError(error) }, { status: 500 })
  }
}
