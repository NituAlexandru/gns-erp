'use client'

import { useState, useTransition } from 'react'
import { IFleetAvailabilityDoc } from '@/lib/db/modules/deliveries/availability/availability.model'
import { Trash2, AlertTriangle, Wrench, CalendarOff, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteTimeBlock } from '@/lib/db/modules/deliveries/availability/availability.actions'
import { toast } from 'sonner'
import {
  ABLY_API_ENDPOINTS,
  ABLY_CHANNELS,
  ABLY_EVENTS,
} from '@/lib/db/modules/ably/constants'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const ICONS = {
  ITP: AlertTriangle,
  SERVICE: Wrench,
  CONCEDIU: CalendarOff,
  ALTELE: Info,
}

const COLORS = {
  ITP: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  SERVICE: 'bg-purple-100 border-purple-300 text-purple-800',
  CONCEDIU: ' bg-red-100 border-red-300 text-red-800',
  ALTELE: 'bg-gray-300 border-gray-500 text-gray-800',
}

export function TimeBlockCard({ block }: { block: IFleetAvailabilityDoc }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  const blockType = ICONS[block.type] ? block.type : 'ALTELE'
  const Icon = ICONS[blockType]

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteTimeBlock(block._id.toString())
      if (res.success) {
        toast.success('Rezervare ștersă.')
        try {
          await fetch(ABLY_API_ENDPOINTS.PUBLISH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: ABLY_CHANNELS.PLANNER,
              event: ABLY_EVENTS.DATA_CHANGED,
              data: { message: 'Rezervare ștersă' },
            }),
          })
        } catch (e) {
          console.error(e)
        }
        router.refresh()
      } else {
        toast.error(res.message)
      }
      setShowDeleteAlert(false)
    })
  }

  return (
    <>
      <div
        className={`w-full h-full p-1 rounded border ${COLORS[blockType]} flex flex-col relative group text-xs overflow-hidden shadow-sm`}
      >
        {/* Header: Icon + Tip */}
        <div className='flex items-center gap-1 font-bold mb-0.5'>
          <Icon className='h-3 w-3 flex-shrink-0' />
          <span className='truncate uppercase  leading-none mt-0.5'>
            {block.type}
          </span>
        </div>

        {/* Text Trunchiat + Tooltip */}
        {block.note && (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <p className='truncate text-[10px] opacity-90 leading-tight cursor-help'>
                  {block.note}
                </p>
              </TooltipTrigger>
              <TooltipContent className='max-w-[220px] text-xs break-words bg-popover text-popover-foreground border shadow-md'>
                <p>{block.note}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Buton Ștergere (Apare la Hover) */}
        <Button
          variant='outline'
          size='icon'
          className='h-5 w-5 absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/50 hover:text-red-600'
          onClick={(e) => {
            e.stopPropagation()
            setShowDeleteAlert(true)
          }}
          disabled={isPending}
          title='Șterge'
        >
          <Trash2 className='h-3 w-3' />
        </Button>
      </div>

      {/* Modal Confirmare Ștergere (Shadcn) */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi aceasta Rezervare?</AlertDialogTitle>
            <AlertDialogDescription>
              Acest interval ({block.type}) va deveni din nou disponibil pentru
              programări. Această acțiune este ireversibilă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteAlert(false)}>
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className='bg-primary hover:bg-primary/80'
            >
              {isPending ? 'Se șterge...' : 'Șterge Rezervarea'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
