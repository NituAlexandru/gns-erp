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
import { Checkbox } from '@/components/ui/checkbox'
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

interface ProductMarginReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportDefinition | null
}

export function ProductMarginReportDialog({
  open,
  onOpenChange,
  report,
}: ProductMarginReportDialogProps) {
  const [loading, setLoading] = useState(false)

  // Filtre Perioadă
  const [period, setPeriod] = useState<string>('today')
  const [dateFrom, setDateFrom] = useState<string>(
    format(startOfDay(new Date()), 'yyyy-MM-dd'),
  )
  const [dateTo, setDateTo] = useState<string>(
    format(endOfDay(new Date()), 'yyyy-MM-dd'),
  )

  // Filtre Tipuri Articole
  const [includeProducts, setIncludeProducts] = useState(true)
  const [includePackaging, setIncludePackaging] = useState(false)
  const [includeServices, setIncludeServices] = useState(false)
  const [includeManual, setIncludeManual] = useState(false)

  useEffect(() => {
    if (open) {
      setPeriod('today')
      setDateFrom(format(startOfDay(new Date()), 'yyyy-MM-dd'))
      setDateTo(format(endOfDay(new Date()), 'yyyy-MM-dd'))
      setIncludeProducts(true)
      setIncludePackaging(false)
      setIncludeServices(false)
      setIncludeManual(false)
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
    const formatted = format(date, 'yyyy-MM-dd')
    if (type === 'from') setDateFrom(formatted)
    else setDateTo(formatted)
  }

  const handleGenerate = async () => {
    if (!report) return
    if (
      !includeProducts &&
      !includePackaging &&
      !includeServices &&
      !includeManual
    ) {
      toast.error('Vă rugăm să selectați cel puțin un tip de articol.')
      return
    }

    setLoading(true)

    const filtersPayload = {
      startDate: dateFrom,
      endDate: dateTo,
      includeProducts,
      includePackaging,
      includeServices,
      includeManual,
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
        toast.success('Raport marje generat cu succes!')
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
          <div className='space-y-2 '>
            <Label>Perioadă Raport</Label>
            <Tabs
              value={period}
              onValueChange={handlePeriodChange}
              className='w-full'
            >
              <TabsList className='grid w-full grid-cols-4'>
                <TabsTrigger value='today'>Astăzi</TabsTrigger>
                <TabsTrigger value='this-week'>Săptămâna Curentă</TabsTrigger>
                <TabsTrigger value='this-month'>Luna Curentă</TabsTrigger>
                <TabsTrigger value='this-year'>Anul Curent</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* DATE PICKERS */}
          <div className='flex items-center gap-4 justify-between'>
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

            <span className='mt-4'>-</span>

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

          <Separator />

          {/* TIPURI ARTICOLE */}
          <div className='space-y-3'>
            <Label>Ce elemente analizăm?</Label>
            <div className='grid grid-cols-2 gap-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='chk-products'
                  checked={includeProducts}
                  onCheckedChange={(c) => setIncludeProducts(!!c)}
                />
                <Label
                  htmlFor='chk-products'
                  className='cursor-pointer font-medium'
                >
                  Produse ERP
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='chk-packaging'
                  checked={includePackaging}
                  onCheckedChange={(c) => setIncludePackaging(!!c)}
                />
                <Label
                  htmlFor='chk-packaging'
                  className='cursor-pointer font-medium'
                >
                  Ambalaje
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='chk-services'
                  checked={includeServices}
                  onCheckedChange={(c) => setIncludeServices(!!c)}
                />
                <Label
                  htmlFor='chk-services'
                  className='cursor-pointer font-medium'
                >
                  Servicii
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='chk-manual'
                  checked={includeManual}
                  onCheckedChange={(c) => setIncludeManual(!!c)}
                />
                <Label
                  htmlFor='chk-manual'
                  className='cursor-pointer font-medium'
                >
                  Linii Manuale
                </Label>
              </div>
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
