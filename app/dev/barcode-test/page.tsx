// app/dev/barcode-test/page.tsx
'use client'
import React from 'react'
import { DesktopBarcodeTester } from '@/components/barcode/DesktopBarcodeTester'

export default function BarcodeTestPage() {
  return (
    <div className='p-6'>
      <h1 className='text-2xl font-bold mb-4'>🚀 Desktop Barcode Tester</h1>
      <DesktopBarcodeTester />
    </div>
  )
}
