'use client'
import React from 'react'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { useZxing } from 'react-zxing'

interface BarcodeScannerProps {
  onDecode: (value: string) => void
}

export function BarcodeScanner({ onDecode }: BarcodeScannerProps) {
  // 1) Tell ZXing to try harder & invert if needed
  const hints = new Map()
  hints.set(DecodeHintType.TRY_HARDER, true)
  // optional: only decode Code128 (or add EAN_13, etc)
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128])

  const { ref } = useZxing({
    // 2) pass our hints, and let the hook wire up its default reader
    hints,
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
