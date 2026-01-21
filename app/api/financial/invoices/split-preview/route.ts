import { generateSplitInvoiceInputs } from '@/lib/db/modules/financial/invoices/split-invoice/split-invoice.helpers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { originalItems, splitConfigs, commonData } = body

    if (!originalItems || !splitConfigs) {
      return NextResponse.json(
        { error: 'Date insuficiente pentru calcul.' },
        { status: 400 },
      )
    }

    // Apelăm motorul matematic existent (Single Source of Truth)
    const splitInvoices = generateSplitInvoiceInputs(
      commonData || {},
      originalItems,
      splitConfigs,
    )

    return NextResponse.json(splitInvoices)
  } catch (error) {
    console.error('Eroare la calcul split preview:', error)
    return NextResponse.json(
      { error: 'Eroare internă la calculul distribuției.' },
      { status: 500 },
    )
  }
}
