
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')
  const key = process.env.GOOGLE_MAPS_API_KEY

  if (!origin || !destination) {
    return NextResponse.json(
      { error: 'Missing origin or destination' },
      { status: 400 }
    )
  }

  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric` +
    `&origins=${encodeURIComponent(origin)}` +
    `&destinations=${encodeURIComponent(destination)}` +
    `&key=${key}`

  const res = await fetch(url)
  if (!res.ok) {
    return NextResponse.json(
      { error: 'Google API error', status: res.status },
      { status: res.status }
    )
  }
  const data = await res.json()
  return NextResponse.json(data)
}
