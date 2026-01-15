import { NextResponse } from 'next/server'
import { getAllSubCategories } from '@/lib/db/modules/category/category.actions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const subCategories = await getAllSubCategories()
    return NextResponse.json(subCategories)
  } catch (error) {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
