'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs' // Importăm doar ce folosim vizual
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlusCircle, FileText } from 'lucide-react'
import { CreateSupplierInvoiceForm } from './CreateSupplierInvoiceForm'
import { CreateSupplierPaymentForm } from './CreateSupplierPaymentForm'
import { AnafSyncButton } from './AnafSyncButton'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { BudgetCategoryDTO } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.types'
import { IBudgetCategoryTree } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.types'
import { PayablesFilterBar } from './PayablesFilterBar'

interface PayablesLayoutClientProps {
  children: React.ReactNode
  suppliers: ISupplierDoc[]
  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
  budgetCategoriesFlat: BudgetCategoryDTO[]
  counts: {
    invoices: number
    payments: number
    inbox: number
    logs: number
  }
}

export function PayablesLayoutClient({
  children,
  suppliers,
  vatRates,
  defaultVatRate,
  budgetCategoriesFlat,
  counts,
}: PayablesLayoutClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  // --- DETERMINARE TAB ACTIV BAZAT PE URL ---
  // Dacă suntem pe /payables/facturi -> tab-ul 'facturi' e activ
  const activeTab = useMemo(() => {
    if (pathname.includes('/plati')) return 'payments'
    if (pathname.includes('/solduri')) return 'balances'
    if (pathname.includes('/mesaje-spv')) return 'anaf-inbox'
    if (pathname.includes('/logs')) return 'logs'
    return 'invoices' // Default
  }, [pathname])

  // --- STATE MODALE (Rămân aici, sunt globale) ---
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false)
  const [preselectedSupplierId, setPreselectedSupplierId] = useState<
    string | undefined
  >(undefined)

  // --- ARBORE BUGETE ---
  const budgetCategoriesTree = useMemo(() => {
    const map = new Map<string, IBudgetCategoryTree>()
    const tree: IBudgetCategoryTree[] = []
    budgetCategoriesFlat.forEach((cat) => {
      map.set(cat._id.toString(), {
        ...cat,
        children: [],
        isActive: true,
      } as IBudgetCategoryTree)
    })
    map.forEach((cat) => {
      if (cat.parentId) {
        const parent = map.get(cat.parentId.toString())
        if (parent) parent.children.push(cat)
      } else {
        tree.push(cat)
      }
    })
    return tree
  }, [budgetCategoriesFlat])

  const handlePaymentFormSubmit = () => {
    setPaymentModalOpen(false)
    setPreselectedSupplierId(undefined)
    router.refresh()
  }

  return (
    <div className='flex flex-col h-full min-h-0 gap-0'>
      {/* 1. HEADER (Identic) */}
      <div className='flex flex-col md:flex-row gap-0 md:items-center justify-between pb-0'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            Plăți către Furnizori
          </h1>
          <p className='text-muted-foreground'>
            Înregistrează facturile primite și plățile efectuate.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <AnafSyncButton />
          <Button
            variant='outline'
            className='gap-2'
            onClick={() => setCreateInvoiceOpen(true)}
          >
            <FileText className='h-4 w-4' />
            Adaugă Factură Primită
          </Button>
          <Button
            className='gap-2 bg-red-600 hover:bg-red-700 text-white'
            onClick={() => {
              setPreselectedSupplierId(undefined)
              setPaymentModalOpen(true)
            }}
          >
            <PlusCircle className='h-4 w-4' />
            Înregistrează Plată
          </Button>
        </div>
      </div>

      {/* 2. TABURI CA NAVIGAȚIE */}
      {/* Folosim componenta Tabs vizual, dar valorile sunt link-uri */}
      <div className='flex-1 flex flex-col overflow-hidden p-0 mt-0'>
        <div className='flex gap-10'>
          <div>
            <Tabs value={activeTab} className='w-full'>
              <TabsList className='bg-transparent h-auto p-0 gap-1'>
                <Link href='/admin/management/incasari-si-plati/payables/facturi'>
                  <TabsTrigger
                    value='invoices'
                    className='border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-1 cursor-pointer'
                  >
                    Facturi
                    <Badge variant='secondary' className='ml-2'>
                      {counts.invoices}
                    </Badge>
                  </TabsTrigger>
                </Link>

                <Link href='/admin/management/incasari-si-plati/payables/plati'>
                  <TabsTrigger
                    value='payments'
                    className='border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-1 cursor-pointer'
                  >
                    Plăți
                    <Badge variant='secondary' className='ml-2'>
                      {counts.payments}
                    </Badge>
                  </TabsTrigger>
                </Link>
                <Link href='/admin/management/incasari-si-plati/payables/solduri'>
                  <TabsTrigger
                    value='balances'
                    className='border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-1 cursor-pointer'
                  >
                    Solduri
                  </TabsTrigger>
                </Link>
                <Link href='/admin/management/incasari-si-plati/payables/mesaje-spv'>
                  <TabsTrigger
                    value='anaf-inbox'
                    className='border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 cursor-pointer'
                  >
                    Mesaje SPV
                    {counts.inbox > 0 && (
                      <Badge variant='destructive' className='ml-2'>
                        {counts.inbox}
                      </Badge>
                    )}
                  </TabsTrigger>
                </Link>

                <Link href='/admin/management/incasari-si-plati/payables/logs'>
                  <TabsTrigger
                    value='logs'
                    className='border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 cursor-pointer'
                  >
                    Logs
                    <Badge variant='secondary' className='ml-2'>
                      {counts.logs}
                    </Badge>
                  </TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>
          </div>
          <PayablesFilterBar />
        </div>
        {/* 3. CONȚINUTUL PAGINII SPECIFICE */}
        <div className='flex-1 overflow-hidden pt-0'>{children}</div>
      </div>

      {/* 4. MODALE (Global Disponibile) */}
      {paymentModalOpen && (
        <Sheet open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <SheetContent
            side='right'
            className='w-[90%] max-w-none sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%] overflow-y-auto'
          >
            <SheetHeader>
              <SheetTitle>Înregistrare Plată Furnizor</SheetTitle>
              <SheetDescription>
                Adaugă o plată nouă către un furnizor.
              </SheetDescription>
            </SheetHeader>
            <div className='p-5'>
              <CreateSupplierPaymentForm
                suppliers={suppliers}
                budgetCategories={budgetCategoriesTree}
                initialSupplierId={preselectedSupplierId}
                onFormSubmit={handlePaymentFormSubmit}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <Sheet open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
        <SheetContent
          side='right'
          className='w-[90%] max-w-none sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%] overflow-y-auto'
        >
          <SheetHeader>
            <SheetTitle>Adăugare Factură Furnizor</SheetTitle>
            <SheetDescription>
              Introdu manual detaliile facturii primite.
            </SheetDescription>
          </SheetHeader>
          <div className='p-5'>
            <CreateSupplierInvoiceForm
              suppliers={suppliers}
              vatRates={vatRates}
              defaultVatRate={defaultVatRate}
              onFormSubmit={() => {
                setCreateInvoiceOpen(false)
                router.refresh()
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
