'use client'

import { useState, useEffect } from 'react'
import { getTodayScheduledPenalties } from '@/lib/db/modules/financial/penalties/penalty.actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, Loader2, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function PendingPenaltiesTodayDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true) // Începem cu true pentru prima încărcare
  const [scheduledData, setScheduledData] = useState<any[]>([])

  // Încărcăm numărul pe fundal imediat ce componenta se randează pe ecran
  // astfel încât butonul să aibă cifra gata calculată fără ca userul să dea click
  useEffect(() => {
    const fetchInitialCount = async () => {
      setIsLoading(true)
      const res = await getTodayScheduledPenalties()
      if (res.success && res.data) {
        setScheduledData(res.data)
      }
      setIsLoading(false)
    }
    fetchInitialCount()
  }, [])

  // Calcule matematice pentru afișare
  const totalPenInvoices = scheduledData.length // 1 Factură PEN per Client
  const totalOverdueInvoices = scheduledData.reduce(
    (sum, g) => sum + g.invoices.length,
    0,
  ) // Câte facturi vechi intră în ele
  const grandTotal = scheduledData.reduce((sum, g) => sum + g.totalAmount, 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          className='border-red-200 bg-red-50 hover:bg-red-100 text-primary transition-all duration-300'
        >
          {isLoading ? (
            <Loader2 className='w-4 h-4 mr-2 animate-spin' />
          ) : (
            <Clock className='w-4 h-4 mr-2' />
          )}

          {isLoading
            ? 'Calculăm estimarea...'
            : `Se emit azi (${totalPenInvoices} facturi PEN)`}
        </Button>
      </DialogTrigger>

      <DialogContent className='max-w-3xl max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Receipt className='w-5 h-5 text-orange-600' />
            Facturi PEN programate pentru astăzi
          </DialogTitle>
          <DialogDescription>
            Sistemul va emite automat{' '}
            <strong>{totalPenInvoices} facturi de penalitate</strong> care
            înglobează penalitățile pentru{' '}
            <strong>{totalOverdueInvoices} facturi restante</strong>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className='flex justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-muted-foreground' />
          </div>
        ) : scheduledData.length === 0 ? (
          <div className='text-center py-12 border-2 border-dashed rounded-lg bg-muted/10'>
            <p className='text-muted-foreground font-medium'>
              Nu există penalități programate pentru emitere automată astăzi.
            </p>
            <p className='text-sm text-muted-foreground mt-1'>
              Niciun client nu a atins pragul minim și termenul de scadență
              necesar.
            </p>
          </div>
        ) : (
          <div className='space-y-4 mt-4'>
            {scheduledData.map((group) => (
              <div
                key={group.clientId}
                className='border rounded-md p-4 bg-card shadow-sm'
              >
                <div className='flex justify-between items-center mb-3 border-b pb-2'>
                  <h4 className='font-bold text-sm'>{group.clientName}</h4>
                  <span className='font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded'>
                    {formatCurrency(group.totalAmount)}
                  </span>
                </div>
                <div className='space-y-1.5'>
                  {group.invoices.map((inv: any) => (
                    <div
                      key={inv.invoiceId}
                      className='flex justify-between items-center text-xs text-muted-foreground'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-foreground'>
                          {inv.seriesName} - {inv.documentNumber}
                        </span>
                        <span className='bg-muted px-1.5 py-0.5 rounded-sm'>
                          restantă de {inv.unbilledDays} zile
                        </span>
                      </div>
                      <span className='font-mono'>
                        {formatCurrency(inv.penaltyAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className='flex flex-col sm:flex-row justify-between items-center pt-4 border-t mt-6 bg-muted/30 p-4 rounded-md'>
              <span className='font-bold uppercase text-sm text-muted-foreground'>
                Total Penalități Estimate (Astăzi)
              </span>
              <span className='font-mono font-bold text-xl text-red-600'>
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
