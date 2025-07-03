// components/barcode/barcode-scanner.tsx
'use client'
import React, { useRef, useEffect } from 'react'
import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
} from '@zxing/library'

interface BarcodeScannerProps {
  /** Called with the decoded string when a scan succeeds */
  onDecode: (value: string) => void
}

export function BarcodeScanner({ onDecode }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 1) Start & stop camera on mount/unmount
  useEffect(() => {
    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch((err) => console.error('Camera error:', err))

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // 2) On tap, grab a frame & decode it
  const handleCapture = async () => {
    const video = videoRef.current
    if (!video) return

    // Create an offscreen canvas at the video resolution
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw the current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Create an Image for ZXing to read
    const img = new Image()
    img.src = canvas.toDataURL('image/png')
    img.onload = async () => {
      try {
        // Hint ZXing to try hard and only look for Code 128
        const hints = new Map<DecodeHintType, unknown>()
        hints.set(DecodeHintType.TRY_HARDER, true)
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128])

        const reader = new BrowserMultiFormatReader()
        // decodeFromImageElement(img, hints) will scan that image
        const result = await reader.decodeFromImageElement(img)
        onDecode(result.getText())
      } catch (error) {
        console.error('❌ Decode failed:', error)
        // you could show a toast here: “Nu am citit, încearcă din nou”
      }
    }
  }

  return (
    <div className='relative w-full h-64 overflow-hidden rounded'>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onClick={handleCapture}
        className='w-full h-full object-cover bg-black'
      />
      <div className='absolute bottom-2 left-1/2 transform -translate-x-1/2'>
        <button className='px-4 py-2 bg-white bg-opacity-75 rounded'>
          📸 Apasă pentru scanare
        </button>
      </div>
    </div>
  )
}
