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
import { getSeries } from '@/lib/db/modules/numbering/series.actions' 

interface SalesPeriodReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportDefinition | null
}

export function SalesPeriodReportDialog({
  open,
  onOpenChange,
  report,
}: SalesPeriodReportDialogProps) {
  const [loading, setLoading] = useState(false)

  // Perioadă
  const [period, setPeriod] = useState<string>('this-month')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Date Serii
  const [availableSeries, setAvailableSeries] = useState<string[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string[]>(['ALL'])
  const [includeDetails, setIncludeDetails] = useState(false)

  useEffect(() => {
    if (open) {
      const now = new Date()
      setPeriod('this-month')
      setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'))
      setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'))
      setSelectedSeries(['ALL'])
      setIncludeDetails(false)

      // Preia seriile din baza de date
      const fetchSeries = async () => {
        const seriesData = await getSeries()
        // Filtrăm doar Facturile pentru a nu aduce chitanțe sau altele în listă
        const filtered = seriesData
          .filter(
            (s: any) =>
              s.documentType === 'Factura' ||
              s.documentType === 'FacturaStorno',
          )
          .map((s: any) => s.name)
        setAvailableSeries(filtered)
      }
      fetchSeries()
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

  const toggleSeries = (serie: string) => {
    if (serie === 'ALL') {
      setSelectedSeries(['ALL'])
      return
    }

    let newSelection = selectedSeries.filter((s) => s !== 'ALL')
    if (newSelection.includes(serie)) {
      newSelection = newSelection.filter((s) => s !== serie)
    } else {
      newSelection.push(serie)
    }

    if (newSelection.length === 0) {
      newSelection = ['ALL']
    }
    setSelectedSeries(newSelection)
  }

  const handleGenerate = async () => {
    if (!report) return
    setLoading(true)

    const filtersPayload = {
      startDate: dateFrom,
      endDate: dateTo,
      selectedSeries,
      includeDetails,
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
        toast.success('Raport Vânzări generat cu succes!')
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
            <Label>Perioadă Raport</Label>
            <Tabs
              value={period}
              onValueChange={handlePeriodChange}
              className='w-full'
            >
              <TabsList className='grid w-full grid-cols-4'>
                <TabsTrigger value='today'>Astăzi</TabsTrigger>
                <TabsTrigger value='this-week'>Săpt. Curentă</TabsTrigger>
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
                      <span>Alege</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    mode='single'
                    selected={dateFrom ? parseISO(dateFrom) : undefined}
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
                      <span>Alege</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    mode='single'
                    selected={dateTo ? parseISO(dateTo) : undefined}
                    onSelect={(d) => handleManualDateChange('to', d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* SELECTARE SERII */}
          <div className='space-y-3'>
            <Label>Filtru Serii Facturi</Label>
            <div className='flex flex-wrap gap-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='chk-all-series'
                  checked={selectedSeries.includes('ALL')}
                  onCheckedChange={() => toggleSeries('ALL')}
                />
                <Label
                  htmlFor='chk-all-series'
                  className='cursor-pointer font-medium'
                >
                  Toate Seriile
                </Label>
              </div>

              {availableSeries.map((serie) => (
                <div key={serie} className='flex items-center space-x-2'>
                  <Checkbox
                    id={`chk-serie-${serie}`}
                    checked={selectedSeries.includes(serie)}
                    onCheckedChange={() => toggleSeries(serie)}
                  />
                  <Label
                    htmlFor={`chk-serie-${serie}`}
                    className='cursor-pointer'
                  >
                    {serie}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* CHECKBOX DETALII */}
          <div className='flex items-center space-x-2 bg-muted/50 p-3 rounded-lg border'>
            <Checkbox
              id='chk-details'
              checked={includeDetails}
              onCheckedChange={(c) => setIncludeDetails(!!c)}
            />
            <div className='flex flex-col gap-1'>
              <Label
                htmlFor='chk-details'
                className='cursor-pointer font-bold text-primary'
              >
                Afișează Detalii (Linii Factură)
              </Label>
              <span className='text-xs text-muted-foreground'>
                Dacă bifezi, raportul va afișa sub fiecare factură și produsele
                vândute pe ea (cu profit / marjă per linie).
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
