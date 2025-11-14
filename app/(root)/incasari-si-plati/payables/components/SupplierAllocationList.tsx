'use client'

import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PopulatedSupplierAllocation } from './SupplierAllocationModal' // Importăm tipul
import { deleteSupplierAllocation } from '@/lib/db/modules/financial/treasury/payables/supplier-allocation.actions'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface SupplierAllocationListProps {
  allocations: PopulatedSupplierAllocation[]
  onAllocationDeleted: () => void
}

export function SupplierAllocationList({
  allocations,
  onAllocationDeleted,
}: SupplierAllocationListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (allocationId: string) => {
    setDeletingId(allocationId)
    try {
      const result = await deleteSupplierAllocation(allocationId)
      if (result.success) {
        toast.success(result.message)
        onAllocationDeleted()
      } else {
        toast.error('Eroare la ștergere:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    }
    setDeletingId(null)
  }

  return (
    <Card className='shadow-none border-dashed p-0'>
      <CardContent className='p-2 space-y-2'>
        {allocations.length === 0 && (
          <p className='text-center text-sm text-muted-foreground py-2'>
            Nicio alocare existentă.
          </p>
        )}
        {allocations.map((alloc) => (
          <div
            key={alloc._id}
            className='flex items-center justify-between rounded-md border bg-background px-2 py-1'
          >
            <div>
              <p className='font-medium'>
                Factura: {alloc.invoiceId?.invoiceNumber}
              </p>
              <p className='text-sm text-muted-foreground'>
                {formatDateTime(new Date(alloc.allocationDate)).dateOnly}
              </p>
            </div>

            <div className='flex items-center gap-2'>
              <span className='font-semibold text-lg'>
                {formatCurrency(alloc.amountAllocated)}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='text-red-600 hover:text-red-700'
                    disabled={!!deletingId}
                  >
                    {deletingId === alloc._id ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Trash2 className='h-4 w-4' />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmă Ștergerea</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ești sigur că vrei să anulezi această alocare de{' '}
                      {formatCurrency(alloc.amountAllocated)}? Suma va fi
                      returnată plății.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anulează</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(alloc._id)}
                      className='bg-red-600 hover:bg-red-700'
                    >
                      Șterge Alocarea
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
