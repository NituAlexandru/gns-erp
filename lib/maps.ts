export async function getDistanceInKm(
  originAddress: string,
  destinationAddress: string
): Promise<number> {
  const res = await fetch(
    `/api/distance?origin=${encodeURIComponent(originAddress)}` +
      `&destination=${encodeURIComponent(destinationAddress)}`
  )
  if (!res.ok) {
    throw new Error(`Distance proxy error: ${res.status}`)
  }
  const data = await res.json()
  const elem = data.rows?.[0]?.elements?.[0]
  if (elem?.status !== 'OK') {
    throw new Error(`Distance API returned: ${elem?.status}`)
  }
  return elem.distance.value / 1000
}
