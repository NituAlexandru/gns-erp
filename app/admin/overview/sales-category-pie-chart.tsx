/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import LoadingPage from '@/app/loading'
import React, { useState, useEffect, useMemo } from 'react' // Importăm useMemo
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

interface ChartData {
  _id: string
  totalSales: number
}

// Culorile standard definite anterior
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

// --- Componenta Custom pentru Tooltip ---
const CustomTooltip = ({
  active,
  payload,
  sliceColors,
}: TooltipProps<ValueType, NameType> & { sliceColors: string[] }) => {
  if (
    active &&
    payload &&
    payload.length &&
    sliceColors &&
    sliceColors.length > 0
  ) {
    const dataPayload = payload[0].payload
    const index = dataPayload?.originalIndex

    let sliceColor = '#CCC'

    if (index !== undefined && index >= 0 && index < sliceColors.length) {
      sliceColor = sliceColors[index]
    }

    // Verificăm dacă avem datele necesare înainte de a randa
    if (!dataPayload?._id || dataPayload?.totalSales === undefined) {
      return null // Nu randa tooltip dacă datele esențiale lipsesc
    }

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
          {`${dataPayload._id}`}
        </p>
        <p style={{ color: '#FFFFFF', margin: 0, fontSize: '13px' }}>
          Sales: {`${dataPayload.totalSales}`}
        </p>
      </div>
    )
  }
  return null
}

const CustomLabelRenderer = ({ sliceColors, ...props }: any) => {
  const { cx, cy, midAngle, outerRadius, percent, payload, index } = props

  if (
    payload === undefined ||
    index === undefined ||
    percent === undefined ||
    percent === 0
  ) {
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

  // Contur pentru lizibilitate
  const labelStrokeColor = '#000000'
  const labelStrokeWidth = 0.9

  return (
    <text
      x={x}
      y={y}
      fill={sliceColor}
      textAnchor={textAnchor}
      dominantBaseline='central'
      className='text-sm font-bold'
      stroke={labelStrokeColor}
      strokeWidth={labelStrokeWidth}
      paintOrder='stroke'
    >
      {`${payload._id} (${(percent * 100).toFixed(0)}%)`}
    </text>
  )
}

export default function SalesCategoryPieChart({
  data,
}: {
  data: ChartData[] | null | undefined
}) {
  const [isClient, setIsClient] = useState(false)
  const [sliceColors, setSliceColors] = useState<string[]>([])

  useEffect(() => {
    setIsClient(true)
  }, [])

  const dataWithIndex = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    return data.map((item, index) => ({
      ...item,
      originalIndex: index,
    }))
  }, [data])

  useEffect(() => {
    if (dataWithIndex.length > 0) {
      const newSliceColors = dataWithIndex.map(
        (_, index) => STANDARD_COLORS[index % STANDARD_COLORS.length]
      )
      if (JSON.stringify(newSliceColors) !== JSON.stringify(sliceColors)) {
        setSliceColors(newSliceColors)
      }
    } else {
      if (sliceColors.length > 0) {
        setSliceColors([])
      }
    }
  }, [dataWithIndex, sliceColors])
  const isLoading = !isClient || sliceColors.length !== dataWithIndex.length

  if (isLoading) {
    return <LoadingPage />
  }

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

  return (
    <ResponsiveContainer width='100%' height='100%' minHeight={400}>
      <PieChart margin={{ top: 30, right: 40, bottom: 30, left: 40 }}>
        <Pie
          data={dataWithIndex}
          cx='50%'
          cy='50%'
          outerRadius='100%'
          innerRadius='50%'
          dataKey='totalSales'
          labelLine={{ stroke: '#666', strokeWidth: 1 }}
          label={<CustomLabelRenderer sliceColors={sliceColors} />}
          isAnimationActive={true}
        >
          {dataWithIndex.map((entry, index) => (
            <Cell
              key={`cell-${entry._id}-${index}`}
              fill={sliceColors[index]}
              stroke='none'
            />
          ))}
        </Pie>
        <Tooltip
          content={<CustomTooltip sliceColors={sliceColors} />}
          cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}
          isAnimationActive={true}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
