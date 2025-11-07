'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { cn, formatCurrency } from '@/lib/utils'
import { StornoSourceInvoiceDTO } from '@/lib/db/modules/financial/invoices/invoice.types'
import { getStornoSourceInvoices } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { toast } from 'sonner'

interface SelectStornoInvoicesModalProps {
  clientId: string
  addressId: string
  onClose: () => void
  // Returnează un array de ID-uri de facturi
  onConfirm: (selectedInvoiceIds: string[]) => void
}

export function SelectStornoInvoicesModal({
  clientId,
  addressId,
  onClose,
  onConfirm,
}: SelectStornoInvoicesModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [invoices, setInvoices] = useState<StornoSourceInvoiceDTO[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Preluare date la deschiderea modalului
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      const result = await getStornoSourceInvoices(clientId, addressId)
      if (result.success) {
        setInvoices(result.data)
      } else {
        toast.error('Eroare la încărcarea facturilor', {
          description: result.message,
        })
      }
      setIsLoading(false)
    }
    fetchData()
  }, [clientId, addressId])

  const handleToggleSelect = (invoiceId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId)
      } else {
        newSet.add(invoiceId)
      }
      return newSet
    })
  }

  const handleConfirmClick = () => {
    onConfirm(Array.from(selectedIds))
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Selectează Facturi pentru Stornare</DialogTitle>
          <DialogDescription>
            Alege una sau mai multe facturi din care dorești să stornezi linii.
          </DialogDescription>
        </DialogHeader>

        <div className='max-h-[400px] overflow-y-auto space-y-2 p-1'>
          {isLoading && (
            <div className='flex items-center justify-center p-8'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          )}

          {!isLoading && invoices.length === 0 && (
            <p className='text-center text-muted-foreground p-8'>
              Nu a fost găsită nicio factură eligibilă pentru stornare
              (Standard, Aprobate/Plătite) pentru această adresă.
            </p>
          )}

          {!isLoading &&
            invoices.map((inv) => {
              const invId = inv._id.toString()
              const isSelected = selectedIds.has(invId)
              return (
                <div
                  key={invId}
                  className={cn(
                    'flex items-center space-x-4 rounded-md border p-4 cursor-pointer',
                    isSelected && 'border-primary ring-1 ring-primary'
                  )}
                  onClick={() => handleToggleSelect(invId)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleSelect(invId)}
                    aria-label={`Selectează factura ${inv.invoiceNumber}`}
                  />
                  <div className='flex-1 grid grid-cols-3 gap-4 text-sm'>
                    <div className='font-semibold'>
                      {inv.seriesName}-{inv.invoiceNumber}
                    </div>
                    <div>
                      {format(new Date(inv.invoiceDate), 'P', { locale: ro })}
                    </div>
                    <div className='text-right font-medium'>
                      {formatCurrency(inv.grandTotal)}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>

        <DialogFooter>
          <Button type='button' variant='ghost' onClick={onClose}>
            Anulează
          </Button>
          <Button
            type='button'
            onClick={handleConfirmClick}
            disabled={selectedIds.size === 0}
          >
            Încarcă Linii din {selectedIds.size} Facturi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
