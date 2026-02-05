'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { PopulatedClientPayment as PopulatedClientPaymentType } from '@/lib/db/modules/financial/treasury/receivables/client-payment.types'
import { PopulatedAllocation as PopulatedAllocationType } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.types'
import {
  getAllocationsForPayment,
  getUnpaidInvoicesByClient,
} from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'
import { getClientPaymentById } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { AllocationList } from './AllocationList'
import { useRouter } from 'next/navigation'
import { ClientUnpaidInvoiceList } from './ClientUnpaidInvoiceList' // <--- Componenta nouă creată la Pasul 3
import { ClientManualAllocationModal } from './ClientManualAllocationModal' // <--- Componenta nouă creată la Pasul 2

export type PopulatedClientPayment = PopulatedClientPaymentType
export type PopulatedAllocation = PopulatedAllocationType

// Tip local pentru factura neplătită
export type UnpaidInvoice = Awaited<
  ReturnType<typeof getUnpaidInvoicesByClient>
>['data'][number]

interface AllocationModalProps {
  payment: PopulatedClientPayment | null
  onClose: () => void
  isAdmin: boolean
}

export function AllocationModal({
  payment,
  onClose,
  isAdmin,
}: AllocationModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // State-uri pentru date
  const [allocations, setAllocations] = useState<PopulatedAllocation[]>([])
  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([])
  const [latestPayment, setLatestPayment] =
    useState<PopulatedClientPayment | null>(payment)

  // State pentru modalul secundar (Manual Allocation)
  const [manualAllocInvoice, setManualAllocInvoice] =
    useState<UnpaidInvoice | null>(null)

  // 1. Încărcare date la deschidere
  useEffect(() => {
    if (payment) {
      const fetchData = async () => {
        setIsLoading(true)

        // A. Fetch Payment actualizat (pentru suma nealocată curentă)
        const paymentResult = await getClientPaymentById(payment._id)
        let currentPaymentData = payment

        if (paymentResult.success && paymentResult.data) {
          currentPaymentData = paymentResult.data
          setLatestPayment(currentPaymentData)
        } else {
          setLatestPayment(payment)
        }

        // B. Fetch Alocări și Facturi în paralel
        const [allocationsResult, invoicesResult] = await Promise.all([
          getAllocationsForPayment(currentPaymentData._id),
          getUnpaidInvoicesByClient(currentPaymentData.clientId._id),
        ])

        if (allocationsResult.success) {
          setAllocations(allocationsResult.data as PopulatedAllocation[])
        }
        if (invoicesResult.success) {
          setInvoices(invoicesResult.data as UnpaidInvoice[])
        }
        setIsLoading(false)
      }
      fetchData()
    } else {
      setLatestPayment(null)
    }
  }, [payment])

  // 2. Funcția de Refresh (apelată după orice acțiune: alocare, ștergere, compensare)
  const refreshData = async () => {
    if (!latestPayment) return
    setIsLoading(true)
    setManualAllocInvoice(null)

    const [paymentResult, allocationsResult, invoicesResult] =
      await Promise.all([
        getClientPaymentById(latestPayment._id),
        getAllocationsForPayment(latestPayment._id),
        getUnpaidInvoicesByClient(latestPayment.clientId._id),
      ])

    if (paymentResult.success && paymentResult.data) {
      setLatestPayment(paymentResult.data)
    }

    if (allocationsResult.success)
      setAllocations(allocationsResult.data as PopulatedAllocation[])
    if (invoicesResult.success)
      setInvoices(invoicesResult.data as UnpaidInvoice[])

    router.refresh()
    setIsLoading(false)
  }

  // 3. Închidere completă
  const handleCloseAll = () => {
    setManualAllocInvoice(null)
    onClose()
  }

  const isOpen = !!latestPayment

  return (
    <>
      {/* SHEET PRINCIPAL */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleCloseAll()}>
        <SheetContent className='sm:max-w-3xl w-full overflow-y-auto p-4 flex flex-col h-full'>
          <SheetHeader>
            <SheetTitle>
              Gestionează Alocările:{' '}
              {latestPayment?.seriesName ? `${latestPayment.seriesName}-` : ''}
              {latestPayment?.paymentNumber}
            </SheetTitle>
            <SheetDescription>
              Leagă încasarea de la {latestPayment?.clientId.name} de facturile
              neplătite.
            </SheetDescription>
          </SheetHeader>

          <div className='flex-1 overflow-y-auto px-1'>
            {isLoading ? (
              <div className='flex h-[50vh] items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              </div>
            ) : (
              <div className='grid grid-cols-1 gap-6 py-6'>
                {/* ZONA 1: ALOCĂRI DEJA FĂCUTE */}
                <div className='space-y-2'>
                  <h3 className='font-semibold'>Alocări Existente</h3>
                  <AllocationList
                    allocations={allocations}
                    onAllocationDeleted={refreshData}
                    isAdmin={isAdmin}
                    parentPayment={latestPayment}
                  />
                </div>

                {/* ZONA 2: FACTURI DISPONIBILE (Pt Admin sau User cu drepturi) */}
                {isAdmin && (
                  <div className='space-y-2'>
                    <h3 className='font-semibold'>Facturi Disponibile</h3>
                    <ClientUnpaidInvoiceList
                      invoices={invoices}
                      payment={latestPayment}
                      onManualAllocateClick={setManualAllocInvoice} // Deschide modalul secundar
                      onSuccess={refreshData} // Refresh după compensare
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <SheetFooter className='mt-auto pt-4 border-t'>
            <Button variant='outline' onClick={handleCloseAll}>
              Închide
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* MODAL SECUNDAR: ALOCARE MANUALĂ */}
      <ClientManualAllocationModal
        payment={latestPayment}
        invoice={manualAllocInvoice}
        onClose={() => setManualAllocInvoice(null)}
        onAllocationCreated={refreshData}
      />
    </>
  )
}
