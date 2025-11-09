
import { NextRequest, NextResponse } from 'next/server'
import { getAllInvoices } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { InvoiceFilters } from '@/lib/db/modules/financial/invoices/invoice.types'

export const dynamic = 'force-dynamic' 

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1

    // Extragem toate filtrele posibile
    const filters: InvoiceFilters = {
      q: searchParams.get('q') || undefined,
      status: searchParams.get('status') || undefined,
      eFacturaStatus: searchParams.get('eFacturaStatus') || undefined,
      minTotal: Number(searchParams.get('minTotal')) || undefined,
      agentId: searchParams.get('agentId') || undefined,
      clientId: searchParams.get('clientId') || undefined,
    }

    const result = await getAllInvoices(page, filters)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API_INVOICES_GET] Eroare:', error)
    return new NextResponse('Eroare internă de server', { status: 500 })
  }
}
