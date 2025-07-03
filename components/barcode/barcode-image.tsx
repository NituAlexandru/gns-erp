// components/barcode/Barcode.tsx
'use client'
import React from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'

export type BarcodeType = 'code128' | 'ean13' | 'upca' | 'itf14' | 'gs1128'

interface BarcodeProps {
  text: string // the data to encode
  type?: BarcodeType // defaults to code128
  width?: number
  height?: number
  className?: string
}

export function Barcode({
  text,
  type = 'code128',
  width = 200,
  height = 80,
  className,
}: BarcodeProps) {
  const { theme } = useTheme()
  // build the API URL with all params
  const src = `/api/barcode?text=${encodeURIComponent(text)}&type=${type}&theme=${theme}`

  return (
    <Image
      src={src}
      alt={`Barcode ${type} for ${text}`}
      width={width}
      height={height}
      className={className}
      unoptimized // since we’re fetching from our own API
    />
  )
}
