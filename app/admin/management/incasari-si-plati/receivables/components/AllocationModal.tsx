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
import {
  PopulatedAllocation as PopulatedAllocationType,
  UnpaidInvoice as UnpaidInvoiceType,
} from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.types'
import {
  getAllocationsForPayment,
  getUnpaidInvoicesByClient,
} from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'
import { getClientPaymentById } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { AllocationList } from './AllocationList'
import { UnpaidInvoiceList } from './UnpaidInvoiceList'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export type PopulatedClientPayment = PopulatedClientPaymentType
export type PopulatedAllocation = PopulatedAllocationType
export type UnpaidInvoice = UnpaidInvoiceType

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
  const [allocations, setAllocations] = useState<PopulatedAllocation[]>([])
  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([])
  const [latestPayment, setLatestPayment] =
    useState<PopulatedClientPayment | null>(payment)

  useEffect(() => {
    if (payment) {
      const fetchData = async () => {
        setIsLoading(true)

        const paymentResult = await getClientPaymentById(payment._id)
        let currentPaymentData: PopulatedClientPayment

        if (paymentResult.success && paymentResult.data) {
          currentPaymentData = paymentResult.data
          setLatestPayment(currentPaymentData)
        } else {
          toast.error('Eroare la reîncărcarea încasării.', {
            description: paymentResult.message || 'Datele pot fi incorecte.',
          })
          currentPaymentData = payment
          setLatestPayment(payment)
        }

        const [allocationsResult, invoicesResult] = await Promise.all([
          getAllocationsForPayment(currentPaymentData._id),
          getUnpaidInvoicesByClient(currentPaymentData.clientId._id),
        ])

        if (allocationsResult.success) {
          setAllocations(allocationsResult.data as PopulatedAllocation[])
        }
        if (invoicesResult.success) {
          setInvoices(invoicesResult.data as UnpaidInvoice[])
        } else {
          toast.error('Nu s-au putut prelua facturile neplătite.', {
            description: invoicesResult.message || 'Eroare necunoscută',
          })
        }
        setIsLoading(false)
      }
      fetchData()
    } else {
      setLatestPayment(null)
      setAllocations([])
      setInvoices([])
    }
  }, [payment])

  const refreshData = async () => {
    if (!latestPayment) return
    setIsLoading(true)

    const [paymentResult, allocationsResult, invoicesResult] =
      await Promise.all([
        getClientPaymentById(latestPayment._id),
        getAllocationsForPayment(latestPayment._id),
        getUnpaidInvoicesByClient(latestPayment.clientId._id),
      ])

    if (paymentResult.success && paymentResult.data) {
      setLatestPayment(paymentResult.data)
    } else {
      toast.error('Eroare la reîncărcarea încasării.', {
        description: paymentResult.message,
      })
    }

    if (allocationsResult.success)
      setAllocations(allocationsResult.data as PopulatedAllocation[])
    if (invoicesResult.success)
      setInvoices(invoicesResult.data as UnpaidInvoice[])

    router.refresh()
    setIsLoading(false)
  }

  const isOpen = !!latestPayment

  const handleAllocationSuccess = async (
    updatedPayment?: PopulatedClientPayment
  ) => {
    // 1. Actualizăm plata INSTANT cu ce am primit de la server
    if (updatedPayment) {
      setLatestPayment(
        (prev) =>
          ({
            ...updatedPayment,
            clientId: prev?.clientId || { _id: '', name: '' },
          }) as PopulatedClientPayment
      )
    }

    // 2. Reîmprospătăm DOAR listele de alocări și facturi, NU și plata (dacă o avem deja)
    setIsLoading(true)
    const [allocationsResult, invoicesResult] = await Promise.all([
      // NU mai apelăm getClientPaymentById aici dacă avem updatedPayment
      getAllocationsForPayment(updatedPayment?._id || latestPayment!._id),
      getUnpaidInvoicesByClient(latestPayment!.clientId._id),
    ])

    if (allocationsResult.success)
      setAllocations(allocationsResult.data as PopulatedAllocation[])
    if (invoicesResult.success)
      setInvoices(invoicesResult.data as UnpaidInvoice[])

    // Dacă NU am primit updatedPayment (ex: delete allocation), atunci facem refresh complet
    if (!updatedPayment && latestPayment) {
      const paymentRes = await getClientPaymentById(latestPayment._id)
      if (paymentRes.success && paymentRes.data)
        setLatestPayment(paymentRes.data)
    }

    router.refresh()
    setIsLoading(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='sm:max-w-3xl w-full flex flex-col h-full'>
        <SheetHeader>
          <SheetTitle>
            Gestionează Alocările: {latestPayment?.paymentNumber}
          </SheetTitle>
          <SheetDescription>
            Leagă încasarea de {latestPayment?.clientId.name} de facturile
            neplătite.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto px-1'>
          {isLoading ? (
            <div className='flex h-[80vh] items-center justify-center'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <div
              className={`grid ${isAdmin ? 'grid-cols-1' : 'grid-cols-1'} gap-6 p-5 py-6`}
            >
              {/* Coloana Stângă: Alocări Existente */}
              <div className='space-y-4'>
                <h3 className='font-semibold'>Alocări Existente</h3>
                <AllocationList
                  allocations={allocations}
                  onAllocationDeleted={refreshData}
                  isAdmin={isAdmin}
                />
              </div>

              {/* Coloana Dreaptă: Facturi Disponibile (doar pt admin) */}
              {isAdmin && (
                <div className='space-y-4'>
                  <h3 className='font-semibold'>Facturi Disponibile</h3>
                  <UnpaidInvoiceList
                    key={`${latestPayment?._id}-${latestPayment?.unallocatedAmount}-${invoices.length}`}
                    invoices={invoices}
                    payment={latestPayment}
                    onAllocationCreated={handleAllocationSuccess}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant='outline' onClick={onClose}>
            Închide
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
