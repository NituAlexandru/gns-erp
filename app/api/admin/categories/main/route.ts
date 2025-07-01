import { NextResponse } from 'next/server'
import { getMainCategories } from '@/lib/db/modules/category/category.actions'
import { formatError } from '@/lib/utils'

// GET /api/admin/categories/main - Obține doar categoriile principale
export async function GET() {
  try {
    const result = await getMainCategories()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ message: formatError(error) }, { status: 500 })
  }
}
