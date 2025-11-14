'use client'

import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'

interface ReceivablesHeaderProps {
  isAdmin: boolean
  onOpenCreatePayment: () => void
}

export function ReceivablesHeader({
  isAdmin,
  onOpenCreatePayment,
}: ReceivablesHeaderProps) {
  return (
    <div className='flex items-center justify-between'>
      <div>
        <h2 className='text-2xl font-bold'>Încasări Clienți</h2>
        <p className='text-muted-foreground'>
          Lista tuturor încasărilor înregistrate de la clienți.
        </p>
      </div>

      {isAdmin && (
        <Button className='gap-2' onClick={onOpenCreatePayment}>
          <PlusCircle size={18} />
          Înregistrează Încasare
        </Button>
      )}
    </div>
  )
}
