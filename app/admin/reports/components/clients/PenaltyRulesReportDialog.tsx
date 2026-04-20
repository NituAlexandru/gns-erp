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
import { ReportDefinition } from '@/lib/db/modules/reports/reports.types'
import { generateReportAction } from '@/lib/db/modules/reports/reports.actions'
import { getPenaltyRules } from '@/lib/db/modules/financial/penalties/penalty.actions'
import { PenaltyRuleDTO } from '@/lib/db/modules/financial/penalties/penalty.types'

interface PenaltyRulesReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportDefinition | null
}

export function PenaltyRulesReportDialog({
  open,
  onOpenChange,
  report,
}: PenaltyRulesReportDialogProps) {
  const [loading, setLoading] = useState(false)
  const [rules, setRules] = useState<PenaltyRuleDTO[]>([])
  const [isLoadingRules, setIsLoadingRules] = useState(false)

  // State filtru
  const [selectedRuleId, setSelectedRuleId] = useState('ALL')

  useEffect(() => {
    if (open) {
      setSelectedRuleId('ALL')
      fetchRules()
    }
  }, [open])

  const fetchRules = async () => {
    setIsLoadingRules(true)
    try {
      const res = await getPenaltyRules()
      if (res.success && res.data) {
        setRules(res.data)
      }
    } catch (err) {
      toast.error('Eroare la încărcarea listelor de penalități.')
    } finally {
      setIsLoadingRules(false)
    }
  }

  const handleGenerate = async () => {
    if (!report) return
    setLoading(true)

    try {
      const result = await generateReportAction(report.id, {
        ruleId: selectedRuleId,
      })

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
        toast.success('Raportul a fost generat cu succes!')
        onOpenChange(false)
      } else {
        toast.error(result.message || 'Eroare la generarea raportului.')
      }
    } catch (err) {
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
          <div className='space-y-2'>
            <Label>Selectează Lista de Penalizări</Label>
            <Select
              value={selectedRuleId}
              onValueChange={setSelectedRuleId}
              disabled={isLoadingRules}
            >
              <SelectTrigger>
                {isLoadingRules ? (
                  <div className='flex items-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' /> Se încarcă...
                  </div>
                ) : (
                  <SelectValue placeholder='Alege o listă' />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>
                  Toate Listele (Export Multi-Tab)
                </SelectItem>
                {rules.map((rule) => (
                  <SelectItem key={rule._id} value={rule._id}>
                    {rule.name} {rule.isDefault && '(Globală)'} -{' '}
                    {rule.percentagePerDay}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground pt-1'>
              Dacă alegi "Toate listele", fiecare regulă va fi exportată într-un
              tab separat în fișierul Excel.
            </p>
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
          <Button onClick={handleGenerate} disabled={loading || isLoadingRules}>
            {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Generează Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
