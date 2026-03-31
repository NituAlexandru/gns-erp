'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { createPenaltyInvoiceFromOverdue } from '@/lib/db/modules/financial/invoices/invoice.actions' // ajustează calea dacă e diferită
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface PenaltyBillingModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  items: any[] // Aceștia sunt itemii din `client.items`
  currentUser?: { id: string; name?: string | null }
}

export function PenaltyBillingModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  items,
  currentUser,
}: PenaltyBillingModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Filtrăm doar facturile care AU o sumă de penalizare calculată > 0
  const penaltyItems = items.filter(
    (item) => item.type === 'INVOICE' && (item.penaltyAmount || 0) > 0,
  )

  // State pentru a ține minte ID-urile facturilor bifate (implicit le bifăm pe toate)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(penaltyItems.map((i) => i._id)),
  )

  // Calculăm totalul doar pentru cele bifate
  const totalToBill = penaltyItems
    .filter((item) => selectedIds.has(item._id))
    .reduce((sum, item) => sum + item.penaltyAmount, 0)

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleGenerateInvoice = async () => {
    if (selectedIds.size === 0) {
      toast.warning('Selectează cel puțin o factură pentru a emite penalități.')
      return
    }

    const selectedData = penaltyItems
      .filter((i) => selectedIds.has(i._id))
      .map((i) => ({
        invoiceId: i._id,
        seriesName: i.seriesName,
        invoiceNumber: i.documentNumber,
        invoiceDate: i.date,
        penaltyAmount: i.penaltyAmount,
        percentage: i.appliedPercentage || 0,
        billedDays: i.unbilledDays || i.daysOverdue,
      }))

    startTransition(async () => {
      const result = await createPenaltyInvoiceFromOverdue(
        clientId,
        selectedData,
        currentUser?.id,
        currentUser?.name || undefined,
      )

      if (result.success) {
        toast.success('Factura de penalități a fost creată cu succes!')
        onClose()
        router.refresh()
      } else {
        toast.error('Eroare la crearea facturii', {
          description: result.message,
        })
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='lg:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>Facturare Penalități - {clientName}</DialogTitle>
          <DialogDescription>
            Selectează facturile restante pentru care dorești să emiți factura
            de penalizare curentă.
          </DialogDescription>
        </DialogHeader>

        <div className='py-4 max-h-[60vh] overflow-y-auto'>
          {penaltyItems.length === 0 ? (
            <p className='text-center text-muted-foreground py-4'>
              Nu există penalități calculate pentru acest client.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[40px]'></TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Scadență</TableHead>
                  <TableHead className='text-center'>Zile Întârziere</TableHead>
                  <TableHead className='text-center'>Zile Facturate</TableHead>
                  <TableHead className='text-center'>% Cotă</TableHead>
                  <TableHead className='text-right'>Penalitate (RON)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {penaltyItems.map((item) => (
                  <TableRow
                    key={item._id}
                    className={selectedIds.has(item._id) ? 'bg-muted/30' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        className='cursor-pointer'
                        checked={selectedIds.has(item._id)}
                        onCheckedChange={() => handleToggleRow(item._id)}
                      />
                    </TableCell>
                    <TableCell className='font-medium'>
                      {item.seriesName ? `${item.seriesName} - ` : ''}
                      {item.documentNumber}
                    </TableCell>
                    <TableCell>
                      {formatDateTime(new Date(item.dueDate)).dateOnly}
                    </TableCell>
                    <TableCell className='text-center text-red-600 font-medium'>
                      {item.daysOverdue} zile
                    </TableCell>
                    <TableCell className='text-center'>
                      {item.billedPenaltyDays > 0 ? (
                        <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 border border-orange-200'>
                          {item.billedPenaltyDays} zile
                        </span>
                      ) : (
                        <span className='text-muted-foreground text-[10px]'>
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell className='text-center font-mono'>
                      {item.appliedPercentage}%
                    </TableCell>
                    <TableCell className='text-right font-mono font-bold text-red-600'>
                      {formatCurrency(item.penaltyAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className='flex justify-between items-center sm:justify-between w-full border-t pt-4'>
          <div className='flex flex-col'>
            <span className='text-sm text-muted-foreground'>
              Total de facturat:
            </span>
            <span className='text-xl font-bold text-red-600 font-mono'>
              {formatCurrency(totalToBill)}
            </span>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={onClose} disabled={isPending}>
              Anulează
            </Button>
            <Button
              onClick={handleGenerateInvoice}
              disabled={isPending || selectedIds.size === 0 || totalToBill <= 0}
              variant='default'
            >
              {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Generează Factură Penalizare
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
