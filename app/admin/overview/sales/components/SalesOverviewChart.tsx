'use client'

import { useState } from 'react'
import {
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const SERIES_COLORS: Record<string, string> = {
  G26: '#0fd41f',
  PAL: '#05730c',
  STORNO: '#e02209',
  TRANS: '#2870bd',
  DIS: '#d65409',
  SCHE: '#08bfd4',
  AVA: '#d9e80c',
}
const FALLBACK_COLORS = ['#64748b', '#a1a1aa', '#78716c', '#94a3b8']

interface SalesOverviewChartProps {
  data: any[]
  uniqueSeries: string[]
  viewMode: 'net' | 'vat' | 'gross'
  isLoading: boolean
}

const formatXAxisDate = (val: string) => {
  if (val.includes('-Q')) {
    const [year, q] = val.split('-Q')
    return `Trim. ${q} ${year}`
  }
  if (val.includes('-')) {
    const [year, month] = val.split('-')
    const months = [
      'Ian',
      'Feb',
      'Mar',
      'Apr',
      'Mai',
      'Iun',
      'Iul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return `${months[parseInt(month) - 1]} ${year}`
  }
  return val
}

const CustomTooltip = ({
  active,
  label,
  viewMode,
  originalData,
  uniqueSeries,
  hiddenSeries,
}: any) => {
  if (active && originalData) {
    const originalEntry = originalData.find((d: any) => d.date === label)
    if (!originalEntry) return null

    let dayTotal = 0
    const itemsToRender: any[] = []

    uniqueSeries.forEach((series: string) => {
      if (hiddenSeries.includes(series)) return
      const val = originalEntry[`${series}_${viewMode}`] || 0
      dayTotal += val

      if (val !== 0) {
        const color =
          SERIES_COLORS[series] ||
          FALLBACK_COLORS[uniqueSeries.indexOf(series) % FALLBACK_COLORS.length]
        itemsToRender.push({ name: series, value: val, color: color })
      }
    })

    const modeLabel =
      viewMode === 'net'
        ? 'Net (Fără TVA)'
        : viewMode === 'vat'
          ? 'TVA'
          : 'Vânzări Brut'

    const totalYoyValue = originalEntry[`yoy_${viewMode}`]
    const hasTotalYoy = totalYoyValue !== null && totalYoyValue !== undefined
    const totalYoyFormatted = hasTotalYoy
      ? totalYoyValue > 0
        ? `+${totalYoyValue.toFixed(1)}%`
        : `${totalYoyValue.toFixed(1)}%`
      : ''
    const totalYoyColor = hasTotalYoy
      ? totalYoyValue > 0
        ? '#10b981'
        : totalYoyValue < 0
          ? '#ef4444'
          : '#94a3b8'
      : ''

    return (
      <div className='z-50 rounded bg-black/90 border border-white/20 p-4 text-sm text-white shadow-xl min-w-[260px]'>
        <p className='mb-3 font-bold border-b border-white/20 pb-2 text-center text-base'>
          {formatXAxisDate(label)}
        </p>
        <div className='flex flex-col gap-3'>
          {itemsToRender.map((entry: any, index: number) => {
            const seriesYoy = originalEntry[`${entry.name}_yoy_${viewMode}`]
            const hasSeriesYoy = seriesYoy !== null && seriesYoy !== undefined
            const seriesYoyFormatted = hasSeriesYoy
              ? seriesYoy > 0
                ? `+${seriesYoy.toFixed(1)}%`
                : `${seriesYoy.toFixed(1)}%`
              : ''
            const seriesYoyColor = hasSeriesYoy
              ? seriesYoy > 0
                ? '#10b981'
                : seriesYoy < 0
                  ? '#ef4444'
                  : '#94a3b8'
              : ''

            return (
              <div key={`item-${index}`} className='flex flex-col'>
                <div className='flex items-center justify-between gap-6'>
                  <span style={{ color: entry.color, fontWeight: 'bold' }}>
                    {entry.name}:
                  </span>
                  <span className='font-mono text-[13px]'>
                    {formatCurrency(entry.value)}
                  </span>
                </div>
                {hasSeriesYoy && (
                  <div className='flex items-center justify-end mt-0.5 text-[10px] text-muted-foreground'>
                    <span>
                      YoY:{' '}
                      <span
                        style={{ color: seriesYoyColor }}
                        className='font-mono'
                      >
                        {seriesYoyFormatted}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          <div className='mt-2 pt-2 border-t border-white/20 flex flex-col gap-1'>
            <div className='flex items-center gap-2 justify-between font-bold text-gray-200'>
              <span>Total {modeLabel}: </span>
              <span className='font-mono'>{formatCurrency(dayTotal)}</span>
            </div>
            {hasTotalYoy && (
              <div className='flex items-center justify-between font-bold text-[12px]'>
                <span className='text-muted-foreground'>Trend YoY: </span>
                <span className='font-mono' style={{ color: totalYoyColor }}>
                  {totalYoyFormatted}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function SalesOverviewChart({
  data,
  uniqueSeries,
  viewMode,
  isLoading,
}: SalesOverviewChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([])

  if (isLoading) return <Skeleton className='h-full w-full opacity-20' />

  if (!data || data.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground border border-dashed rounded-lg'>
        Nu există facturi emise în perioada selectată.
      </div>
    )
  }

  const chartData = data.map((item) => {
    const newItem = { ...item, date: item.date }
    let totalNegative = 0

    uniqueSeries.forEach((series) => {
      const key = `${series}_${viewMode}`
      const val = item[key] || 0
      if (val < 0 && !hiddenSeries.includes(series)) {
        totalNegative += Math.abs(val)
        newItem[key] = 0
      } else if (val > 0) {
        newItem[key] = val
      } else {
        newItem[key] = 0
      }
    })

    const posSeriesKeys = uniqueSeries
      .map((s) => `${s}_${viewMode}`)
      .filter((k) => newItem[k] > 0 && !hiddenSeries.includes(k.split('_')[0]))
      .sort((a, b) => newItem[b] - newItem[a])

    posSeriesKeys.forEach((key) => {
      if (totalNegative > 0) {
        if (newItem[key] >= totalNegative) {
          newItem[key] -= totalNegative
          totalNegative = 0
        } else {
          totalNegative -= newItem[key]
          newItem[key] = 0
        }
      }
    })

    return newItem
  })

  const toggleSeries = (seriesName: string) => {
    setHiddenSeries((prev) =>
      prev.includes(seriesName)
        ? prev.filter((s) => s !== seriesName)
        : [...prev, seriesName],
    )
  }

  const renderCustomLegend = (props: any) => {
    const { payload } = props
    return (
      <ul className='flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs mt-4 pb-2'>
        {payload.map((entry: any, index: number) => {
          if (entry.dataKey === `yoy_${viewMode}`) return null

          const seriesName = entry.value
          const isHidden = hiddenSeries.includes(seriesName)
          return (
            <li
              key={`leg-${index}`}
              className={`flex items-center gap-1.5 cursor-pointer select-none transition-opacity hover:opacity-80 ${
                isHidden
                  ? 'line-through text-slate-400'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
              onClick={() => toggleSeries(seriesName)}
            >
              <div
                className='w-3 h-3 rounded-sm transition-opacity'
                style={{
                  backgroundColor: entry.color,
                  opacity: isHidden ? 0.3 : 1,
                }}
              />
              <span className='font-semibold'>{seriesName}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  const customTicks: number[] = []
  const step = 500000
  let maxStack = 0

  chartData.forEach((d) => {
    let dayPos = 0
    uniqueSeries.forEach((series) => {
      if (!hiddenSeries.includes(series)) {
        const val = d[`${series}_${viewMode}`] || 0
        if (val > 0) dayPos += val
      }
    })
    if (dayPos > maxStack) maxStack = dayPos
  })

  const startTick = 0
  const endTick = Math.ceil(maxStack / step) * step

  for (let i = startTick; i <= endTick; i += step) {
    customTicks.push(i)
  }

  const hasAnyYoyData = chartData.some(
    (d) => d[`yoy_${viewMode}`] !== null && d[`yoy_${viewMode}`] !== undefined,
  )

  return (
    <ResponsiveContainer width='100%' height={350}>
      <ComposedChart
        data={chartData}
        margin={{
          top: 10,
          right: hasAnyYoyData ? 40 : 10,
          left: 10,
          bottom: 0,
        }}
        barSize={40}
      >
        {/* Aici am făcut linia continuă și am setat opacitatea pe "currentColor" ca să se adapteze la temă */}
        <CartesianGrid
          vertical={false}
          stroke='currentColor'
          strokeOpacity={0.1}
        />

        <XAxis
          dataKey='date'
          stroke='#94a3b8'
          fontSize={12}
          tickFormatter={formatXAxisDate}
          tickMargin={10}
        />

        <YAxis
          yAxisId='left'
          stroke='#94a3b8'
          fontSize={12}
          width={90}
          ticks={customTicks}
          domain={[startTick, endTick]}
          tickFormatter={(val) => new Intl.NumberFormat('ro-RO').format(val)}
        />

        {hasAnyYoyData && (
          <YAxis
            yAxisId='right'
            orientation='right'
            stroke='#eab308'
            fontSize={11}
            tickFormatter={(val) => `${val}%`}
            domain={[
              (dataMin: number) => Math.min(-10, Math.floor(dataMin - 10)),
              (dataMax: number) => Math.max(10, Math.ceil(dataMax + 20)),
            ]}
          />
        )}

        <Tooltip
          content={
            <CustomTooltip
              viewMode={viewMode}
              originalData={data}
              uniqueSeries={uniqueSeries}
              hiddenSeries={hiddenSeries}
            />
          }
          cursor={{ fill: 'rgba(255,255,255, 0.05)' }}
        />

        <Legend content={renderCustomLegend} verticalAlign='top' />

        {uniqueSeries.map((series, index) => {
          const color =
            SERIES_COLORS[series] ||
            FALLBACK_COLORS[index % FALLBACK_COLORS.length]
          return (
            <Bar
              key={series}
              dataKey={`${series}_${viewMode}`}
              name={series}
              yAxisId='left'
              stackId='a'
              fill={color}
              hide={hiddenSeries.includes(series)}
            />
          )
        })}

        {hasAnyYoyData && (
          <Line
            yAxisId='right'
            type='monotone'
            dataKey={`yoy_${viewMode}`}
            name='Trend YoY %'
            stroke='#eab308'
            strokeWidth={3}
            connectNulls={false}
            dot={{ r: 4, fill: '#eab308', strokeWidth: 2, stroke: '#000' }}
            activeDot={{ r: 6 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
