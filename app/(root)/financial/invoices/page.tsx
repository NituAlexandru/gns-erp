import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
// Vom crea aceste componente mai târziu
// import { getInvoices } from '@/lib/db/modules/financial/invoices/invoice.actions'
// import { InvoicesDataTable } from './components/InvoicesDataTable'

export default async function InvoicesPage() {
  // TODO: De-comentează când avem acțiunea și tabelul
  // const invoicesResult = await getInvoices({ page: 1 })

  return (
    <div className='flex flex-col gap-2'>
      {/* Header: Titlu + Buton Creare */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>Facturi</h1>
        <Button asChild>
          <Link href='/financial/invoices/new'>
            <PlusCircle className='w-4 h-4 mr-2' />
            Creează Factură
          </Link>
        </Button>
      </div>

      {/* Aici va veni componenta client InvoicesDataTable */}
      <div className='border rounded-lg p-4 bg-card'>
        <p className='text-muted-foreground'>
          Aici va fi lista de facturi (InvoicesDataTable)...
        </p>
        {/* <InvoicesDataTable
          data={invoicesResult.data}
          pagination={invoicesResult.pagination}
        /> */}
      </div>
    </div>
  )
}
