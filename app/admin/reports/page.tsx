import { Metadata } from 'next'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportsGrid } from './components/reports-grid'
import {
  AVAILABLE_REPORTS,
  REPORT_CATEGORIES,
} from '@/lib/db/modules/reports/reports.types'

export const metadata: Metadata = {
  title: 'Centru Rapoarte',
}

export default function ReportsPage() {
  return (
    <div className='flex-1 space-y-4 p-8 pt-6'>
      <div className='flex items-center justify-between space-y-2'>
        <h2 className='text-3xl font-bold tracking-tight'>
          Rapoarte & Analize
        </h2>
      </div>
      <Separator />

      <Tabs defaultValue='all' className='space-y-4'>
        <TabsList className='gap-1'>
          <TabsTrigger value='all'>Toate</TabsTrigger>
          {REPORT_CATEGORIES.map((cat) => (
            <TabsTrigger className='cursor-pointer' key={cat.id} value={cat.id}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value='all' className='space-y-4'>
          <ReportsGrid reports={AVAILABLE_REPORTS} />
        </TabsContent>

        {REPORT_CATEGORIES.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className='space-y-4 '>
            <ReportsGrid
              reports={AVAILABLE_REPORTS.filter((r) => r.category === cat.id)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
