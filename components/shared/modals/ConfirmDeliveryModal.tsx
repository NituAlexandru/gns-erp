'use client'

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

interface ConfirmDeliveryModalProps {
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}

export function ConfirmDeliveryModal({
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDeliveryModalProps) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className='sm:max-w-[425px] md:max-w-[450px]'>
        <DialogHeader>
          <DialogTitle>Confirmare Livrare</DialogTitle>
          <DialogDescription>
            Ești sigur că dorești să confirmi această livrare? Stocul va fi
            scăzut (FIFO) și costurile vor fi înregistrate.
            <br />
            <br />
            <strong className='text-destructive'>
              Această acțiune este ireversibilă iar documentul NU mai poate fi
              modificat.
            </strong>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type='button'
            variant='ghost'
            onClick={onCancel}
            disabled={isLoading}
          >
            Revocă
          </Button>
          <Button type='button' onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Da, confirmă livrarea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
