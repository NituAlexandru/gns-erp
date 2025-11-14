'use client'

import { useState, useEffect } from 'react'
import { Banknote, Library, TrendingDown, TrendingUp } from 'lucide-react'
import { StatCard } from '@/app/(root)/financial/components/StatCard'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { DateRange } from 'react-day-picker'
import { format, startOfMonth } from 'date-fns'
import { ro } from 'date-fns/locale'
import {
  getDynamicClientSummary,
  getDynamicBudgetSummary,
} from '@/lib/db/modules/financial/treasury/summary/summary.actions'
import {
  TreasuryStaticStats,
  ClientPaymentSummary,
  BudgetPaymentSummary,
  OverdueClientSummary,
} from '@/lib/db/modules/financial/treasury/summary/summary.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ClientSummaryList } from './ClientSummaryList'
import { BudgetSummaryAccordion } from './BudgetSummaryAccordion'
import { OverdueClientsAccordion } from './OverdueClientsAccordion'

interface TreasuryDashboardContentProps {
  isAdmin: boolean
  initialStaticStats: TreasuryStaticStats
  initialOverdueClients: OverdueClientSummary[]
}

export function TreasuryDashboardContent({
  isAdmin,
  initialStaticStats,
  initialOverdueClients,
}: TreasuryDashboardContentProps) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  })

  const [clientSummary, setClientSummary] =
    useState<ClientPaymentSummary | null>(null)
  const [budgetSummary, setBudgetSummary] =
    useState<BudgetPaymentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDynamicData = async () => {
      if (!date || !date.from || !date.to) return

      setIsLoading(true)

      const [clientData, budgetData] = await Promise.all([
        getDynamicClientSummary(date.from, date.to),
        getDynamicBudgetSummary(date.from, date.to),
      ])

      setClientSummary(clientData)
      setBudgetSummary(budgetData)
      setIsLoading(false)
    }

    fetchDynamicData()
  }, [date])

  const staticStats = initialStaticStats
  const dynamicStats = {
    totalIncasat: clientSummary?.totalIncasatPerioada || 0,
    totalPlati: budgetSummary?.totalPlatiPerioada || 0,
  }

  const formatShortDate = (dateToFormat: Date) =>
    format(dateToFormat, 'dd.MM.yy', { locale: ro })

  const dateRangeDisplay = (dateRange: DateRange | undefined): string => {
    if (!dateRange || !dateRange.from) {
      return '(Perioadă nevalidă)'
    }
    if (dateRange.to) {
      return `(${formatShortDate(dateRange.from)} - ${formatShortDate(dateRange.to)})`
    }
    return `(${formatShortDate(dateRange.from)})`
  }

  const formattedDateRange = dateRangeDisplay(date)

  return (
    <div className='space-y-2'>
      {/* --- Header (Titlu și Calendar) --- */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Sumar Trezorerie</h2>
          <p className='text-muted-foreground'>
            O privire de ansamblu asupra fluxului de numerar.
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              id='date'
              variant={'outline'}
              className={'w-[300px] justify-start text-left font-normal'}
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'LLL dd, y', { locale: ro })} -{' '}
                    {format(date.to, 'LLL dd, y', { locale: ro })}
                  </>
                ) : (
                  format(date.from, 'LLL dd, y', { locale: ro })
                )
              ) : (
                <span>Alege un interval</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='end'>
            <Calendar
              initialFocus
              mode='range'
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              locale={ro}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* --- Grid de carduri statistice --- */}
      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        {/* Card 1 (Dinamic) */}
        <StatCard
          title={`Total Încasat ${formattedDateRange}`}
          value={formatCurrency(dynamicStats.totalIncasat)}
          icon={<Banknote className='text-green-500' size={24} />}
        />

        {/* Card 2 (Static) */}
        <StatCard
          title='Total de Încasat (Sold Clienți)'
          value={formatCurrency(staticStats.totalDeIncasat)}
          icon={<TrendingUp className='text-blue-500' size={24} />}
        />

        {isAdmin && (
          <>
            {/* Card 3 (Static) */}
            <StatCard
              title='Total de Plătit (Sold Furnizori)'
              value={formatCurrency(staticStats.totalDePlatit)}
              icon={<TrendingDown className='text-orange-500' size={24} />}
            />
            {/* Card 4 (Dinamic) */}
            <StatCard
              title={`Total Plăți ${formattedDateRange}`}
              value={formatCurrency(dynamicStats.totalPlati)}
              // FIX: Am eliminat prop-ul 'isLoading'
              icon={<Library className='text-purple-500' size={24} />}
            />
          </>
        )}
      </div>

      {/* --- Secțiuni detaliate (Grid cu 3 coloane) --- */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
        {/* Coloana 1: Încasări pe Client (Dinamic) */}
        <Card>
          <CardHeader>
            <CardTitle>
              Total Încasat (pe Client) - {formattedDateRange}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClientSummaryList
              data={clientSummary?.summaryList || []}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Coloana 2: Plăți pe Buget (Dinamic) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Total Plăți Efectuate {formattedDateRange}</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetSummaryAccordion
                data={budgetSummary?.summaryList || []}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        )}

        {/* NOU - Coloana 3: Clienți Restanți (Static) */}
        <Card className='md:col-span-1'>
          <CardHeader>
            <CardTitle className='text-red-600'>
              Clienți Restanți (All-Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OverdueClientsAccordion data={initialOverdueClients} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
