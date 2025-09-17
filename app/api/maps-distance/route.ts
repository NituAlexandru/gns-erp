import { NextResponse } from 'next/server'

const ORIGIN_ADDRESS = 'Strada Industriilor 191, Chiajna, Romania'

const PEAK_TIME_TIMESTAMP = '1772550000'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { judet, localitate, strada, numar } = body

    if (!judet || !localitate || !strada || !numar) {
      return NextResponse.json(
        { message: 'Adresa incompletă.' },
        { status: 400 }
      )
    }

    const destinationAddress = `${strada}, ${numar}, ${localitate}, ${judet}, Romania`
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      throw new Error('Cheia API pentru Google Maps nu este configurată.')
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      ORIGIN_ADDRESS
    )}&destinations=${encodeURIComponent(
      destinationAddress
    )}&key=${apiKey}&units=metric&traffic_model=pessimistic&departure_time=${PEAK_TIME_TIMESTAMP}`

    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK' || !data.rows[0].elements[0].distance) {
      console.error('Google Maps API Error:', data.error_message || data.status)
      return NextResponse.json(
        { message: 'Nu s-a putut calcula distanța. Verificați adresa.' },
        { status: 400 }
      )
    }

    const element = data.rows[0].elements[0]

    const travelTimeInSeconds = element.duration_in_traffic.value
    const distanceInMeters = element.distance.value

    const oneWayDistanceInKm = Math.round(distanceInMeters / 1000)
    const oneWayTravelTimeInMinutes = Math.round(travelTimeInSeconds / 60)

    // Calculăm dus-întors
    const distanceInKm = oneWayDistanceInKm * 2
    const travelTimeInMinutes = oneWayTravelTimeInMinutes * 2

    return NextResponse.json({ distanceInKm, travelTimeInMinutes })
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : 'Eroare de server'
    return NextResponse.json({ message }, { status: 500 })
  }
}
