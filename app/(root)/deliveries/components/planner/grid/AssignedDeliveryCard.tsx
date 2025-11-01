'use client'

import {
  IDelivery,
  IDeliveryLineItem,
} from '@/lib/db/modules/deliveries/delivery.model'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  Box,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  cancelDeliveryNoteFromPlanner,
  confirmDeliveryFromPlanner,
  createDeliveryNote,
} from '@/lib/db/modules/financial/delivery-notes/delivery-note.actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { SelectSeriesModal } from '@/components/shared/modals/SelectSeriesModal'
import { CreateDeliveryNoteResult } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { useRouter } from 'next/navigation'
import { CancelNoteModal } from '@/components/shared/modals/CancelNoteModal'
import { ConfirmDeliveryModal } from '@/components/shared/modals/ConfirmDeliveryModal'

type DeliveryCardInfo = {
  delivery: IDelivery
  startSlot: string
  span: number
}

interface AssignedDeliveryCardProps {
  cardInfo: DeliveryCardInfo
  onSchedule: (delivery: IDelivery) => void
}

export function AssignedDeliveryCard({
  cardInfo,
  onSchedule,
}: AssignedDeliveryCardProps) {
  const { delivery } = cardInfo
  const router = useRouter()
  // --- Stări de încărcare ---
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  // --- Stări pentru Modaluri ---
  const [showSeriesModal, setShowSeriesModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  async function handleGenerateDeliveryNote(seriesName?: string) {
    setIsGenerating(true)
    const toastId = `generate-${delivery._id}`
    toast.loading('Se generează avizul...', { id: toastId })

    try {
      const result: CreateDeliveryNoteResult = await createDeliveryNote({
        deliveryId: `${delivery._id}`,
        seriesName: seriesName ?? undefined,
      })

      if (result.success) {
        toast.success('Avizul a fost generat cu succes!', { id: toastId })
        router.refresh()
      } else if (result.requireSelection) {
        toast.dismiss(toastId)
        setShowSeriesModal(true)
      } else {
        toast.error(result.message || 'Eroare la generarea avizului', {
          id: toastId,
        })
      }
    } catch (err) {
      console.error('❌ Eroare la generare aviz:', err)
      toast.error('Eroare internă la generarea avizului', {
        id: toastId,
      })
    }
    setIsGenerating(false) // Oprește loading
  }

  async function handleConfirmDelivery() {
    if (isConfirming) return // Previne dublu-click

    setIsConfirming(true)
    const toastId = `confirm-${delivery._id}`
    toast.loading('Se confirmă livrarea...', { id: toastId })

    try {
      // Apelează noua funcție "wrapper"
      const result = await confirmDeliveryFromPlanner({
        deliveryId: `${delivery._id}`,
      })

      if (result.success) {
        toast.success('Livrarea a fost confirmată cu succes!', { id: toastId })
        router.refresh() // Actualizează UI-ul
      } else {
        toast.error(result.message || 'Eroare la confirmarea livrării', {
          id: toastId,
        })
      }
    } catch (err) {
      console.error('❌ Eroare la confirmare livrare:', err)
      toast.error('Eroare internă la confirmarea livrării', {
        id: toastId,
      })
    }
    setIsConfirming(false) // Oprește loading
  }

  const statusInfo = DELIVERY_STATUS_MAP[delivery.status] || {
    name: 'Necunoscut',
    variant: 'secondary',
  }

  const addressParts = [
    delivery.deliveryAddress.strada,
    delivery.deliveryAddress.numar,
    delivery.deliveryAddress.localitate,
    delivery.deliveryAddress.judet,
  ]
  const formattedAddress = addressParts.filter((part) => part).join(', ')

  const canGenerateNote = !delivery.isNoticed && delivery.status === 'SCHEDULED'
  // Poți confirma dacă AVEM un aviz (isNoticed) și statusul e ÎN TRANZIT
  const canConfirmDelivery =
    delivery.isNoticed && delivery.status === 'IN_TRANSIT'
  const isLoading = isGenerating || isConfirming || isCancelling
  const canCancelNote = delivery.isNoticed && delivery.status === 'IN_TRANSIT'

  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'w-full h-full p-1 text-left rounded-md bg-card shadow-md hover:shadow-lg transition-all',
            'flex flex-col justify-center',
            'border-l-4',
            {
              'border-red-500': delivery.status === 'SCHEDULED',
              'border-yellow-500': delivery.status === 'IN_TRANSIT',
              'border-green-500': delivery.status === 'DELIVERED',
              'border-blue-500': delivery.status === 'INVOICED',
              'border-white opacity-60': delivery.status === 'CANCELLED',
              'border-border': delivery.status === 'CREATED',
            }
          )}
          onClick={() => onSchedule(delivery)}
        >
          <div className='mb-0.5'>
            <p className='text-xs text-muted-foreground truncate flex items-center gap-1'>
              <User className='h-3 w-3 flex-shrink-0' />
              {delivery.clientSnapshot.name}
            </p>
          </div>

          <div>
            <p className='font-semibold text-xs truncate flex gap-1 items-center'>
              <Box className='h-4 w-3 flex-shrink-0' />
              {delivery.deliveryNumber?.substring(0, 5)}
            </p>
            <p className='font-semibold text-xs font-mono text-muted-foreground flex gap-1 items-center'>
              <Truck className='h-4 w-3 flex-shrink-0' />
              {delivery.orderNumber}
            </p>
          </div>
        </button>
      </TooltipTrigger>

      <TooltipContent className='max-w-xl p-4' side='right'>
        <div className='space-y-4 text-base'>
          <div className='flex justify-between items-center gap-2'>
            <div className='space-y-1'>
              <p className='text-lg font-semibold text-primary'>
                Comanda: {delivery.orderNumber}
              </p>
              <p className='text-sm font-mono text-muted-foreground -mt-1'>
                Livr: {delivery.deliveryNumber}
              </p>
            </div>
            <Badge
              variant={statusInfo.variant}
              className='self-start text-sm px-2 py-1'
            >
              {statusInfo.name}
            </Badge>
          </div>

          <div className='space-y-2 text-sm border-t pt-3 mt-3'>
            <div className='flex items-center gap-2'>
              <User className='h-4 w-4 flex-shrink-0' />
              <span className='font-medium text-foreground '>
                {delivery.clientSnapshot.name}
              </span>
            </div>
            <div className='flex items-start gap-2'>
              <MapPin className='h-4 w-4 flex-shrink-0 mt-0.5' />{' '}
              <span className=''>{formattedAddress}</span>
            </div>
          </div>

          <div className='space-y-2 text-sm border-t pt-3 mt-3'>
            <div className='flex items-center gap-2'>
              <Truck className='h-4 w-4 flex-shrink-0' />
              <span className='font-medium text-foreground truncate'>
                Sofer: {delivery.driverName || 'N/A'} | Auto:{' '}
                {delivery.vehicleNumber || 'N/A'}{' '}
                {delivery.trailerNumber && (
                  <span>| Remorcă: {delivery.trailerNumber} </span>
                )}
              </span>
            </div>
            <div className='font-semibold text-foreground'>
              Programat: {delivery.deliverySlots?.join(', ')}
            </div>
          </div>

          <div className='border-t pt-3 mt-3 space-y-2 text-sm'>
            {delivery.deliveryNotes && (
              <p>
                <strong>Note Logistică:</strong> {delivery.deliveryNotes}
              </p>
            )}
            <p className='font-semibold pt-1'>Articole în livrare:</p>
            <ul className='list-disc list-inside '>
              {delivery.items.map((item: IDeliveryLineItem) => (
                <li key={item._id.toString()}>
                  {item.quantity} {item.unitOfMeasure} - {item.productName}
                </li>
              ))}
            </ul>
            <div className='border-t pt-2 mt-2 space-y-1 text-muted-foreground'>
              <p>
                Livrare creată de {delivery.createdByName} la data de{' '}
                {format(new Date(delivery.createdAt), 'Pp', { locale: ro })}
              </p>

              {delivery.lastUpdatedByName && (
                <p>
                  Programată de {delivery.lastUpdatedByName} la data de{' '}
                  {format(new Date(delivery.updatedAt), 'Pp', { locale: ro })}
                </p>
              )}
            </div>
          </div>

          <div className='border-t pt-3 mt-3 flex items-center justify-end gap-2'>
            {/* --- Butonul GENEREAZĂ AVIZ --- */}
            {canGenerateNote && (
              <Button
                size='sm'
                variant='outline'
                onClick={(e) => {
                  e.stopPropagation()
                  handleGenerateDeliveryNote()
                }}
                disabled={isLoading} // Verificăm doar isLoading, deoarece 'canGenerateNote' e deja verificat
              >
                {isGenerating ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <FileText className='mr-2 h-4 w-4' />
                )}
                Generează Aviz
              </Button>
            )}

            {/* --- NOU: Butonul ANULEAZĂ AVIZ --- */}
            {canCancelNote && (
              <Button
                size='sm'
                variant='destructive'
                onClick={(e) => {
                  e.stopPropagation()
                  setShowCancelModal(true)
                }}
                disabled={isLoading}
              >
                {isCancelling ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <XCircle className='mr-2 h-4 w-4' />
                )}
                Anulează Aviz
              </Button>
            )}

            {/* --- NOU: Butonul CONFIRMĂ (cu Alert Dialog) --- */}
            {canConfirmDelivery && (
              <Button
                size='sm'
                variant='outline'
                onClick={(e) => {
                  e.stopPropagation()
                  setShowConfirmModal(true) // <-- Doar deschide modalul
                }}
                disabled={isLoading}
              >
                {isConfirming ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <CheckCircle2 className='mr-2 h-4 w-4' />
                )}
                Confirmă Livrarea
              </Button>
            )}
          </div>
        </div>
      </TooltipContent>

      {/* --- NOU: Legătura cu Modalul de Anulare --- */}
      {showCancelModal && (
        <CancelNoteModal
          isLoading={isCancelling}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={async (reason) => {
            if (isCancelling) return
            setIsCancelling(true)
            const toastId = `cancel-${delivery._id}`
            toast.loading('Se anulează avizul...', { id: toastId })

            try {
              // 🔽 --- APELEAZĂ NOUL WRAPPER --- 🔽
              const result = await cancelDeliveryNoteFromPlanner({
                deliveryId: `${delivery._id}`,
                reason: reason,
              })

              if (result.success) {
                toast.success('Avizul a fost anulat!', { id: toastId })
                setShowCancelModal(false)
                router.refresh()
              } else {
                toast.error(result.message || 'Eroare la anularea avizului', {
                  id: toastId,
                })
              }
            } catch (err) {
              console.error('❌ Eroare la anulare aviz:', err)
              toast.error('Eroare internă la anularea avizului', {
                id: toastId,
              })
            }
            setIsCancelling(false)
          }}
        />
      )}
      {showConfirmModal && (
        <ConfirmDeliveryModal
          isLoading={isConfirming}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={async () => {
            setShowConfirmModal(false) // Închide modalul
            await handleConfirmDelivery() // Apelează funcția existentă
          }}
        />
      )}
      {showSeriesModal && (
        <SelectSeriesModal
          documentType='Aviz'
          onSelect={async (series) => {
            setShowSeriesModal(false)
            await handleGenerateDeliveryNote(series)
          }}
          onCancel={() => setShowSeriesModal(false)}
        />
      )}
    </Tooltip>
  )
}
