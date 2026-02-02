import { getProformas } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { ProformasList } from '../invoices/components/ProformasList'
import { InvoiceFilters } from '@/lib/db/modules/financial/invoices/invoice.types'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProformasPage(props: PageProps) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const filters: InvoiceFilters = {
    q: searchParams.q as string,
    startDate: searchParams.startDate as string,
    endDate: searchParams.endDate as string,
  }

  const { data, totalPages, totalFilteredSum } = await getProformas(
    page,
    filters,
  )

  return (
    <div className='space-y-0'>
      <div className=' items-center justify-between hidden'>
        <h1 className='text-2xl font-bold tracking-tight text-primary'>
          Facturi Proforme
        </h1>
      </div>

      <ProformasList
        invoices={data}
        totalPages={totalPages}
        currentPage={page}
        isAdmin={true}
        totalFilteredSum={totalFilteredSum}
      />
    </div>
  )
}
