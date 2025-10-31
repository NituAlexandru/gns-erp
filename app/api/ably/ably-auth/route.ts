import Ably from 'ably'
import { NextResponse } from 'next/server'

// Acest fișier ESTE pe server, deci POATE accesa cheia secretă
const ablyRest = new Ably.Rest(process.env.ABLY_API_KEY!)

export async function GET() {
  try {
    // Generăm un token temporar pentru client (cu un ID de client generic)
    const tokenRequest = await ablyRest.auth.createTokenRequest({
      clientId: 'gns-erp-client',
    })

    return NextResponse.json(tokenRequest)
  } catch (error) {
    console.error('Ably auth error:', error)
    return new NextResponse('Ably authentication failed', { status: 500 })
  }
}
