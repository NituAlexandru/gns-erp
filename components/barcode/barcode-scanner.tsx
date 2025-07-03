'use client'

import React from 'react'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { useZxing } from 'react-zxing'

export function BarcodeScanner({
  onDecode,
}: {
  onDecode: (v: string) => void
}) {
  const hints = new Map()
  // tell ZXing to try harder (slower but catches inverted)
  hints.set(DecodeHintType.TRY_HARDER, true)
  // optional: restrict to Code128 only
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128])

  const { ref } = useZxing({
    onDecodeResult(result) {
      onDecode(result.getText())
    },
    constraints: { video: { facingMode: 'environment' } },
    onError(error) {
      console.error(error)
    },
    hints,
  })

  return (
    <video ref={ref} className='w-full h-auto' style={{ background: '#000' }} />
  )
}
