'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
import { ArrowRight, Calendar as CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils' // Asigură-te că ai utilitarul cn
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

import { AgentSalesChart } from './AgentSalesChart'
import { AgentSalesStats } from '@/lib/db/modules/overview/agent-sales.types'
import { getAgentSalesStats } from '@/lib/db/modules/overview/agent-sales.actions'

export function AgentOverviewWidget() {
  const [isLoading, setIsLoading] = useState(true)
  const [agentData, setAgentData] = useState<AgentSalesStats[]>([])

  const [period, setPeriod] = useState<string>('this-month')

  // Păstrăm valorile ca string pentru API, dar le convertim pentru Calendar
  const [dateFrom, setDateFrom] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [dateTo, setDateTo] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  )

  const [includeDrafts, setIncludeDrafts] = useState(false)

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
    setPeriod('custom')
    const formattedDate = format(date, 'yyyy-MM-dd')
    if (type === 'from') setDateFrom(formattedDate)
    else setDateTo(formattedDate)
  }

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const result = await getAgentSalesStats({
          startDate: new Date(dateFrom),
          endDate: new Date(dateTo + 'T23:59:59'),
          period: 'month',
          includeDrafts: includeDrafts,
        })

        if (result.success && result.data) {
          setAgentData(result.data.summary)
        } else {
          toast.error('Eroare la date vânzări.')
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [dateFrom, dateTo, includeDrafts])

  return (
    <Card className='h-full flex flex-col shadow-md border-border/60'>
      <CardHeader className='pb-2 space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-lg font-bold'>
              Top Vânzări Agenți
            </CardTitle>
            <CardDescription>
              Performanța bazată pe produse livrate
            </CardDescription>
          </div>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 gap-1 text-primary hover:text-primary/80'
            asChild
          >
            <Link href='/admin/overview/agents'>
              Vezi Detalii <ArrowRight className='h-3 w-3' />
            </Link>
          </Button>
        </div>

        <div className='flex flex-col xl:flex-row xl:items-center gap-4 bg-muted/40 p-2 rounded-lg border border-border/50'>
          <Tabs
            value={period}
            onValueChange={handlePeriodChange}
            className='w-full xl:w-auto'
          >
            <TabsList className='grid w-full grid-cols-4 xl:w-auto h-8'>
              <TabsTrigger
                value='today'
                className='text-xs px-2 cursor-pointer'
              >
                Azi
              </TabsTrigger>
              <TabsTrigger
                value='this-week'
                className='text-xs px-2 cursor-pointer'
              >
                Săpt
              </TabsTrigger>
              <TabsTrigger
                value='this-month'
                className='text-xs px-2 cursor-pointer'
              >
                Luna
              </TabsTrigger>
              <TabsTrigger
                value='this-year'
                className='text-xs px-2 cursor-pointer'
              >
                An
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Separator orientation='vertical' className='hidden xl:block h-6' />

          {/* Selectori de dată Shadcn */}
          <div className='flex items-center gap-2'>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'h-8 w-[130px] justify-start text-left font-normal text-xs',
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
                    'h-8 w-[130px] justify-start text-left font-normal text-xs',
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

          <div className='flex items-center gap-2 ml-auto xl:ml-0 '>
            <Switch
              id='draft-mode'
              checked={includeDrafts}
              onCheckedChange={setIncludeDrafts}
              className='scale-90 cursor-pointer'
            />
            <Label
              htmlFor='draft-mode'
              className='text-xs font-normal cursor-pointer whitespace-nowrap'
            >
              Include Neaprobate
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex-1  pt-2'>
        <AgentSalesChart data={agentData} isLoading={isLoading} />
      </CardContent>
    </Card>
  )
}
