'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { AgentSalesStats } from '@/lib/db/modules/overview/agent-sales.types'

interface AgentSalesChartProps {
  data: AgentSalesStats[]
  isLoading: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const profit = payload[0].value
    const cost = payload[1].value
    const totalRevenue = profit + cost
    const margin =
      totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : '0'

    return (
      <div className='z-50 rounded bg-black border border-white/20 p-2 text-sm text-white shadow-xl'>
        <p className='mb-1 font-bold border-b border-white/10 pb-1'>{label}</p>
        <div className='flex flex-col gap-1'>
          <div>Total: {formatCurrency(totalRevenue)}</div>
          <div className='text-green-500'>
            Profit: {formatCurrency(profit)} ({margin}%)
          </div>
          <div className='text-red-500'>Cost: {formatCurrency(cost)}</div>
        </div>
      </div>
    )
  }
  return null
}

export function AgentSalesChart({ data, isLoading }: AgentSalesChartProps) {
  if (isLoading) {
    return <Skeleton className='h-full w-full opacity-20' />
  }

  if (!data || data.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground border border-dashed rounded-lg'>
        Nu există date pentru perioada selectată.
      </div>
    )
  }

  return (
    <ResponsiveContainer width='100%' height={250}>
      <BarChart
        data={data}
        layout='vertical'
        margin={{ top: 0, right: 20, left: -35, bottom: 0 }}
        barSize={24}
        barCategoryGap={0}
      >
        <CartesianGrid strokeDasharray='3 3' horizontal={false} stroke='#333' />

        {/* Axa X setată explicit pe numere, ne-inversată */}
        <XAxis
          type='number'
          hide={false}
          stroke='#667'
          fontSize={12}
          padding={{ left: 0, right: 0 }}
        />

        <YAxis
          dataKey='agentName'
          type='category'
          width={150}
          tick={{ fontSize: 13, fill: '#e2e8f0' }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(255,255,255, 0.05)' }}
        />

        <Legend verticalAlign='bottom' height={36} />

        <Bar
          dataKey='totalProfit'
          name='Profit'
          stackId='a'
          fill='#16a34a'
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey='totalCost'
          name='Cost Marfă'
          stackId='a'
          fill='#dc2626'
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
