'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Cell,
  Tooltip,
  TooltipProps,
} from 'recharts'
import {
  NameType,
  ValueType,
} from 'recharts/types/component/DefaultTooltipContent'
import LoadingPage from '@/app/loading'

// Structura de date pe care o aşteptăm:
// _id = numele categoriei, totalSales = suma totală (în lei) vândută
interface CategorySum {
  _id: string
  totalSales: number
}

// Tipul efectiv pentru datele primite în prop-ul `data`
type ChartData = CategorySum[]

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  sliceColors: string[]
}

const STANDARD_COLORS = [
  '#E53935',
  '#1E88E5',
  '#43A047',
  '#FFB300',
  '#8E24AA',
  '#FB8C00',
  '#00ACC1',
  '#F06292',
  '#C0CA33',
  '#5E35B1',
]

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  sliceColors,
}) => {
  if (active && payload && payload.length > 0) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const dataPayload = payload[0].payload as any
    const index = dataPayload?.originalIndex as number | undefined

    if (!dataPayload?._id || dataPayload.totalSales === undefined) {
      return null
    }

    const sliceColor =
      index !== undefined && index >= 0 && index < sliceColors.length
        ? sliceColors[index]
        : '#CCC'

    return (
      <div
        style={{
          backgroundColor: 'rgba(40, 40, 40, 0.95)',
          border: `1px solid ${sliceColor}`,
          borderRadius: '4px',
          padding: '10px 15px',
          boxShadow: '3px 3px 8px rgba(0,0,0,0.4)',
          textAlign: 'left',
        }}
      >
        <p
          style={{
            color: sliceColor,
            margin: 0,
            fontWeight: 'bold',
            fontSize: '14px',
            marginBottom: '5px',
          }}
        >
          {dataPayload._id}
        </p>
        <p style={{ color: '#FFFFFF', margin: 0, fontSize: '13px' }}>
          Suma vândută: {dataPayload.totalSales.toLocaleString('ro-RO')} lei
        </p>
      </div>
    )
  }
  return null
}

/**
 * Label renderer personalizat pentru fiecare slice
 */
const CustomLabelRenderer: React.FC<any> = ({ sliceColors, ...props }) => {
  const { cx, cy, midAngle, outerRadius, percent, payload, index } = props
  if (!payload || percent === undefined || percent === 0) {
    return null
  }
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 10
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const textAnchor = x > cx ? 'start' : 'end'
  const sliceColor =
    sliceColors && index >= 0 && index < sliceColors.length
      ? sliceColors[index]
      : '#CCC'

  return (
    <text
      x={x}
      y={y}
      fill={sliceColor}
      textAnchor={textAnchor}
      dominantBaseline='central'
      className='text-xs font-bold'
      stroke='#000000'
      strokeWidth={0.8}
      paintOrder='stroke'
    >
      {`${payload._id} (${(percent * 100).toFixed(0)}%)`}
    </text>
  )
}

export default function SalesCategoryBySumPieChart({
  data,
}: {
  data: ChartData | null | undefined
}) {
  const [isClient, setIsClient] = useState(false)
  const [sliceColors, setSliceColors] = useState<string[]>([])

  // După ce ne montăm pe client, setăm isClient = true pentru a nu rupe SSR-ul
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Adăugăm originalIndex la fiecare element (ne ajută pentru tooltip şi pentru culoare)
  const dataWithIndex = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map((item, idx) => ({
      ...item,
      originalIndex: idx,
    }))
  }, [data])

  // Generăm lista de culori după lungimea datelor
  useEffect(() => {
    if (dataWithIndex.length > 0) {
      const newColors = dataWithIndex.map(
        (_, idx) => STANDARD_COLORS[idx % STANDARD_COLORS.length]
      )
      setSliceColors(newColors)
    } else {
      setSliceColors([])
    }
  }, [dataWithIndex])

  // Dacă încă nu suntem pe client, afișăm loading
  if (!isClient) {
    return <LoadingPage />
  }

  // Dacă suntem pe client, dar nu există date, afișăm mesajul „No data to display.”
  if (dataWithIndex.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
        }}
      >
        Nu există date de afișat.
      </div>
    )
  }

  // Dacă suntem pe client și avem date, renderizăm graficul
  return (
    <ResponsiveContainer width='100%' height='100%' minHeight={400}>
      <PieChart margin={{ top: 30, right: 40, bottom: 30, left: 40 }}>
        <Pie
          data={dataWithIndex}
          dataKey='totalSales'
          nameKey='_id'
          cx='50%'
          cy='50%'
          outerRadius='100%'
          innerRadius='50%'
          labelLine={{ stroke: '#666', strokeWidth: 1 }}
          label={<CustomLabelRenderer sliceColors={sliceColors} />}
          isAnimationActive={true}
          stroke='none'
        >
          {dataWithIndex.map((entry, idx) => (
            <Cell key={`cell-${entry._id}-${idx}`} fill={sliceColors[idx]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip sliceColors={sliceColors} />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
