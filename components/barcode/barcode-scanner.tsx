'use client'

import React, { useEffect, useRef } from 'react'
import { Html5Qrcode, QrcodeErrorCallback } from 'html5-qrcode'

interface BarcodeScannerProps {
  onDecode: (value: string) => void
  onError?: (err: unknown) => void
  onClose?: () => void
}

export function BarcodeScanner({
  onDecode,
  onError,
  onClose,
}: BarcodeScannerProps) {
  const qrRegionId = 'html5qr-full-region'
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    const scanner = new Html5Qrcode(qrRegionId, /* verbose= */ false)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 600, height: 300 } },
        (decodedText) => {
          onDecode(decodedText)
          scanner
            .stop()
            .catch(() => {})
            .then(() => {
              try {
                scanner.clear()
              } catch {}
              onClose?.()
            })
        },
        (() => {
          const cb: QrcodeErrorCallback = () => {}
          return cb
        })()
      )
      .then(async () => {
        try {
          await scanner.applyVideoConstraints({
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          })
          console.log('Upgraded camera to 1920×1080')
        } catch (e) {
          console.warn('Could not apply 1080p, falling back', e)
        }

        try {
          const settings = scanner.getRunningTrackSettings()
          console.log(
            `Actual video resolution: ${settings.width}×${settings.height}`
          )

          const caps = scanner.getRunningTrackCapabilities()
          console.log('Camera capabilities:', caps)
        } catch (e) {
          console.warn('Could not read track settings/capabilities', e)
        }
      })
      .catch((err) => {
        console.error('html5-qrcode start failed', err)
        onError?.(err)
      })

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch {}
      }
    }
  }, [onDecode, onError, onClose])

  const handleCancel = () => {
    const scanner = scannerRef.current
    if (scanner) {
      try {
        scanner.clear()
      } catch {}
      onClose?.()
    } else {
      onClose?.()
    }
  }

  return (
    <div className='fixed inset-0 z-50 bg-black/75 flex flex-col items-center justify-center'>
      <div id={qrRegionId} className='w-full max-w-2xl h-96 bg-black' />
      <button
        onClick={handleCancel}
        className='mt-4 px-4 py-2 bg-white rounded'
      >
        Anulează
      </button>
    </div>
  )
}
