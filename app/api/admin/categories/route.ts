import { NextResponse } from 'next/server'
import {
  createCategory,
  getAllCategoriesForAdmin,
} from '@/lib/db/modules/category/category.actions'
import { formatError } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

// POST /api/admin/categories - Creează o categorie nouă
export async function POST(request: Request) {
  try {
    const data = await request.json()
    const result = await createCategory(data)

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 400 })
    }
    revalidatePath('/admin/categories')
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: formatError(error) }, { status: 500 })
  }
}

// GET /api/admin/categories - Obține toate categoriile cu paginare
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1

    const result = await getAllCategoriesForAdmin({ page })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ message: formatError(error) }, { status: 500 })
  }
}
