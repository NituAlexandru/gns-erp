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
import { SupplierPaymentsList } from './SupplierPaymentsList'
import { SupplierInvoicesList } from './SupplierInvoicesList'
import { CreateSupplierPaymentForm } from './CreateSupplierPaymentForm'
import {
  SupplierAllocationModal,
  PopulatedSupplierPayment,
} from './SupplierAllocationModal'
import { SupplierInvoiceDetailSheet } from './SupplierInvoiceDetailSheet'
import { AnafLogsTable } from './AnafLogsTable'
import { AnafSyncButton } from './AnafSyncButton'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { BudgetCategoryDTO } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.types'
import { IBudgetCategoryTree } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.types'
import { z } from 'zod'
import { CreateSupplierInvoiceSchema } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.validator'
import { SupplierInvoiceStatus } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.constants'
import {
  AnafProcessingStatus,
  AnafLogType,
} from '@/lib/db/modules/setting/efactura/anaf.constants'
import { AnafInboxTable } from './AnafImboxTable'

type PopulatedInvoice = z.infer<typeof CreateSupplierInvoiceSchema> & {
  _id: string
  status: SupplierInvoiceStatus
  paidAmount: number
  remainingAmount: number
  supplierId: { _id: string; name: string }
}

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
  invoices: PopulatedInvoice[]
  payments: PopulatedSupplierPayment[]
  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
  budgetCategoriesFlat: BudgetCategoryDTO[]
  budgetCategoriesTree: IBudgetCategoryTree[]
  inboxErrors: InboxErrorItem[]
  logsData: LogItem[]
}

export function PayablesPageContent({
  suppliers,
  invoices,
  payments,
  budgetCategoriesFlat,
  inboxErrors,
  logsData,
}: PayablesPageContentProps) {
  const router = useRouter()

  // --- STATE-URI CENTRALE PENTRU MODALE ---
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [allocationModalPayment, setAllocationModalPayment] =
    useState<PopulatedSupplierPayment | null>(null)
  const [preselectedSupplierId, setPreselectedSupplierId] = useState<
    string | undefined
  >(undefined)
  const [invoiceToViewDetails, setInvoiceToViewDetails] = useState<
    string | null
  >(null)

  // --- LOGICA DE CONSTRUIRE A ARBORELUI ---
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

  // --- FUNCTII DE COORDONARE ---
  const handleOpenCreatePaymentFromInvoice = (supplierId: string) => {
    setPreselectedSupplierId(supplierId)
    setPaymentModalOpen(true)
  }

  const handleOpenAllocationFromInvoice = (
    payment: PopulatedSupplierPayment
  ) => {
    setAllocationModalPayment(payment)
  }

  const handlePaymentFormSubmit = () => {
    setPaymentModalOpen(false)
    setPreselectedSupplierId(undefined)
    router.refresh()
  }

  return (
    <div className='space-y-6 flex flex-col h-[calc(100vh-180px)]'>
      {/* 1. HEADER & ACTION BAR */}
      <div className='flex flex-col md:flex-row gap-4 md:items-center justify-between'>
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

          <Button variant='outline' className='gap-2' onClick={() => {}}>
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

      {/* 2. TABS PRINCIPALE - DEFAULT SETAT PE INVOICES */}
      <Tabs
        defaultValue='invoices'
        className='flex-1 flex flex-col overflow-hidden '
      >
        <div className='border-b pb-0 mb-1'>
          <TabsList className='bg-transparent h-auto p-0 gap-2'>
            <TabsTrigger
              value='invoices'
              className=' border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 cursor-pointer'
            >
              Facturi
              <Badge variant='secondary' className='ml-2'>
                {invoices.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value='payments'
              className=' border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 cursor-pointer'
            >
              Plăți
              <Badge variant='secondary' className='ml-2'>
                {payments.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value='anaf-inbox'
              className=' border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 cursor-pointer'
            >
              Mesaje SPV
              {inboxErrors.length > 0 && (
                <Badge variant='destructive' className='ml-2'>
                  {inboxErrors.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value='logs'
              className=' border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 cursor-pointer'
            >
              Logs
            </TabsTrigger>
          </TabsList>
        </div>

        <div className='flex-1 overflow-hidden'>
          {/* TAB: FACTURI */}
          <TabsContent value='invoices' className='h-full m-0'>
            <SupplierInvoicesList
              invoices={invoices}
              onOpenCreatePayment={handleOpenCreatePaymentFromInvoice}
              onOpenAllocationModal={handleOpenAllocationFromInvoice}
              onOpenDetailsSheet={setInvoiceToViewDetails}
            />
          </TabsContent>

          {/* TAB: PLĂȚI */}
          <TabsContent value='payments' className='h-full m-0'>
            <SupplierPaymentsList
              payments={payments}
              onOpenAllocationModal={setAllocationModalPayment}
            />
          </TabsContent>

          {/* TAB: MESAJE SPV */}
          <TabsContent value='anaf-inbox' className='h-full m-0 overflow-auto'>
            <AnafInboxTable initialMessages={inboxErrors} />
          </TabsContent>

          {/* TAB: LOGS */}
          <TabsContent value='logs' className='h-full m-0 overflow-auto'>
            <AnafLogsTable logs={logsData} />
          </TabsContent>
        </div>
      </Tabs>

      {/* 3. MODALE CENTRALE */}
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
    </div>
  )
}
