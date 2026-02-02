import { getAllInvoices } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { InvoicesList } from './components/InvoicesList'
import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { InvoiceFilters } from '@/lib/db/modules/financial/invoices/invoice.types'
import { getSeries } from '@/lib/db/modules/numbering/series.actions'

// Definim tipul pentru searchParams in Next.js 15/16 (e Promise)
export default async function InvoicesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams

  // 1. Extragem pagina
  const page = Number(searchParams.page) || 1

  // 2. Extragem restul filtrelor direct din URL
  const filters: InvoiceFilters = {
    q: searchParams.q as string,
    status: searchParams.status as any,
    eFacturaStatus: searchParams.eFacturaStatus as any,
    series: searchParams.series as string,
    startDate: searchParams.startDate as string,
    endDate: searchParams.endDate as string,
  }

  const session = await auth()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())

  const [invoicesData, rawSeries] = await Promise.all([
    getAllInvoices(page, filters),
    getSeries(),
  ])
  // 3. Fetch Data de pe server cu TOATE filtrele
  const { data, totalPages, totalFilteredSum, seriesStats } = invoicesData

  // Extragem doar numele seriilor (string[]) din obiectele returnate de funcția ta
  const seriesNames = rawSeries
    .filter(
      (s: any) =>
        s.documentType === 'Factura' || s.documentType === 'FacturaStorno',
    )
    .map((s: any) => s.name)

  return (
    <div className='flex flex-col gap-0'>
      <h1 className='text-2xl font-bold tracking-tight hidden'>
        Lista Facturi
      </h1>

      {/* 4. Trimitem datele pure catre componenta Client */}
      <InvoicesList
        invoices={data}
        totalPages={totalPages}
        currentPage={page}
        isAdmin={isAdmin}
        totalFilteredSum={totalFilteredSum}
        seriesStats={seriesStats}
        availableSeries={seriesNames}
      />
    </div>
  )
}
