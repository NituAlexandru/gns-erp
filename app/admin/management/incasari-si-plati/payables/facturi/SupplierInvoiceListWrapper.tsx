'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { SupplierInvoicesTable } from '../components/SupplierInvoicesTable'
import { SupplierInvoiceDetailSheet } from '../components/SupplierInvoiceDetailSheet'
import { CreateSupplierPaymentForm } from '../components/CreateSupplierPaymentForm'

interface WrapperProps {
  initialData: any
  suppliers?: any[]
  budgetCategories?: any[]
}

export function SupplierInvoiceListWrapper({
  initialData,
  suppliers = [],
  budgetCategories = [],
}: WrapperProps) {
  const [invoiceToView, setInvoiceToView] = useState<string | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<
    string | undefined
  >(undefined)
  const [preselectedInvoiceId, setPreselectedInvoiceId] = useState<
    string | undefined
  >(undefined)

  const handleOpenPayment = (supplierId: string, invoiceId?: string) => {
    setSelectedSupplierId(supplierId)
    setPreselectedInvoiceId(invoiceId)
    setPaymentModalOpen(true)
  }

  // Când închidem modalul, resetăm selecția
  const handleClosePayment = (open: boolean) => {
    setPaymentModalOpen(open)
    if (!open) {
      setPreselectedInvoiceId(undefined)
    }
  }

  return (
    <>
      <SupplierInvoicesTable
        data={initialData}
        onOpenDetailsSheet={setInvoiceToView}
        onOpenCreatePayment={handleOpenPayment}
      />

      {/* Modal Detalii Factură */}
      <SupplierInvoiceDetailSheet
        invoiceId={invoiceToView}
        onClose={() => setInvoiceToView(null)}
      />

      {/* Modal Plată (Deschis din tabel) */}
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
              suppliers={suppliers} // Trebuie pasate
              budgetCategories={budgetCategories} // Trebuie pasate
              onFormSubmit={() => setPaymentModalOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
