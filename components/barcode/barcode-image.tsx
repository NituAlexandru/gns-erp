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

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <style>
            /* Eliminăm marginile implicite ale paginii */
            @page { margin: 0 }
            html, body { margin: 0; padding: 0; }
            /* Spacer alb de 1cm pentru a ascunde header-ul */
            .spacer {
              height: 1cm;
              background: #fff;
            }
          </style>
        </head>
        <body>
          <!-- Div-ul care „închide” zona de header -->
          <div class="spacer"></div>
          <!-- Imaginea ta de cod de bare la dimensiunile tale -->
          <img
            src="${src}"
            width="${width}"
            height="${height}"
            style="border:none; display:block; margin:0 auto;"
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
