import { getProformas } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { ProformasList } from '../invoices/components/ProformasList'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProformasPage(props: PageProps) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const result = await getProformas(page, searchParams)

  return (
    <div className='space-y-0'>
      <div className=' items-center justify-between hidden'>
        <h1 className='text-2xl font-bold tracking-tight text-primary'>
          Facturi Proforme
        </h1>
      </div>

      <ProformasList initialData={result} currentPage={page} isAdmin={true} />
    </div>
  )
}
