import { auth } from '@/auth'
import { getReceipts } from '@/lib/db/modules/financial/receipts/receipt.actions'
import { ReceiptsList } from './components/ReceiptsList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ReceiptsFilter } from './components/ReceiptsFilter'
import { PAGE_SIZE } from '@/lib/constants'

export default async function ReceiptsPage({
  searchParams,
}: {
  // Adăugăm startDate și endDate în tipuri
  searchParams: Promise<{
    page?: string
    search?: string
    startDate?: string
    endDate?: string
  }>
}) {
  const session = await auth()
  if (!session) return <div>Acces neautorizat</div>

  const resolvedParams = await searchParams
  const page = Number(resolvedParams.page) || 1
  const search = resolvedParams.search || ''

  // Citim datele din URL
  const startDate = resolvedParams.startDate
  const endDate = resolvedParams.endDate

  // Le trimitem la backend
  const initialData = await getReceipts(page, PAGE_SIZE, {
    search: search,
    startDate: startDate,
    endDate: endDate,
  })

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Chitanțe</h1>
          <p className='text-muted-foreground text-sm'>
            Gestionează încasările de numerar.
          </p>
        </div>

        <ReceiptsFilter />

        <Button asChild className='whitespace-nowrap'>
          <Link href='/financial/receipts/new'>
            <Plus className='mr-2 h-4 w-4' /> Emite Chitanță
          </Link>
        </Button>
      </div>

      <ReceiptsList initialData={initialData} currentPage={page} />
    </div>
  )
}
