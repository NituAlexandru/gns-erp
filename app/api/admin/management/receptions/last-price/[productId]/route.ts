import { NextRequest, NextResponse } from 'next/server'
import { getLastReceptionPriceForProduct } from '@/lib/db/modules/reception/reception.actions'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  let productId: string | undefined

  try {
    const params = await context.params
    productId = params.productId

    if (!productId) {
      return NextResponse.json(
        { message: 'ID-ul produsului lipsește din cerere.' },
        { status: 400 }
      )
    }

    const price = await getLastReceptionPriceForProduct(productId)
    return NextResponse.json({ price })
  } catch (error) {
    console.error(
      `Eroare în ruta API /last-price pentru ID-ul de produs "${productId || 'necunoscut'}":`,
      error
    )

    return NextResponse.json(
      { message: 'Eroare internă de server la preluarea prețului.' },
      { status: 500 }
    )
  }
}
