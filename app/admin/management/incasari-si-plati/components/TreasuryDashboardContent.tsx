'use client'

import { useState, useEffect } from 'react'
import {
  Banknote,
  Library,
  TrendingDown,
  TrendingUp,
  FileText,
  AlertTriangle,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { StatCard } from '@/app/(root)/financial/components/StatCard'
import { Button } from '@/components/ui/button'
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
import { OverdueClientsAccordion } from './OverdueClientsAccordion'
import { getClientPaymentById } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { toast } from 'sonner'
import {
  AllocationModal,
  PopulatedClientPayment,
} from '../receivables/components/AllocationModal'
import { UnallocatedPaymentsList } from './UnallocatedPaymentsList'
import { BudgetSummaryAccordion } from './BudgetSummaryAccordion'

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
  const [selectedPaymentForAllocation, setSelectedPaymentForAllocation] =
    useState<PopulatedClientPayment | null>(null)

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

  // Handler pentru deschiderea modalului când dai click pe o plată nealocată
  const handleOpenAllocation = async (paymentId: string) => {
    try {
      const res = await getClientPaymentById(paymentId)
      if (res.success && res.data) {
        setSelectedPaymentForAllocation(res.data as PopulatedClientPayment)
      } else {
        toast.error('Nu s-au putut încărca detaliile plății.')
      }
    } catch {
      toast.error('Eroare la deschiderea plății.')
    }
  }

  const staticStats = initialStaticStats
  const dynamicStats = {
    totalIncasat: clientSummary?.totalIncasatPerioada || 0,
    totalFacturat: clientSummary?.totalFacturatPerioada || 0,
    totalNealocat: clientSummary?.totalNealocat || 0,
    totalPlati: budgetSummary?.totalPlatiPerioada || 0,
  }

  const formatShortDate = (dateToFormat: Date) =>
    format(dateToFormat, 'dd.MM.yy', { locale: ro })
  const dateRangeDisplay = (dateRange: DateRange | undefined): string => {
    if (!dateRange || !dateRange.from) return '(Perioadă nevalidă)'
    if (dateRange.to)
      return `(${formatShortDate(dateRange.from)} - ${formatShortDate(dateRange.to)})`
    return `(${formatShortDate(dateRange.from)})`
  }
  const formattedDateRange = dateRangeDisplay(date)

  return (
    <div className='space-y-2'>
      {/* Header */}
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

      {/* --- Grid Carduri Statistice --- */}
      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
        <StatCard
          title={`Facturat ${formattedDateRange}`}
          value={formatCurrency(dynamicStats.totalFacturat)}
          icon={<FileText className='text-blue-600' size={24} />}
          infoText='Valoarea totală a facturilor fiscale emise în intervalul selectat (fără proforme). Include scăderile din facturile storno.'
        />

        <StatCard
          title={`Încasat ${formattedDateRange}`}
          value={formatCurrency(dynamicStats.totalIncasat)}
          icon={<Banknote className='text-green-500' size={24} />}
          infoText='Totalul banilor intrați efectiv în firmă (cont/casă) în intervalul selectat, indiferent dacă sunt alocați pe facturi sau nu.'
        />

        {isAdmin && (
          <StatCard
            title={`Plăți ${formattedDateRange}`}
            value={formatCurrency(dynamicStats.totalPlati)}
            icon={<Library className='text-purple-500' size={24} />}
            infoText='Suma totală a plăților efectuate către furnizori în intervalul selectat.'
          />
        )}

        <StatCard
          title='Sold Clienți (Total)'
          value={formatCurrency(staticStats.totalDeIncasat)}
          icon={<TrendingUp className='text-emerald-600' size={24} />}
          infoText='Câți bani ai de recuperat în total de la clienți în acest moment (facturi emise și neîncasate).'
        />

        {isAdmin && (
          <StatCard
            title='Sold Furnizori (Total)'
            value={formatCurrency(staticStats.totalDePlatit)}
            icon={<TrendingDown className='text-orange-500' size={24} />}
            infoText='Câți bani ai de plătit în total către furnizori în acest moment (facturi primite și neachitate).'
          />
        )}
      </div>

      {/* --- Secțiuni Detaliate (Grid ajustat pentru 4 elemente) --- */}
      {/* Grid: Pe mobil 1 col, Tabletă 2 col, Desktop mare 4 col */}
      <div className='grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-2'>
        {/* 1. Încasări pe Client */}
        <Card className='flex flex-col'>
          <CardHeader>
            <CardTitle>Top Încasări - {formattedDateRange}</CardTitle>
          </CardHeader>
          <CardContent className='flex-1 p-2'>
            <ClientSummaryList
              data={clientSummary?.summaryList || []}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
        {/* 2. Cheltuieli pe Bugete (Doar Admin) */}
        {isAdmin && (
          <Card className='flex flex-col'>
            <CardHeader>
              <CardTitle>Cheltuieli - {formattedDateRange}</CardTitle>
            </CardHeader>
            <CardContent className='flex-1 p-2'>
              <BudgetSummaryAccordion
                data={budgetSummary?.summaryList || []}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        )}
        {/* 2. Plăți Nealocate */}
        <Card className='flex flex-col'>
          <CardHeader>
            <CardTitle className='text-red-600 flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5' />
              Plăți Nealocate
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 p-2'>
            <UnallocatedPaymentsList
              data={clientSummary?.unallocatedList || []}
              isLoading={isLoading}
              onAllocateClick={handleOpenAllocation}
            />
          </CardContent>
        </Card>

        {/* 4. Clienți Restanți */}
        <Card className='flex flex-col'>
          <CardHeader>
            <CardTitle className='text-red-600'>
              Clienți Restanți (All-Time)
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 p-2'>
            <OverdueClientsAccordion data={initialOverdueClients} />
          </CardContent>
        </Card>
      </div>

      <AllocationModal
        payment={selectedPaymentForAllocation}
        onClose={() => setSelectedPaymentForAllocation(null)}
        isAdmin={isAdmin}
      />
    </div>
  )
}
