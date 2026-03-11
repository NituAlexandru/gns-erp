'use client'

import { useState, useEffect } from 'react'
import { startOfYear, endOfYear, format, parseISO } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { SalesOverviewChart } from './SalesOverviewChart'
import { getSalesOverviewStats } from '@/lib/db/modules/overview/sales-overview.actions'

export function SalesOverviewWidget() {
  const [isLoading, setIsLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])
  const [uniqueSeries, setUniqueSeries] = useState<string[]>([])

  // Implicit afișăm LUNI, pentru tot ANUL curent
  const [groupBy, setGroupBy] = useState<'month' | 'quarter' | 'year'>('month')
  const [dateFrom, setDateFrom] = useState<string>(
    format(startOfYear(new Date()), 'yyyy-MM-dd'),
  )
  const [dateTo, setDateTo] = useState<string>(
    format(endOfYear(new Date()), 'yyyy-MM-dd'),
  )

  const [includeDrafts, setIncludeDrafts] = useState(true)
  const [viewMode, setViewMode] = useState<'net' | 'vat' | 'gross'>('gross')

  const handleManualDateChange = (
    type: 'from' | 'to',
    date: Date | undefined,
  ) => {
    if (!date) return
    const formattedDate = format(date, 'yyyy-MM-dd')
    if (type === 'from') setDateFrom(formattedDate)
    else setDateTo(formattedDate)
  }

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const result = await getSalesOverviewStats({
          startDate: new Date(dateFrom),
          endDate: new Date(dateTo + 'T23:59:59'),
          groupBy: groupBy,
          includeDrafts,
        })

        if (result.success && result.data) {
          setChartData(result.data.chartData)
          setUniqueSeries(result.data.uniqueSeries)
        } else {
          toast.error('Eroare la preluarea datelor de vânzări.')
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [dateFrom, dateTo, groupBy, includeDrafts])

  return (
    <Card className='h-full flex flex-col shadow-md border-border/60 gap-0'>
      <CardHeader className='pb-0 space-y-0'>
        <div className='flex flex-col items-start justify-between'>
          <div>
            <CardTitle className='text-lg font-bold'>
              Evoluție Vânzări Serii
            </CardTitle>
            <CardDescription>
              Grafic interactiv cu posibilitate de filtrare pe serii
            </CardDescription>
          </div>

          <div className='mt-1'>
            <Select
              value={viewMode}
              onValueChange={(val: any) => setViewMode(val)}
            >
              <SelectTrigger className='w-[180px] h-8 text-xs font-semibold'>
                <SelectValue placeholder='Alege afișare' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='net'>Total Net (Fără TVA)</SelectItem>
                <SelectItem value='vat'>Total TVA</SelectItem>
                <SelectItem value='gross'>Total Vânzare (Brut)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='flex flex-col xl:flex-row xl:items-center gap-4 bg-muted/40 p-2 rounded-lg border border-border/50 overflow-x-auto'>
          {/* TABS PENTRU TIPUL DE GRUPARE */}
          <Tabs
            value={groupBy}
            onValueChange={(val: any) => setGroupBy(val)}
            className='w-full xl:w-auto shrink-0'
          >
            <TabsList className='grid w-full grid-cols-3 xl:w-auto h-8'>
              <TabsTrigger
                value='month'
                className='text-xs px-4 cursor-pointer'
              >
                Luni
              </TabsTrigger>
              <TabsTrigger
                value='quarter'
                className='text-xs px-4 cursor-pointer'
              >
                Trimestre
              </TabsTrigger>
              <TabsTrigger value='year' className='text-xs px-4 cursor-pointer'>
                Ani
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Separator orientation='vertical' className='hidden xl:block h-6' />

          <div className='flex items-center gap-2 shrink-0'>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'h-8 w-[110px] justify-start text-left font-normal text-xs',
                    !dateFrom && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className='mr-2 h-3 w-3' />
                  {dateFrom ? (
                    format(parseISO(dateFrom), 'dd/MM/yyyy')
                  ) : (
                    <span>De la</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={parseISO(dateFrom)}
                  onSelect={(date) => handleManualDateChange('from', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className='text-muted-foreground text-xs'>-</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'h-8 w-[110px] justify-start text-left font-normal text-xs',
                    !dateTo && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className='mr-2 h-3 w-3' />
                  {dateTo ? (
                    format(parseISO(dateTo), 'dd/MM/yyyy')
                  ) : (
                    <span>Până la</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={parseISO(dateTo)}
                  onSelect={(date) => handleManualDateChange('to', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Separator orientation='vertical' className='hidden xl:block h-6' />

          <div className='flex items-center gap-2 ml-auto xl:ml-0 shrink-0'>
            <Switch
              id='draft-mode-overview'
              checked={includeDrafts}
              onCheckedChange={setIncludeDrafts}
              className='scale-90 cursor-pointer'
            />
            <Label
              htmlFor='draft-mode-overview'
              className='text-xs font-normal cursor-pointer whitespace-nowrap'
            >
              Include Neaprobate
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex-1 pt-0 pb-0'>
        <SalesOverviewChart
          data={chartData}
          uniqueSeries={uniqueSeries}
          viewMode={viewMode}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  )
}
