import { NextResponse, NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  // 1) Ia URL-ul din query string
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    )
  }

  // 2) Fetch cu tokenul din .env.local
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.UPLOADTHING_TOKEN}`,
    },
  })
  if (!res.ok) {
    return NextResponse.json(
      { error: 'Could not fetch remote image' },
      { status: res.status }
    )
  }

  // 3) Obține bufferul și tipul de conținut
  const buffer = await res.arrayBuffer()
  const contentType =
    res.headers.get('content-type') ?? 'application/octet-stream'

  // 4) Returnează imaginea cu header-ul corect
  return new NextResponse(buffer, {
    headers: { 'Content-Type': contentType },
  })
}
