'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Printer, Loader2, ChevronDown, List, FileText } from 'lucide-react'
import { generateReportAction } from '@/lib/db/modules/reports/reports.actions'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function PrintBalancesButton() {
  const searchParams = useSearchParams()
  // Folosim un state specific pentru a ști ce fel de raport se încarcă
  const [loadingType, setLoadingType] = useState<'summary' | 'detailed' | null>(
    null,
  )

  const handlePrint = async (withDetails: boolean) => {
    setLoadingType(withDetails ? 'detailed' : 'summary')

    const filters = {
      q: searchParams.get('q') || '',
      balanceType: searchParams.get('balanceType') || 'ALL',
      minAmt: searchParams.get('minAmt') || '',
      maxAmt: searchParams.get('maxAmt') || '',
      overdueDays: searchParams.get('overdueDays') || 'ALL',
      onlyOverdue: searchParams.get('onlyOverdue') === 'true',
      includeDetails: withDetails, 
    }

    try {
      const result = await generateReportAction('client-balances', filters)

      if (result.success && result.data && result.filename) {
        const byteCharacters = atob(result.data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        saveAs(blob, result.filename)
        toast.success('Raport descărcat cu succes!')
      } else {
        toast.error(result.message || 'Eroare la generare.')
      }
    } catch (err) {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setLoadingType(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className='gap-2'
          disabled={loadingType !== null}
        >
          {loadingType !== null ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Printer className='h-4 w-4' />
          )}
          Printează Selecție
          <ChevronDown className='h-4 w-4 opacity-50' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem
          onClick={() => handlePrint(false)}
          className='cursor-pointer gap-2'
        >
          <FileText className='h-4 w-4 text-muted-foreground' />
          Doar Sumar (Fără Detalii)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handlePrint(true)}
          className='cursor-pointer gap-2'
        >
          <List className='h-4 w-4 text-muted-foreground' />
          Complet (Cu Facturi / Plăți)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
