import { NextResponse } from 'next/server'
import { getAblyRest } from '@/lib/db/modules/ably/ably-rest' // <-- MODIFICAT

export async function GET() {
  try {
    const ablyRest = getAblyRest() // <-- MODIFICAT: Obține o instanță proaspătă

    const tokenRequest = await ablyRest.auth.createTokenRequest({
      clientId: 'gns-erp-client',
    })

    return NextResponse.json(tokenRequest)
  } catch (error) {
    console.error('Ably auth error:', error)
    return new NextResponse('Ably authentication failed', { status: 500 })
  }
}
