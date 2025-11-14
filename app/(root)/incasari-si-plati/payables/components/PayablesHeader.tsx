'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlusCircle, FileText, List, Layers2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import { CreateSupplierInvoiceForm } from './CreateSupplierInvoiceForm'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { useRouter } from 'next/navigation'
import { BudgetCategoryDTO } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.types'

type ViewMode = 'all' | 'invoices' | 'payments'

interface PayablesHeaderProps {
  suppliers: ISupplierDoc[]
  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
  budgetCategoriesFlat: BudgetCategoryDTO[]
  onOpenCreatePayment: () => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

export function PayablesHeader({
  suppliers,
  vatRates,
  defaultVatRate,
  onOpenCreatePayment,
  viewMode,
  setViewMode,
}: PayablesHeaderProps) {
  const router = useRouter()
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)

  const handleInvoiceSubmit = () => {
    setInvoiceModalOpen(false)
    router.refresh()
  }

  const getButtonVariant = (mode: ViewMode) =>
    viewMode === mode ? 'default' : 'outline'

  return (
    <div className='flex items-start justify-between'>
      <div className='flex items-center gap-4'>
        <div>
          <h2 className='text-2xl font-bold'>Plăți către Furnizori</h2>
          <p className='text-muted-foreground'>
            Înregistrează facturile primite și plățile efectuate.
          </p>
        </div>

        {/* Butoanele de Comutare Vizualizare */}
        <div className='hidden md:flex space-x-1 border p-1 rounded-md bg-background'>
          <Button
            variant={getButtonVariant('all')}
            size='sm'
            onClick={() => setViewMode('all')}
            title='Afișează ambele liste (vizualizare împărțită)'
          >
            <Layers2 size={16} className='mr-2' /> Ambele
          </Button>
          <Button
            variant={getButtonVariant('invoices')}
            size='sm'
            onClick={() => setViewMode('invoices')}
            title='Afișează doar Istoricul Facturilor'
          >
            <FileText size={16} className='mr-2' /> Facturi
          </Button>
          <Button
            variant={getButtonVariant('payments')}
            size='sm'
            onClick={() => setViewMode('payments')}
            title='Afișează doar Istoricul Plăților'
          >
            <List size={16} className='mr-2' /> Plăți
          </Button>
        </div>
      </div>

      <div className='flex gap-2'>
        {/* Buton 1: Factură (Adaugă Factură) */}
        <Sheet open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
          <SheetTrigger asChild>
            <Button variant='outline' className='gap-2'>
              <FileText size={18} />
              Adaugă Factură Primită
            </Button>
          </SheetTrigger>
          <SheetContent
            side='right'
            className='w-[90%] max-w-none sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%] overflow-y-auto'
          >
            <SheetHeader>
              <SheetTitle>Înregistrare Factură Furnizor</SheetTitle>
              <SheetDescription>
                Adaugă manual o factură de la un furnizor.
              </SheetDescription>
            </SheetHeader>
            <div className='p-5'>
              <CreateSupplierInvoiceForm
                suppliers={suppliers}
                onFormSubmit={handleInvoiceSubmit}
                vatRates={vatRates}
                defaultVatRate={defaultVatRate}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Buton 2: Plată (Înregistrează Plată) */}
        <Button className='gap-2' onClick={onOpenCreatePayment}>
          <PlusCircle size={18} />
          Înregistrează Plată
        </Button>
      </div>
    </div>
  )
}
