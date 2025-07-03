// app/api/barcode/route.ts
import { NextResponse } from 'next/server'
import bwipjs from 'bwip-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const text = searchParams.get('text') ?? ''
  const type = (searchParams.get('type') as string) ?? 'code128'
  const theme = (searchParams.get('theme') as string) ?? 'light'

  const bcidMap: Record<string, string> = {
    code128: 'code128',
    ean13: 'ean13',
    upca: 'upca',
    itf14: 'itf14',
    gs1128: 'gs1-128',
  }
  const bcid = bcidMap[type] || 'code128'

  const backgroundcolor = theme === 'dark' ? '000000' : 'FFFFFF'
  const barcolor = theme === 'dark' ? 'FFFFFF' : '000000'

  try {
    const png = await bwipjs.toBuffer({
      bcid,
      text,
      includetext: true,
      scale: 8,
      height: 80,
      textsize: 13,
      textxalign: 'center',
      backgroundcolor,
      barcolor,
      textcolor: barcolor,
    })
    return new NextResponse(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'barcode generation failed' },
      { status: 500 }
    )
  }
}
