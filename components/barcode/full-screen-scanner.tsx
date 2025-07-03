'use client'
import React, { useEffect } from 'react'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { useZxing } from 'react-zxing'

interface FullScreenScannerProps {
  onDecode: (value: string) => void
  onClose: () => void
}

export function FullScreenScanner({
  onDecode,
  onClose,
}: FullScreenScannerProps) {
  // 1) ZXing “try harder” + Code128 only
  const hints = new Map()
  hints.set(DecodeHintType.TRY_HARDER, true)
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128])

  const { ref: videoRef } = useZxing({
    hints,
    constraints: {
      video: {
        // ideal rear-facing camera; fallback to front if none
        facingMode: { ideal: 'environment' },
      },
    },
    onDecodeResult(result) {
      onDecode(result.getText())
    },
    onError(error) {
      console.error('ZXing scan error', error)
    },
  })

  useEffect(() => {
    // 2) request fullscreen on mount
    const vid = videoRef.current
    if (vid && vid.requestFullscreen) {
      vid.requestFullscreen().catch(() => {
        /* fallback: maybe not supported */
      })
    }
    // 3) when unmounting, exit fullscreen
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [videoRef])

  return (
    <div
      className='fixed inset-0 bg-black z-[9999] flex items-center justify-center'
      onClick={onClose}
    >
      {/* click anywhere to close */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className='w-full h-full object-cover'
      />
    </div>
  )
}
