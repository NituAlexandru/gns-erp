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
import { SupplierPaymentsList } from './SupplierPaymentsList'
import { SupplierInvoicesList } from './SupplierInvoicesList'
import { PayablesHeader } from './PayablesHeader'
import { CreateSupplierPaymentForm } from './CreateSupplierPaymentForm'
import {
  SupplierAllocationModal,
  PopulatedSupplierPayment,
} from './SupplierAllocationModal'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { BudgetCategoryDTO } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.types'
import { IBudgetCategoryTree } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.types'
import { z } from 'zod'
import { CreateSupplierInvoiceSchema } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.validator'
import { SupplierInvoiceStatus } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.constants'
import { SupplierInvoiceDetailSheet } from './SupplierInvoiceDetailSheet'

// Tipul de vizualizare
type ViewMode = 'all' | 'invoices' | 'payments'

// Tipul complet pentru Invoice
type PopulatedInvoice = z.infer<typeof CreateSupplierInvoiceSchema> & {
  _id: string
  status: SupplierInvoiceStatus
  paidAmount: number
  remainingAmount: number
  supplierId: { _id: string; name: string }
}

interface PayablesPageContentProps {
  suppliers: ISupplierDoc[]
  invoices: PopulatedInvoice[]
  payments: PopulatedSupplierPayment[]
  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
  budgetCategoriesFlat: BudgetCategoryDTO[]
  budgetCategoriesTree: IBudgetCategoryTree[]
}

export function PayablesPageContent({
  suppliers,
  invoices,
  payments,
  vatRates,
  defaultVatRate,
  budgetCategoriesFlat,
}: PayablesPageContentProps) {
  const router = useRouter()

  // --- STATE PENTRU VIZUALIZARE ---
  const [viewMode, setViewMode] = useState<ViewMode>('all')

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
      {/* 1. HEADER - ACUM PRIMESTE setViewMode */}
      <PayablesHeader
        suppliers={suppliers}
        vatRates={vatRates}
        defaultVatRate={defaultVatRate}
        budgetCategoriesFlat={budgetCategoriesFlat}
        onOpenCreatePayment={() => {
          setPreselectedSupplierId(undefined)
          setPaymentModalOpen(true)
        }}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* 2. LISTE - RANDARE CONDIȚIONALĂ */}
      <div className='flex-1 flex flex-col gap-2 overflow-hidden'>
        {/* Caz 1: Afișează TOATE LISTELE (modul original, stivuit) */}
        {viewMode === 'all' && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-2 flex-1 overflow-hidden'>
            <SupplierInvoicesList
              invoices={invoices}
              onOpenCreatePayment={handleOpenCreatePaymentFromInvoice}
              onOpenAllocationModal={handleOpenAllocationFromInvoice}
              onOpenDetailsSheet={setInvoiceToViewDetails}
            />

            <SupplierPaymentsList
              payments={payments}
              onOpenAllocationModal={setAllocationModalPayment}
            />
          </div>
        )}

        {/* Caz 2: Afișează DOAR Facturile (full height) */}
        {viewMode === 'invoices' && (
          <SupplierInvoicesList
            invoices={invoices}
            onOpenCreatePayment={handleOpenCreatePaymentFromInvoice}
            onOpenAllocationModal={handleOpenAllocationFromInvoice}
            onOpenDetailsSheet={setInvoiceToViewDetails}
          />
        )}

        {/* Caz 3: Afișează DOAR Plățile (full height) */}
        {viewMode === 'payments' && (
          <SupplierPaymentsList
            payments={payments}
            onOpenAllocationModal={setAllocationModalPayment}
          />
        )}
      </div>

      {/* 3. MODALE CENTRALE (Sheets) */}
      {/* Sheet-ul de Creare Plată */}
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

      {/* Sheet-ul de Alocare (deschis de ambele liste) */}
      <SupplierAllocationModal
        payment={allocationModalPayment}
        onClose={() => setAllocationModalPayment(null)}
      />

      {/* Sheet-ul de Detalii Factură */}
      <SupplierInvoiceDetailSheet
        invoiceId={invoiceToViewDetails}
        onClose={() => setInvoiceToViewDetails(null)}
      />
    </div>
  )
}
