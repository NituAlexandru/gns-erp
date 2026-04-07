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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { ReportDefinition } from '@/lib/db/modules/reports/reports.types'
import { generateReportAction } from '@/lib/db/modules/reports/reports.actions'

interface SupplierBalancesReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportDefinition | null
}

export function SupplierBalancesReportDialog({
  open,
  onOpenChange,
  report,
}: SupplierBalancesReportDialogProps) {
  const [loading, setLoading] = useState(false)

  // State filtre
  const [balanceType, setBalanceType] = useState('ALL')
  const [overdueDays, setOverdueDays] = useState('ALL')
  const [minAmt, setMinAmt] = useState('')
  const [maxAmt, setMaxAmt] = useState('')
  const [includeDetails, setIncludeDetails] = useState(false)
  const [onlyOverdue, setOnlyOverdue] = useState(false)

  // Resetare la deschidere
  useEffect(() => {
    if (open) {
      setBalanceType('ALL')
      setOverdueDays('ALL')
      setMinAmt('')
      setMaxAmt('')
      setIncludeDetails(false)
      setOnlyOverdue(false)
    }
  }, [open])

  const handleGenerate = async () => {
    if (!report) return
    setLoading(true)

    const filtersPayload = {
      balanceType,
      overdueDays,
      minAmt,
      maxAmt,
      includeDetails,
      onlyOverdue,
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
        toast.success('Raport Solduri Furnizori generat cu succes!')
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
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{report.title}</DialogTitle>
          <DialogDescription>{report.description}</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-5 py-4'>
          {/* Tip Sold */}
          <div className='space-y-2'>
            <Label>Tip Sold Furnizor</Label>
            <Select value={balanceType} onValueChange={setBalanceType}>
              <SelectTrigger>
                <SelectValue placeholder='Alege tipul de sold' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Toți Furnizorii</SelectItem>
                <SelectItem value='DEBT'>Doar cu Datorii</SelectItem>
                <SelectItem value='ADVANCE'>Doar cu Avans</SelectItem>
                <SelectItem value='OVERDUE'>Facturi Restante</SelectItem>
                <SelectItem value='UNALLOCATED'>Plăți Nealocate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Vechime Restanțe */}
          <div className='space-y-2'>
            <Label>Vechime Restanțe (Zile)</Label>
            <Select
              value={overdueDays}
              onValueChange={setOverdueDays}
              disabled={
                balanceType === 'ADVANCE' || balanceType === 'UNALLOCATED'
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Orice vechime' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Orice vechime</SelectItem>
                <SelectItem value='15'>&gt; 15 zile</SelectItem>
                <SelectItem value='30'>&gt; 30 zile</SelectItem>
                <SelectItem value='45'>&gt; 45 zile</SelectItem>
                <SelectItem value='60'>&gt; 60 zile</SelectItem>
                <SelectItem value='90'>&gt; 90 zile</SelectItem>
                <SelectItem value='120'>&gt; 120 zile</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Interval Sumă */}
          <div className='space-y-2'>
            <Label>Interval Sumă Sold (Min - Max)</Label>
            <div className='flex items-center gap-4'>
              <Input
                type='number'
                placeholder='Sumă Min'
                value={minAmt}
                onChange={(e) => setMinAmt(e.target.value)}
              />
              <span className='text-muted-foreground'>-</span>
              <Input
                type='number'
                placeholder='Sumă Max'
                value={maxAmt}
                onChange={(e) => setMaxAmt(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* CHECKBOX DOAR RESTANȚE */}
          <div className='flex items-center space-x-2 bg-muted/50 p-3 rounded-lg border'>
            <Checkbox
              id='chk-only-overdue'
              checked={onlyOverdue}
              onCheckedChange={(c) => setOnlyOverdue(!!c)}
            />
            <div className='flex flex-col gap-1'>
              <Label
                htmlFor='chk-only-overdue'
                className='cursor-pointer font-bold text-red-600'
              >
                Strict Facturi Restante
              </Label>
              <span className='text-xs text-muted-foreground'>
                Raportul și sumele vor fi calculate strict pe baza facturilor cu
                termenul depășit.
              </span>
            </div>
          </div>

          {/* CHECKBOX DETALII */}
          <div className='flex items-center space-x-2 bg-muted/50 p-3 rounded-lg border'>
            <Checkbox
              className='cursor-pointer'
              id='chk-details-balances'
              checked={includeDetails}
              onCheckedChange={(c) => setIncludeDetails(!!c)}
            />
            <div className='flex flex-col gap-1'>
              <Label
                htmlFor='chk-details-balances'
                className='cursor-pointer font-bold text-primary'
              >
                Afișează Detalii (Facturi și Compensări)
              </Label>
              <span className='text-xs text-muted-foreground'>
                Dacă bifezi, raportul va lista sub fiecare furnizor toate
                documentele sale (facturi, plăți, compensări) exact ca în
                aplicație.
              </span>
            </div>
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
