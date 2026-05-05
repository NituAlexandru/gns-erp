'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { generateReportAction } from '@/lib/db/modules/reports/reports.actions'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import { TIMEZONE } from '@/lib/constants'
import { formatInTimeZone } from 'date-fns-tz'

interface PrintTabExportButtonProps {
  entityId: string
  entityType: 'CLIENT' | 'SUPPLIER'
  activeTab: string
}

export function PrintTabExportButton({
  entityId,
  entityType,
  activeTab,
}: PrintTabExportButtonProps) {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  if (activeTab === 'details' || activeTab === 'payments') return null

  const handleExport = async () => {
    setIsLoading(true)

    // Extragem datele de filtrare direct din URL
    const currentDate = new Date()
    const currentYear = formatInTimeZone(currentDate, TIMEZONE, 'yyyy')

    const fromDate = searchParams.get('from') || `${currentYear}-01-01`
    const toDate = searchParams.get('to') || `${currentYear}-12-31`
    const status = searchParams.get('status') || 'ALL'

    const filters = {
      entityId,
      entityType,
      activeTab,
      fromDate,
      toDate,
      status, // Folosit doar pentru facturi
    }

    try {
      // Apelăm același mecanism global de rapoarte, creând un ID special: 'entity-tab-export'
      const result = await generateReportAction('entity-tab-export', filters)

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
        toast.success('Export generat cu succes!')
      } else {
        toast.error(result.message || 'Eroare la generarea exportului.')
      }
    } catch (err) {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant='outline'
      className='gap-2 ml-2'
      onClick={handleExport}
      disabled={isLoading}
      title='Descarcă tabelul în format Excel pentru perioada selectată'
    >
      {isLoading ? (
        <Loader2 className='h-4 w-4 animate-spin' />
      ) : (
        <FileDown className='h-4 w-4' />
      )}
      Export Excel
    </Button>
  )
}
