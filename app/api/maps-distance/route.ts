import { NextResponse } from 'next/server'

function getNextWorkingDayPeakTime(): string {
  const date = new Date()

  // Trecem la ziua următoare
  date.setDate(date.getDate() + 1)

  // Verificăm dacă e weekend (0 = Duminică, 6 = Sâmbătă)
  const day = date.getDay()
  if (day === 6) {
    date.setDate(date.getDate() + 2) // Sărim la Luni
  } else if (day === 0) {
    date.setDate(date.getDate() + 1) // Sărim la Luni
  }

  // Setăm ora 09:00:00 (ora locală)
  date.setHours(9, 0, 0, 0)

  // Returnăm timestamp-ul Unix în secunde, ca string
  return Math.floor(date.getTime() / 1000).toString()
}

const ORIGIN_ADDRESS = 'Strada Industriilor 191, Chiajna, Romania'

const PEAK_TIME_TIMESTAMP = getNextWorkingDayPeakTime()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { judet, localitate, strada, numar } = body

    if (!judet || !localitate || !strada || !numar) {
      return NextResponse.json(
        { message: 'Adresa incompletă.' },
        { status: 400 },
      )
    }

    const destinationAddress = `${strada}, ${numar}, ${localitate}, ${judet}, Romania`
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      throw new Error('Cheia API pentru Google Maps nu este configurată!')
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      ORIGIN_ADDRESS,
    )}&destinations=${encodeURIComponent(
      destinationAddress,
    )}&key=${apiKey}&units=metric&traffic_model=pessimistic&departure_time=${PEAK_TIME_TIMESTAMP}`

    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK' || !data.rows[0].elements[0].distance) {
      console.error('Google Maps API Error:', data.error_message || data.status)
      return NextResponse.json(
        { message: 'Nu s-a putut calcula distanța. Verificați adresa.' },
        { status: 400 },
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
