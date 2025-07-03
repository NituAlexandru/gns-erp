'use client'
import React, { useEffect } from 'react'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { useZxing } from 'react-zxing'

interface FullScreenScannerProps {
  onDecode: (value: string) => void
  onClose: () => void
}

export function FullScreenScanner({ onDecode }: FullScreenScannerProps) {
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
    <div className='fixed inset-0 z-[9999]'>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className='absolute inset-0 w-full h-full object-cover'
      />

      {/* VIEWFINDER OVERLAY */}
      <div className='absolute inset-0 pointer-events-none'>
        {/* Top mask */}
        <div className='absolute inset-x-0 top-0 h-1/4 bg-black bg-opacity-50' />
        {/* Bottom mask */}
        <div className='absolute inset-x-0 bottom-0 h-1/4 bg-black bg-opacity-50' />
        {/* Left mask */}
        <div className='absolute left-0 top-1/4 bottom-1/4 w-1/6 bg-black bg-opacity-50' />
        {/* Right mask */}
        <div className='absolute right-0 top-1/4 bottom-1/4 w-1/6 bg-black bg-opacity-50' />

        {/* Center frame */}
        <div
          className='
            absolute left-1/6 right-1/6
            top-1/4 bottom-1/4
            border-2 border-white
            rounded-sm
          '
        />
      </div>
    </div>
  )
}
