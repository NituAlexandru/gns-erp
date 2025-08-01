import { NextResponse } from 'next/server'
import { getLastPurchasePrice } from '@/lib/db/modules/inventory/pricing'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { message: 'ID-ul produsului lipsește' },
        { status: 400 }
      )
    }

    const price = await getLastPurchasePrice(id)

    return NextResponse.json({ price })
  } catch (error) {
    console.error(`[PRODUCT_LAST_PRICE_GET]`, error)
    return NextResponse.json(
      { message: 'Eroare internă server' },
      { status: 500 }
    )
  }
}
