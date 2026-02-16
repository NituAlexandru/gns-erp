'use client'

import { useState, useEffect, useMemo } from 'react'
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
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

import { getAgentSalesDetails } from '@/lib/db/modules/overview/agent-sales.actions'
import { AgentSalesBreakdown } from './components/AgentSalesBreakdown'
import { SalesListSelector } from './components/lists/SalesListSelector'

export default function AgentSalesDetailsPage() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // --- STATE FILTRE (Identic cu Widget-ul) ---
  const [dateFrom, setDateFrom] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [dateTo, setDateTo] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [period, setPeriod] = useState<string>('this-month')
  const [includeDrafts, setIncludeDrafts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [useLists, setUseLists] = useState(true)

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

  // Încărcare date la schimbarea filtrelor
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        // Folosim variabilele de stare care sunt deja setate pe Luna Curentă
        const res = await getAgentSalesDetails({
          startDate: new Date(dateFrom),
          endDate: new Date(dateTo + 'T23:59:59'),
          includeDrafts: includeDrafts,
          period: 'month',
          useManualAssignments: useLists,
        })

        if (res.success) {
          setData(res.data || [])
        }
      } catch (error) {
        console.error('Eroare la încărcarea datelor:', error)
      } finally {
        setIsLoading(false)
      }
    }

    load()
    // Dependențele asigură că datele se reîncarcă automat la orice schimbare de filtru
  }, [dateFrom, dateTo, includeDrafts, useLists])

  // Căutare locală (Client-side) pentru a fi instantanee
  const filteredData = useMemo(() => {
    return data.filter((agent) =>
      agent.agentName.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [data, searchQuery])

  return (
    <div className='p-0 space-y-2 min-h-screen'>
      {/* Header & Back */}
      <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='sm' asChild>
            <Link href='/admin/overview'>
              <ArrowLeft className='h-4 w-4 mr-2' /> Înapoi
            </Link>
          </Button>
          <h1 className='text-2xl font-bold tracking-tight '>
            Detalii Vânzări Agenți
          </h1>
        </div>
        <SalesListSelector isChecked={useLists} onToggle={setUseLists} />
        {/* Search Input */}
        <div className='relative w-full md:w-64'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 ' />
          <Input
            placeholder='Caută agent...'
            className='pl-9  '
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Rând Filtre (Identic cu Widget-ul) */}
      <div className='flex flex-wrap items-center gap-2 p-2 rounded-lg border '>
        <Tabs
          value={period}
          onValueChange={handlePeriodChange}
          className='w-full lg:w-auto'
        >
          <TabsList className='h-8 p-1'>
            <TabsTrigger
              value='today'
              className='text-xs px-3 h-6 cursor-pointer'
            >
              Azi
            </TabsTrigger>
            <TabsTrigger
              value='this-week'
              className='text-xs px-3 h-6 cursor-pointer'
            >
              Săpt
            </TabsTrigger>
            <TabsTrigger
              value='this-month'
              className='text-xs px-3 h-6 cursor-pointer'
            >
              Luna
            </TabsTrigger>
            <TabsTrigger
              value='this-year'
              className='text-xs px-3 h-6 cursor-pointer'
            >
              An
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Separator orientation='vertical' className='hidden lg:block h-6 ' />

        <div className='flex items-center gap-2'>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='outline' size='sm' className='h-8  text-xs'>
                <CalendarIcon className='mr-2 h-3 w-3' />
                {format(parseISO(dateFrom), 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0  '>
              <Calendar
                mode='single'
                selected={parseISO(dateFrom)}
                onSelect={(d) => d && setDateFrom(format(d, 'yyyy-MM-dd'))}
              />
            </PopoverContent>
          </Popover>
          <span>-</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='outline' size='sm' className='h-8  text-xs'>
                <CalendarIcon className='mr-2 h-3 w-3' />
                {format(parseISO(dateTo), 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0  '>
              <Calendar
                mode='single'
                selected={parseISO(dateTo)}
                onSelect={(d) => d && setDateTo(format(d, 'yyyy-MM-dd'))}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Separator orientation='vertical' className='hidden lg:block h-6 ' />

        <div className='flex items-center gap-2'>
          <Switch
            id='det-draft'
            checked={includeDrafts}
            onCheckedChange={setIncludeDrafts}
            className='data-[state=checked]:bg-[#dc2626] cursor-pointer'
          />
          <Label htmlFor='det-draft' className='text-xs  cursor-pointer'>
            Include Neaprobate
          </Label>
        </div>
      </div>

      {/* Rezultate */}
      {isLoading ? (
        <div className='flex h-[40vh] items-center justify-center'>
          <Loader2 className='animate-spin h-8 w-8 ' />
        </div>
      ) : (
        <AgentSalesBreakdown data={filteredData} />
      )}
    </div>
  )
}
