'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlusCircle, FileText } from 'lucide-react'
import { SupplierInvoicesTable } from './SupplierInvoicesTable'
import { AnafLogsTable } from './AnafLogsTable'
import { CreateSupplierInvoiceForm } from './CreateSupplierInvoiceForm'
import { CreateSupplierPaymentForm } from './CreateSupplierPaymentForm'
import {
  SupplierAllocationModal,
  PopulatedSupplierPayment, 
} from './SupplierAllocationModal'
import { SupplierInvoiceDetailSheet } from './SupplierInvoiceDetailSheet'
import { AnafSyncButton } from './AnafSyncButton'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { BudgetCategoryDTO } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.types'
import { IBudgetCategoryTree } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.types'
import { SupplierInvoiceListItem } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import {
  AnafLogType,
  AnafProcessingStatus,
} from '@/lib/db/modules/setting/efactura/anaf.constants'
import { AnafInboxTable } from './AnafImboxTable'
import { SupplierPaymentsTable } from './SupplierPaymentsTable'

interface InboxErrorItem {
  _id: string
  data_creare: string
  cui_emitent: string
  titlu: string
  processing_status: AnafProcessingStatus
  processing_error?: string
}

interface LogItem {
  _id: string
  createdAt: string
  type: AnafLogType
  action: string
  message: string
}

interface PayablesPageContentProps {
  suppliers: ISupplierDoc[]

  invoicesData: {
    data: SupplierInvoiceListItem[]
    totalPages: number
    total: number
    totalCurrentYear?: number
  }

  paymentsData: {
    data: PopulatedSupplierPayment[]
    totalPages: number
    total: number
    totalCurrentYear?: number
  }

  inboxData: {
    data: InboxErrorItem[]
    totalPages: number
    total: number
    totalCurrentYear?: number
  }
  logsData: {
    data: LogItem[]
    totalPages: number
    total: number
    totalCurrentYear?: number
  }

  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
  budgetCategoriesFlat: BudgetCategoryDTO[]
  budgetCategoriesTree: IBudgetCategoryTree[]
}

export function PayablesPageContent({
  suppliers,
  invoicesData,
  paymentsData,
  inboxData,
  logsData,
  budgetCategoriesFlat,
  vatRates,
  defaultVatRate,
}: PayablesPageContentProps) {
  const router = useRouter()

  // --- STATE-URI ---
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false)
  const [allocationModalPayment, setAllocationModalPayment] =
    useState<PopulatedSupplierPayment | null>(null)
  const [preselectedSupplierId, setPreselectedSupplierId] = useState<
    string | undefined
  >(undefined)
  const [invoiceToViewDetails, setInvoiceToViewDetails] = useState<
    string | null
  >(null)

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
        if (parent) {
          parent.children.push(cat)
        }
      } else {
        tree.push(cat)
      }
    })
    return tree
  }, [budgetCategoriesFlat])

  // --- HANDLERS ---
  const handleOpenCreatePaymentFromInvoice = (supplierId: string) => {
    setPreselectedSupplierId(supplierId)
    setPaymentModalOpen(true)
  }

  const handlePaymentFormSubmit = () => {
    setPaymentModalOpen(false)
    setPreselectedSupplierId(undefined)
    router.refresh()
  }

  return (
    <div className='flex flex-col h-full min-h-0 gap-0'>
      {/* 1. HEADER */}
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

      {/* 2. TABS */}
      <Tabs
        defaultValue='invoices'
        className='flex-1 flex flex-col overflow-hidden p-0'
      >
        <div className='border-b'>
          <TabsList className='bg-transparent h-auto p-0 gap-1'>
            <TabsTrigger
              value='invoices'
              className=' border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-1 cursor-pointer'
            >
              Facturi
              <Badge variant='secondary' className='ml-2'>
                {invoicesData.totalCurrentYear}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value='payments'
              className='border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-1 cursor-pointer'
            >
              Plăți
              <Badge variant='secondary' className='ml-2'>
                {paymentsData.totalCurrentYear}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value='anaf-inbox'
              className=' border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 cursor-pointer'
            >
              Mesaje SPV
              {inboxData.total > 0 && (
                <Badge variant='destructive' className='ml-2'>
                  {inboxData.totalCurrentYear}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value='logs'
              className=' border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 cursor-pointer'
            >
              Logs
              <Badge variant='secondary' className='ml-2'>
                {logsData.totalCurrentYear}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className='flex-1 overflow-hidden'>
          {/* TAB: FACTURI */}
          <TabsContent
            value='invoices'
            className='h-full m-0 overflow-hidden flex flex-col'
          >
            <SupplierInvoicesTable
              initialData={invoicesData}
              onOpenCreatePayment={handleOpenCreatePaymentFromInvoice}
              onOpenDetailsSheet={setInvoiceToViewDetails}
            />
          </TabsContent>

          {/* TAB: PLĂȚI */}
          <TabsContent
            value='payments'
            className='h-full m-0 overflow-hidden flex flex-col'
          >
            {/* Folosim componenta corect importată */}
            <SupplierPaymentsTable
              initialData={paymentsData}
              onOpenAllocationModal={setAllocationModalPayment}
            />
          </TabsContent>

          {/* TAB: MESAJE SPV */}
          <TabsContent
            value='anaf-inbox'
            className='h-full m-0 overflow-hidden flex flex-col'
          >
            <AnafInboxTable initialData={inboxData} />
          </TabsContent>

          {/* TAB: LOGS */}
          <TabsContent
            value='logs'
            className='h-full m-0 overflow-hidden flex flex-col'
          >
            <AnafLogsTable initialData={logsData} />
          </TabsContent>
        </div>
      </Tabs>

      {/* 3. MODALE */}
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

      <SupplierAllocationModal
        payment={allocationModalPayment}
        onClose={() => setAllocationModalPayment(null)}
      />

      <SupplierInvoiceDetailSheet
        invoiceId={invoiceToViewDetails}
        onClose={() => setInvoiceToViewDetails(null)}
      />

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
