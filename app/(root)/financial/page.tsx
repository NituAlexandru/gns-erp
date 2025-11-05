import {
  FileCheck,
  FileText,
  Receipt,
  FileMinus,
  ClipboardList,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from './components/StatCard'
import FinancialHeader from './components/FinancialHeader'

export default function FinancialDashboardPage() {
  return (
    <div className='space-y-2'>
      {/* Header */}
      <FinancialHeader />

      {/* Grid de carduri statistice */}
      <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
        <StatCard
          title='Avize'
          value='12'
          icon={<FileCheck className='text-blue-500' size={24} />}
        />
        <StatCard
          title='Facturi'
          value='8'
          icon={<FileText className='text-green-500' size={24} />}
        />
        <StatCard
          title='Proforme'
          value='3'
          icon={<ClipboardList className='text-yellow-500' size={24} />}
        />
        <StatCard
          title='Storno'
          value='1'
          icon={<FileMinus className='text-orange-500' size={24} />}
        />
        <StatCard
          title='Plăți'
          value='25.340 RON'
          icon={<Receipt className='text-purple-500' size={24} />}
        />
      </div>

      {/* Secțiuni detaliate */}
      <div className='grid md:grid-cols-2 gap-6'>
        <Card>
          <CardHeader>
            <CardTitle>Ultimele Avize</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='text-sm space-y-2'>
              <li className='flex justify-between border-b pb-1'>
                <span>AVZ0012/2025 - Client Test</span>
                <span className='text-muted-foreground'>DELIVERED</span>
              </li>
              <li className='flex justify-between border-b pb-1'>
                <span>AVZ0013/2025 - Construct SRL</span>
                <span className='text-muted-foreground'>IN_TRANSIT</span>
              </li>
              <li className='flex justify-between border-b pb-1'>
                <span>AVZ0014/2025 - Depozit Logistic</span>
                <span className='text-muted-foreground'>CREATED</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ultimele Facturi</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='text-sm space-y-2'>
              <li className='flex justify-between border-b pb-1'>
                <span>FAC0005/2025 - Alpha SA</span>
                <span className='text-green-600 font-medium'>ACHITATĂ</span>
              </li>
              <li className='flex justify-between border-b pb-1'>
                <span>FAC0006/2025 - Beta Construct</span>
                <span className='text-yellow-600 font-medium'>EMISĂ</span>
              </li>
              <li className='flex justify-between border-b pb-1'>
                <span>FAC0007/2025 - Client XYZ</span>
                <span className='text-red-600 font-medium'>ÎNTÂRZIATĂ</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
