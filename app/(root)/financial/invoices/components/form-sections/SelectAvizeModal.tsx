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
import { getUninvoicedDeliveryNotes } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { IDeliveryNoteDoc } from '@/lib/db/modules/financial/delivery-notes/delivery-note.model'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { cn, formatCurrency } from '@/lib/utils'

interface SelectAvizeModalProps {
  clientId: string
  addressId: string
  onClose: () => void
  onConfirm: (selectedNotes: IDeliveryNoteDoc[]) => void
  alreadyLoadedNoteIds: string[]
}

export function SelectAvizeModal({
  clientId,
  addressId,
  onClose,
  onConfirm,
  alreadyLoadedNoteIds,
}: SelectAvizeModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [avize, setAvize] = useState<IDeliveryNoteDoc[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Preluare date la deschiderea modalului
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      const result = await getUninvoicedDeliveryNotes(clientId, addressId)
      if (result.success && result.data) {
        // --- 3. FILTREAZĂ REZULTATELE ---
        const filteredAvize = result.data.filter(
          (note) => !alreadyLoadedNoteIds.includes(note._id.toString())
        )
        setAvize(filteredAvize) // Setează lista deja filtrată
        // --- SFÂRȘIT MODIFICARE ---
      } else {
        // TODO: Arată o eroare toast
        console.error(result.message)
      }
      setIsLoading(false)
    }
    fetchData()
  }, [clientId, addressId, alreadyLoadedNoteIds])

  const handleToggleSelect = (noteId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(noteId)) {
        newSet.delete(noteId)
      } else {
        newSet.add(noteId)
      }
      return newSet
    })
  }

  const handleConfirmClick = () => {
    const selectedNotes = avize.filter((note) =>
      selectedIds.has(note._id.toString())
    )
    onConfirm(selectedNotes)
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Încarcă Avize</DialogTitle>
          <DialogDescription>
            Selectează avizele livrate și nefacturate pentru acest șantier.
          </DialogDescription>
        </DialogHeader>

        <div className='max-h-[400px] overflow-y-auto space-y-2 p-1'>
          {isLoading && (
            <div className='flex items-center justify-center p-8'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          )}

          {!isLoading && avize.length === 0 && (
            <p className='text-center text-muted-foreground p-8'>
              Niciun aviz livrat și nefacturat nu a fost găsit pentru această
              adresă.
            </p>
          )}

          {!isLoading &&
            avize.map((note) => {
              const noteId = note._id.toString()
              const isSelected = selectedIds.has(noteId)
              return (
                <div
                  key={noteId}
                  className={cn(
                    'flex items-center space-x-4 rounded-md border p-4 cursor-pointer',
                    isSelected && 'border-primary ring-1 ring-primary'
                  )}
                  onClick={() => handleToggleSelect(noteId)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleSelect(noteId)}
                    aria-label={`Selectează aviz ${note.noteNumber}`}
                  />
                  <div className='flex-1 grid grid-cols-3 gap-4 text-sm'>
                    <div className='font-semibold'>
                      {note.seriesName}-{note.noteNumber}
                    </div>
                    <div>
                      {format(new Date(note.createdAt), 'P', { locale: ro })}
                    </div>
                    <div className='text-right font-medium'>
                      {formatCurrency(note.totals.grandTotal)}
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
            Încarcă {selectedIds.size} Avize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
