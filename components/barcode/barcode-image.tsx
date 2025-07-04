'use client'
import React, { MouseEvent } from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'

export type BarcodeType = 'code128' | 'ean13' | 'upca' | 'itf14' | 'gs1128'

interface BarcodeProps {
  text: string
  type?: BarcodeType
  width?: number
  height?: number
}

export function Barcode({
  text,
  type = 'code128',
  width = 200,
  height = 80,
}: BarcodeProps) {
  const { theme } = useTheme()
  const src = `/api/barcode?text=${encodeURIComponent(text)}&type=${type}&theme=${theme}`

  const handlePrint = (e: MouseEvent) => {
    e.stopPropagation()
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Scriem un HTML MINIMAL, cu <img> care își declanșează singur print() când e gata
    printWindow.document.write(`
      <!doctype html>
      <html>
      <body style="margin:0; padding:0;">
        <img
          src="${src}"
          width="${width}"
          height="${height}"
          style="border:none; display:block;"
          onload="window.focus(); window.print(); window.close();"
        />
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div
      onClick={handlePrint}
      style={{ display: 'inline-block', cursor: 'pointer' }}
    >
      <Image src={src} alt='' width={width} height={height} unoptimized />
    </div>
  )
}
