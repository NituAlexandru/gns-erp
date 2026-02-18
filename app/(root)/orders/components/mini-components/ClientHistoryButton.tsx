'use client'

import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { History, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getClientPriceHistory } from '@/lib/db/modules/product/product.actions'
import { IPriceHistoryEntry } from '@/lib/db/modules/price-history/price-history.types'
import { AvailableUnit } from '@/lib/db/modules/product/types'
import PriceHistoryList from '@/app/(root)/catalog-produse/details/price-history-list'
import { getPriceHistory } from '@/lib/db/modules/price-history/price-history.actions'

interface ClientHistoryButtonProps {
  productId: string
  productName: string
  availableUnits?: AvailableUnit[]
}

export function ClientHistoryButton({
  productId,
  productName,
  availableUnits = [],
}: ClientHistoryButtonProps) {
  const { control } = useFormContext()

  // Ascultăm ID-ul clientului și Numele clientului din formular
  const clientId = useWatch({ control, name: 'clientId' })
  const clientName = useWatch({ control, name: 'clientSnapshot.name' })
  const deliveryType = useWatch({ control, name: 'deliveryType' })

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [historyData, setHistoryData] = useState<IPriceHistoryEntry[]>([])

  const handleOpen = async (open: boolean) => {
    setIsOpen(open)
    if (open) {
      if (!clientId) {
        toast.error('Selectează un client pentru a vedea istoricul.')
        setIsOpen(false)
        return
      }

      setLoading(true)
      try {
        const res = await getPriceHistory({
          stockableItem: productId,
          partnerId: clientId,
          transactionType: deliveryType,
        })

        setHistoryData(res.sales || [])
      } catch (err) {
        console.error(err)
        toast.error('Nu s-a putut încărca istoricul.')
      } finally {
        setLoading(false)
      }
    }
  }

  if (!clientId) return null

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-6 p-0 ml-2 text-primary'
          title={`Vezi istoric prețuri pentru ${clientName}`}
          type='button'
        >
          <History className='h-4 w-4' /> Istoric Pret
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className='w-[800px] p-0'
        align='start'
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='p-2 bg-muted/20 border-b'>
          <p className='text-xs font-semibold text-muted-foreground'>
            Istoric vânzări către:{' '}
            <span className='text-foreground'>{clientName}</span>
          </p>
        </div>

        {loading ? (
          <div className='flex items-center justify-center h-32'>
            <Loader2 className='h-6 w-6 animate-spin text-primary' />
          </div>
        ) : (
          <div className='h-[400px] p-2 max-h-[600px] overflow-auto'>
            <PriceHistoryList
              title={`Istoric Preturi vanzare - ${productName}`}
              data={historyData}
              showPartner={false}
              availableUnits={availableUnits}
              alwaysOpen={true}
            />

            {historyData.length === 0 && (
              <div className='p-8 text-center text-sm text-muted-foreground'>
                Nu există vânzări anterioare către acest client pentru acest
                produs.
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
