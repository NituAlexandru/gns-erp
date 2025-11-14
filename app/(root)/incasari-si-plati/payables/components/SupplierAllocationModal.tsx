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
import { SupplierPaymentDTO } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.types'
import {
  getAllocationsForSupplierPayment,
  getUnpaidSupplierInvoices,
} from '@/lib/db/modules/financial/treasury/payables/supplier-allocation.actions'
import { getSupplierPaymentById } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions' // <-- NOU: Importăm funcția de get
import { SupplierAllocationList } from './SupplierAllocationList'
import { UnpaidSupplierInvoiceList } from './UnpaidSupplierInvoiceList'
import { ManualAllocationModal } from './ManualAllocationModal'
import { useRouter } from 'next/navigation'

// Tipul pentru o plată populată (din SupplierPaymentsList)
export type PopulatedSupplierPayment = SupplierPaymentDTO & {
  supplierId: {
    _id: string
    name: string
  }
}

// Tipul pentru o alocare populată (din server action)
export type PopulatedSupplierAllocation = Awaited<
  ReturnType<typeof getAllocationsForSupplierPayment>
>['data'][number]

// Tipul pentru o factură furnizor neplătită (din server action)
export type UnpaidSupplierInvoice = Awaited<
  ReturnType<typeof getUnpaidSupplierInvoices>
>['data'][number]

interface SupplierAllocationModalProps {
  payment: PopulatedSupplierPayment | null
  onClose: () => void
}

export function SupplierAllocationModal({
  payment,
  onClose,
}: SupplierAllocationModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [allocations, setAllocations] = useState<PopulatedSupplierAllocation[]>(
    []
  )
  const [invoices, setInvoices] = useState<UnpaidSupplierInvoice[]>([])

  const [latestPayment, setLatestPayment] =
    useState<PopulatedSupplierPayment | null>(payment)

  const [manualAllocInvoice, setManualAllocInvoice] =
    useState<UnpaidSupplierInvoice | null>(null)

  useEffect(() => {
    if (payment) {
      const fetchData = async () => {
        setIsLoading(true)

        const paymentResult = await getSupplierPaymentById(payment._id)

        let currentPaymentData = payment

        if (paymentResult.success && paymentResult.data) {
          currentPaymentData = paymentResult.data as PopulatedSupplierPayment
          setLatestPayment(currentPaymentData)
        } else {
          setLatestPayment(payment)
        }

        // 2. Fetch alocările și facturile folosind datele cele mai recente
        const [allocationsResult, invoicesResult] = await Promise.all([
          getAllocationsForSupplierPayment(payment._id),
          getUnpaidSupplierInvoices(currentPaymentData.supplierId._id),
        ])

        if (allocationsResult.success) {
          setAllocations(allocationsResult.data)
        }
        if (invoicesResult.success) {
          setInvoices(invoicesResult.data)
        }
        setIsLoading(false)
      }
      fetchData()
    } else {
      setLatestPayment(null)
    }
  }, [payment])

  // Funcție de reîncărcare (chemată și de modalul copil)
  const refreshData = async () => {
    if (!latestPayment) return
    setIsLoading(true)
    setManualAllocInvoice(null)

    // Fetch payment din nou pentru a obține suma nealocată actualizată
    const [paymentResult, allocationsResult, invoicesResult] =
      await Promise.all([
        getSupplierPaymentById(latestPayment._id),
        getAllocationsForSupplierPayment(latestPayment._id),
        getUnpaidSupplierInvoices(latestPayment.supplierId._id),
      ])

    // Actualizăm state-ul plății
    if (paymentResult.success && paymentResult.data) {
      setLatestPayment(paymentResult.data as PopulatedSupplierPayment)
    }

    if (allocationsResult.success) setAllocations(allocationsResult.data)
    if (invoicesResult.success) setInvoices(invoicesResult.data)
    setIsLoading(false)

    router.refresh()
  }

  // Funcție de închidere completă
  const handleCloseAll = () => {
    setManualAllocInvoice(null)
    onClose() // Asta închide modalul principal
  }

  // Folosim latestPayment pentru a verifica dacă modalul e deschis
  const isOpen = !!latestPayment

  return (
    // Fragmentul este necesar pentru a ține ambele modale
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleCloseAll()}>
        {/* Folosim latestPayment peste tot în JSX */}
        <SheetContent className='sm:max-w-3xl w-full overflow-y-auto p-4'>
          <SheetHeader>
            <SheetTitle>
              Gestionează Alocările: {latestPayment?.seriesName} -{' '}
              {latestPayment?.paymentNumber}
            </SheetTitle>
            <SheetDescription>
              Leagă plata către {latestPayment?.supplierId.name} de facturile
              neplătite.
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className='flex h-[80vh] items-center justify-center'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-1 gap-6 py-6'>
              {/* Coloana Stângă: Alocări Existente */}
              <div className='space-y-1'>
                <h3 className='font-semibold'>Alocări Existente</h3>
                <SupplierAllocationList
                  allocations={allocations}
                  onAllocationDeleted={refreshData}
                />
              </div>

              {/* Coloana Dreaptă: Facturi Disponibile */}
              <div className='space-y-1'>
                <h3 className='font-semibold'>Facturi Disponibile</h3>
                <UnpaidSupplierInvoiceList
                  invoices={invoices}
                  payment={latestPayment}
                  onManualAllocateClick={setManualAllocInvoice}
                />
              </div>
            </div>
          )}

          <SheetFooter>
            <Button variant='outline' onClick={handleCloseAll}>
              Închide
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Randarea noului modal */}
      <ManualAllocationModal
        payment={latestPayment}
        invoice={manualAllocInvoice}
        onClose={() => setManualAllocInvoice(null)}
        onAllocationCreated={refreshData}
      />
    </>
  )
}
