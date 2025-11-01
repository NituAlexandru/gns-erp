'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface CancelNoteModalProps {
  onConfirm: (reason: string) => Promise<void>
  onCancel: () => void
  isLoading: boolean
}

export function CancelNoteModal({
  onConfirm,
  onCancel,
  isLoading,
}: CancelNoteModalProps) {
  const [reason, setReason] = useState('')
  const isReasonValid = reason.trim().length >= 5

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isReasonValid || isLoading) return
    onConfirm(reason)
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Anulare Aviz</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să anulezi acest aviz? Acțiunea va debloca
              livrarea pentru a putea fi modificată și re-avizată.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='reason' className='text-right'>
                Motiv
              </Label>
              <Textarea
                id='reason'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className='col-span-3'
                placeholder='Motivul anulării (min. 5 caractere)...'
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='ghost'
              onClick={onCancel}
              disabled={isLoading}
            >
              Revocă
            </Button>
            <Button
              type='submit'
              variant='destructive'
              disabled={!isReasonValid || isLoading}
            >
              {isLoading ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : null}
              Confirmă Anularea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
