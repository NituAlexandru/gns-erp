// app/(root)/financial/components/FinancialHeader.tsx
'use client'

import { Button } from '@/components/ui/button'
import { FileCheck, FileText, PlusCircle } from 'lucide-react'

export default function FinancialHeader() {
  return (
    <div className='flex flex-wrap items-center justify-between gap-4'>
      {/* Titlu și descriere */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>
          Platforma Financiară Genesis
        </h1>
        <p className='text-muted-foreground'>
          Vizualizează și gestionează documentele financiare.
        </p>
      </div>

      {/* Butoane acțiuni rapide */}
      <div className='flex flex-wrap gap-2'>
        <Button variant='outline'>
          <PlusCircle className='w-4 h-4 mr-2' />
          Nou Document
        </Button>
        <Button variant='secondary'>
          <FileCheck className='w-4 h-4 mr-2' />
          Creează Aviz
        </Button>
        <Button>
          <FileText className='w-4 h-4 mr-2' />
          Creează Factură
        </Button>
      </div>
    </div>
  )
}
