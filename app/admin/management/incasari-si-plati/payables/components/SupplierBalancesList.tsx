'use client'

import { Accordion } from '@/components/ui/accordion'
import { CheckCircle2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { createSupplierCompensationPayment } from '@/lib/db/modules/financial/treasury/payables/supplier-allocation.actions'
import { SupplierBalancesItem } from './SupplierBalancesItem'
import { SupplierInvoiceDetailSheet } from './SupplierInvoiceDetailSheet'
import { CreateSupplierPaymentForm } from './CreateSupplierPaymentForm'
import {
  SupplierAllocationModal,
  PopulatedSupplierPayment,
} from './SupplierAllocationModal'

interface SupplierBalancesListProps {
  data: any[]
  suppliers?: any[]
  budgetCategories?: any[]
  currentUser?: { id: string; name?: string | null }
}

export function SupplierBalancesList({
  data,
  suppliers = [],
  budgetCategories = [],
  currentUser,
}: SupplierBalancesListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State-uri Modale (Fix ca în Wrapper-ul tău)
  const [invoiceToView, setInvoiceToView] = useState<string | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<
    string | undefined
  >(undefined)
  const [preselectedInvoiceId, setPreselectedInvoiceId] = useState<
    string | undefined
  >(undefined)
  const [allocationModalPayment, setAllocationModalPayment] =
    useState<PopulatedSupplierPayment | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Handlers
  const handleOpenPayment = (supplierId: string, invoiceId?: string) => {
    setSelectedSupplierId(supplierId)
    setPreselectedInvoiceId(invoiceId)
    setPaymentModalOpen(true)
  }

  const handleCompensate = async (invoiceId: string) => {
    if (!currentUser?.id) {
      toast.error('Eroare: Utilizator neidentificat.')
      return
    }

    setProcessingId(invoiceId)
    try {
      const result = await createSupplierCompensationPayment(
        invoiceId,
        currentUser.id,
        currentUser.name || 'Operator',
      )

      if (result.success) {
        toast.success(result.message)
        startTransition(() => {
          router.refresh()
        })
      } else {
        toast.error('Eroare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setProcessingId(null)
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-40 text-muted-foreground gap-2'>
        <CheckCircle2 className='w-8 h-8 text-green-500' />
        <p className='text-sm'>Nu există solduri active către furnizori.</p>
      </div>
    )
  }

  return (
    <>
      <div className='h-full overflow-y-auto pr-1'>
        <Accordion type='single' collapsible className='w-full space-y-1.5'>
          {data.map((supplier) => (
            <SupplierBalancesItem
              key={supplier.supplierId}
              supplier={supplier}
              onOpenInvoiceDetails={setInvoiceToView}
              onOpenCreatePayment={handleOpenPayment}
              onOpenAllocationModal={setAllocationModalPayment}
              onCompensate={handleCompensate}
              processingId={processingId}
            />
          ))}
        </Accordion>
      </div>

      {/* 1. Modal Detalii Factură */}
      <SupplierInvoiceDetailSheet
        invoiceId={invoiceToView}
        onClose={() => setInvoiceToView(null)}
      />

      {/* 2. Modal Înregistrare Plată (Fix cum e în Wrapper) */}
      <Sheet open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <SheetContent
          side='right'
          className='w-[90%] md:w-[60%] overflow-y-auto'
        >
          <SheetHeader>
            <SheetTitle>Înregistrare Plată</SheetTitle>
            <SheetDescription className='hidden'>
              Completează detaliile de mai jos pentru a efectua o plată.
            </SheetDescription>
          </SheetHeader>
          <div className='p-5'>
            <CreateSupplierPaymentForm
              initialSupplierId={selectedSupplierId}
              initialInvoiceId={preselectedInvoiceId}
              suppliers={suppliers}
              budgetCategories={budgetCategories}
              onFormSubmit={() => {
                setPaymentModalOpen(false)
                startTransition(() => {
                  router.refresh()
                })
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 3. Modal Alocare Plăți Existente */}
      <SupplierAllocationModal
        payment={allocationModalPayment}
        onClose={() => {
          setAllocationModalPayment(null)
          startTransition(() => {
            router.refresh()
          })
        }}
      />
    </>
  )
}
