import { getProformas } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const page = Number(searchParams.get('page')) || 1
    const q = searchParams.get('q') || undefined
    const minTotal = Number(searchParams.get('minTotal')) || undefined
    const status = searchParams.get('status') || undefined

    const result = await getProformas(page, {
      q,
      minTotal,
      status,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('API Proformas Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
