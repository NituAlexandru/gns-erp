'use client'

import {
  FileCheck,
  FileText,
  FileMinus,
  ClipboardList,
  ShoppingCart,
  Receipt,
  Ban,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from './components/StatCard'
import FinancialHeader from './components/FinancialHeader'
import { getFinancialDashboardData } from '@/lib/db/modules/financial/dashboard/dashboard.actions'
import { useEffect, useState } from 'react'
import { FinancialDashboardData } from '@/lib/db/modules/financial/dashboard/dashboard.types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { YearlyOverdueClients } from './components/YearlyOverdueClients'
import { BlockedClientsList } from './components/BlockedClientsList'

export default function FinancialDashboardPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<string>(currentYear.toString())
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FinancialDashboardData | null>(null)

  const years = Array.from({ length: 5 }, (_, i) =>
    (currentYear - i).toString()
  )

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const result = await getFinancialDashboardData(parseInt(year))
        setData(result)
      } catch (error) {
        console.error('Eroare la preluarea datelor:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [year])

  // Guard Clause: Dacă se încarcă sau nu avem date, afișăm un loader simplu și oprim execuția aici.
  // Asta rezolvă eroarea "data is possibly null" din JSX-ul de mai jos.
  if (loading || !data) {
    return (
      <div className='flex justify-center items-center h-40'>
        Se încarcă datele...
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      <div className=' flex flex-row items-center justify-between'>
        <FinancialHeader />
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger>
            <SelectValue placeholder='An' />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid de carduri statistice */}
      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
        <StatCard
          title='Comenzi'
          value={data.stats.ordersCount.toString()}
          icon={<ShoppingCart className='text-purple-500' size={24} />}
        />

        {/* 2. AVIZE */}
        <StatCard
          title='Avize'
          value={data.stats.deliveryNotesCount.toString()}
          icon={<FileCheck className='text-blue-500' size={24} />}
        />
        {/* 3. CHITANȚE (Între Avize și Facturi) */}
        <StatCard
          title='Chitanțe'
          value={data.stats.receiptsCount.toString()} 
          icon={<Receipt className='text-cyan-500' size={24} />}
        />

        {/* 4. FACTURI */}
        <StatCard
          title='Facturi'
          value={data.stats.invoicesCount.toString()}
          icon={<FileText className='text-green-500' size={24} />}
        />

        {/* 5. PROFORME */}
        <StatCard
          title='Proforme'
          value={data.stats.proformasCount.toString()}
          icon={<ClipboardList className='text-yellow-500' size={24} />}
        />

        {/* 6. STORNO */}
        <StatCard
          title='Storno'
          value={data.stats.creditNotesCount.toString()}
          icon={<FileMinus className='text-orange-500' size={24} />}
        />
      </div>

      {/* Secțiuni detaliate */}
      <div className='grid lg:grid-cols-2 gap-2'>
        {/* Card 1: Clienți Restanți */}
        <Card className='flex flex-col h-[550px] gap-0 py-0 overflow-hidden'>
          <CardHeader className='px-4 py-3 !pb-0 border-b bg-muted/20 shrink-0'>
            <CardTitle className='text-xl font-semibold text-primary flex items-center gap-2'>
              <FileMinus className='h-4 w-4' />
              Facturi restante ({year})
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 p-1 overflow-hidden bg-muted/10'>
            <YearlyOverdueClients data={data.overdueClients} year={year} />
          </CardContent>
        </Card>
        {/* Card 2: Ultimele Facturi */}
        <Card className='flex flex-col h-[550px] gap-0 py-0 overflow-hidden'>
          <CardHeader className='px-4 py-3 !pb-0 border-b bg-muted/20 shrink-0'>
            <CardTitle className='text-xl font-semibold text-primary flex items-center gap-2'>
              <Ban className='h-4 w-4' />
              Clienți Blocați la Livrare
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 p-1 overflow-hidden bg-muted/10'>
            <BlockedClientsList data={data.blockedClients} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
