'use client'

import { useState, useEffect } from 'react'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  parseISO,
} from 'date-fns'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { ReportDefinition } from '@/lib/db/modules/reports/reports.types'
import { generateReportAction } from '@/lib/db/modules/reports/reports.actions'

interface AgentSalesReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportDefinition | null
}

export function AgentSalesReportDialog({
  open,
  onOpenChange,
  report,
}: AgentSalesReportDialogProps) {
  const [loading, setLoading] = useState(false)

  // --- STATE FILTRE (Copiat din AgentSalesDetailsPage) ---
  const [period, setPeriod] = useState<string>('this-month')
  const [dateFrom, setDateFrom] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [dateTo, setDateTo] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [includeDrafts, setIncludeDrafts] = useState(false)
  const [useLists, setUseLists] = useState(true)

  // Reset la deschidere
  useEffect(() => {
    if (open) {
      setPeriod('this-month')
      setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
      setDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
      setIncludeDrafts(false)
      setUseLists(true)
    }
  }, [open])

  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    const now = new Date()
    switch (value) {
      case 'today':
        setDateFrom(format(startOfDay(now), 'yyyy-MM-dd'))
        setDateTo(format(endOfDay(now), 'yyyy-MM-dd'))
        break
      case 'this-week':
        setDateFrom(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
        setDateTo(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
        break
      case 'this-month':
        setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'))
        setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'))
        break
      case 'this-year':
        setDateFrom(format(startOfYear(now), 'yyyy-MM-dd'))
        setDateTo(format(endOfYear(now), 'yyyy-MM-dd'))
        break
    }
  }

  const handleManualDateChange = (
    type: 'from' | 'to',
    date: Date | undefined,
  ) => {
    if (!date) return
    // Dacă utilizatorul schimbă manual, deselectăm tab-urile presetate
    // setPeriod('custom') // Opțional, dacă vrei să arăți că e custom
    const formatted = format(date, 'yyyy-MM-dd')
    if (type === 'from') setDateFrom(formatted)
    else setDateTo(formatted)
  }

  const handleGenerate = async () => {
    if (!report) return
    setLoading(true)

    // Payload specific pentru acest raport
    const filtersPayload = {
      startDate: dateFrom,
      endDate: dateTo,
      includeDrafts,
      useManualAssignments: useLists,
    }

    try {
      const result = await generateReportAction(report.id, filtersPayload)

      if (result.success && result.data && result.filename) {
        // Conversie Base64 la Blob
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
        toast.success('Raport generat cu succes!')
        onOpenChange(false)
      } else {
        toast.error(result.message || 'Eroare la generare.')
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
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>{report.title}</DialogTitle>
          <DialogDescription>{report.description}</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-6 py-4'>
          {/* TABURI PERIOADĂ */}
          <div className='space-y-2'>
            <Label>Perioadă Rapidă</Label>
            <Tabs
              value={period}
              onValueChange={handlePeriodChange}
              className='w-full'
            >
              <TabsList className='grid w-full grid-cols-4'>
                <TabsTrigger value='today'>Azi</TabsTrigger>
                <TabsTrigger value='this-week'>Săptămâna Asta</TabsTrigger>
                <TabsTrigger value='this-month'>Luna Asta</TabsTrigger>
                <TabsTrigger value='this-year'>Anul Ăsta</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Separator />

          {/* DATE PICKERS & SWITCH */}
          <div className='flex flex-col sm:flex-row gap-4 justify-between items-end'>
            {/* Pickers */}
            <div className='flex items-center gap-2'>
              <div className='grid gap-1.5'>
                <Label className='text-xs'>De la</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-[140px] justify-start text-left font-normal text-xs',
                        !dateFrom && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className='mr-2 h-3 w-3' />
                      {dateFrom ? (
                        format(parseISO(dateFrom), 'dd/MM/yyyy')
                      ) : (
                        <span>Pick</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='start'>
                    <Calendar
                      mode='single'
                      selected={parseISO(dateFrom)}
                      onSelect={(d) => handleManualDateChange('from', d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <span className='mb-2'>-</span>

              <div className='grid gap-1.5'>
                <Label className='text-xs'>Până la</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-[140px] justify-start text-left font-normal text-xs',
                        !dateTo && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className='mr-2 h-3 w-3' />
                      {dateTo ? (
                        format(parseISO(dateTo), 'dd/MM/yyyy')
                      ) : (
                        <span>Pick</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='start'>
                    <Calendar
                      mode='single'
                      selected={parseISO(dateTo)}
                      onSelect={(d) => handleManualDateChange('to', d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Switch */}
            <div className='flex items-center gap-2 border p-2 rounded-md bg-muted/20'>
              <Switch
                id='det-draft-modal'
                checked={includeDrafts}
                onCheckedChange={setIncludeDrafts}
                className='data-[state=checked]:bg-[#dc2626]'
              />
              <Label
                htmlFor='det-draft-modal'
                className='text-xs cursor-pointer'
              >
                Include Neaprobate
              </Label>
            </div>
          </div>
        </div>
        <Separator className='bg-border/50 my-3' />

        <div className='flex items-center justify-between'>
          <div className='flex flex-col gap-0.5'>
            <Label
              htmlFor='use-lists-modal'
              className='text-sm cursor-pointer font-medium'
            >
              Folosește Listele Personalizate
            </Label>
            <span className='text-[10px] text-muted-foreground'>
              Realocă clienții conform listelor definite
            </span>
          </div>
          <Switch
            id='use-lists-modal'
            checked={useLists}
            onCheckedChange={setUseLists}
            className='data-[state=checked]:bg-red-600'
          />
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
