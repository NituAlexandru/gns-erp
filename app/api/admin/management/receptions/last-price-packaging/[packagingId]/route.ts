import { NextRequest, NextResponse } from 'next/server'
import { getLastReceptionPriceForPackaging } from '@/lib/db/modules/reception/reception.actions'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ packagingId: string }> }
) {
  let packagingId: string | undefined

  try {
    const params = await context.params
    packagingId = params.packagingId

    if (!packagingId) {
      return NextResponse.json(
        { message: 'ID-ul ambalajului lipsește din cerere.' },
        { status: 400 }
      )
    }

    const priceInfo = await getLastReceptionPriceForPackaging(packagingId)

    return NextResponse.json(priceInfo)
  } catch (error) {
    console.error(
      `Eroare în ruta API /last-price-packaging pentru ID-ul de ambalaj "${packagingId || 'necunoscut'}":`,
      error
    )

    return NextResponse.json(
      { message: 'Eroare internă de server.' },
      { status: 500 }
    )
  }
}
