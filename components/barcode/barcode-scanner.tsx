'use client'
import React from 'react'
import { useZxing } from 'react-zxing'

interface BarcodeScannerProps {
  onDecode: (value: string) => void
}

export function BarcodeScanner({ onDecode }: BarcodeScannerProps) {
  const { ref } = useZxing({
    // 3) constrain camera to back-facing
    constraints: { video: { facingMode: 'environment' } },
    // 4) callback when a result is found
    onDecodeResult(result) {
      onDecode(result.getText())
    },
    onError(error: unknown) {
      console.error('📡 ZXing scan error', error)
    },
  })

  return (
    <video
      ref={ref}
      // these attributes are critical on iOS/Safari to keep the feed inline
      autoPlay
      muted
      playsInline
      // styling so you actually see it
      className='w-full h-64 bg-black object-cover rounded'
    />
  )
}
