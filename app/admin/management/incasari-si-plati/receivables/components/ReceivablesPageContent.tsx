'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ReceivablesHeader } from './ReceivablesHeader'
import { ReceivablesList } from './ReceivablesList'
import { CreateClientPaymentForm } from './CreateClientPaymentForm'
import { AllocationModal, PopulatedClientPayment } from './AllocationModal'

interface ReceivablesPageContentProps {
  isAdmin: boolean
  payments: PopulatedClientPayment[]
}

export function ReceivablesPageContent({
  isAdmin,
  payments,
}: ReceivablesPageContentProps) {
  const router = useRouter()

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [allocationModalPayment, setAllocationModalPayment] =
    useState<PopulatedClientPayment | null>(null)
  const [preselectedClientId, setPreselectedClientId] = useState<
    string | undefined
  >(undefined)

  const handleRefresh = () => {
    setPaymentModalOpen(false)
    setAllocationModalPayment(null)
    router.refresh()
  }

  const handleOpenAllocationModal = (payment: PopulatedClientPayment) => {
    setAllocationModalPayment(payment)
  }

  return (
    <div className='space-y-6 flex flex-col h-[calc(100vh-100px)]'>
      <ReceivablesHeader
        isAdmin={isAdmin}
        onOpenCreatePayment={() => {
          setPreselectedClientId(undefined)
          setPaymentModalOpen(true)
        }}
      />

      <div className='flex-1 overflow-y-auto'>
        <ReceivablesList
          payments={payments}
          isAdmin={isAdmin}
          onOpenAllocationModal={handleOpenAllocationModal}
        />
      </div>

      {/* Sheet-ul de Creare Plată */}
      {paymentModalOpen && (
        <Sheet open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <SheetContent
            side='right'
            className='w-[90%] max-w-none sm:w-[90%] md:w-[80%] lg:w-[60%] overflow-y-auto'
          >
            <SheetHeader>
              <SheetTitle>Înregistrare Încasare Client</SheetTitle>
              <SheetDescription>
                Adaugă o încasare nouă de la un client.
              </SheetDescription>
            </SheetHeader>
            <div className='p-5'>
              <CreateClientPaymentForm
                onFormSubmit={handleRefresh}
                initialClientId={preselectedClientId}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Sheet-ul de Alocare (deschis de ReceivablesList) */}
      <AllocationModal
        payment={allocationModalPayment}
        onClose={() => setAllocationModalPayment(null)}
      />
    </div>
  )
}
