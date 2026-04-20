'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ReportDefinition } from '@/lib/db/modules/reports/reports.types'
import { generateReportAction } from '@/lib/db/modules/reports/reports.actions'

interface ClientDetailsReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportDefinition | null
}

export function ClientDetailsReportDialog({
  open,
  onOpenChange,
  report,
}: ClientDetailsReportDialogProps) {
  const [loading, setLoading] = useState(false)

  const [contractStatus, setContractStatus] = useState('ALL')
  const [creditLimitStatus, setCreditLimitStatus] = useState('ALL')
  const [lockingStatus, setLockingStatus] = useState('ALL')

  useEffect(() => {
    if (open) {
      setContractStatus('ALL')
      setCreditLimitStatus('ALL')
      setLockingStatus('ALL')
    }
  }, [open])

  const handleGenerate = async () => {
    if (!report) return
    setLoading(true)

    const filtersPayload = {
      contractStatus,
      creditLimitStatus,
      lockingStatus,
    }

    try {
      const result = await generateReportAction(report.id, filtersPayload)

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
        toast.success('Raport Administrativ generat cu succes!')
        onOpenChange(false)
      } else {
        toast.error(result.message || 'Eroare la generarea raportului.')
      }
    } catch (err) {
      console.error(err)
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setLoading(false)
    }
  }

  if (!report) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[450px]'>
        <DialogHeader>
          <DialogTitle>{report.title}</DialogTitle>
          <DialogDescription>{report.description}</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-5 py-4'>
          {/* Situație Contract */}
          <div className='space-y-2'>
            <Label>Situație Contract</Label>
            <Select value={contractStatus} onValueChange={setContractStatus}>
              <SelectTrigger>
                <SelectValue placeholder='Selectează starea contractului' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Toți Clienții</SelectItem>
                <SelectItem value='ACTIVE'>Cu contract activ</SelectItem>
                <SelectItem value='NONE'>Fără contract</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Situație Plafon */}
          <div className='space-y-2'>
            <Label>Situație Plafon de Credit</Label>
            <Select
              value={creditLimitStatus}
              onValueChange={setCreditLimitStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder='Selectează plafonul' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Toți Clienții</SelectItem>
                <SelectItem value='LIMITED'>
                  Cu Plafon Setat (Limitați)
                </SelectItem>
                <SelectItem value='UNLIMITED'>
                  Nelimitați (Nesetat sau 0)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Status Blocare */}
          <div className='space-y-2'>
            <Label>Status Blocare Livrări</Label>
            <Select value={lockingStatus} onValueChange={setLockingStatus}>
              <SelectTrigger>
                <SelectValue placeholder='Selectează status livrări' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Toți Clienții</SelectItem>
                <SelectItem value='BLOCKED'>Doar Clienți Blocați</SelectItem>
                <SelectItem value='ACTIVE'>Doar Clienți Activi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Anulează
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Generează Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
