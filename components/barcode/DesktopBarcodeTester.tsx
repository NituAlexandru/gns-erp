// components/barcode/DesktopBarcodeTester.tsx
'use client'
import React, { useState, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'

export function DesktopBarcodeTester() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult('')
    setFile(e.target.files?.[0] ?? null)
  }

  const runDecode = async () => {
    if (!imgRef.current) return
    try {
      const reader = new BrowserMultiFormatReader()
      const res = await reader.decodeFromImageElement(imgRef.current)
      setResult(res.getText())
      //eslint-disable-next-line
    } catch (err: any) {
      setResult(`❌ Decode failed: ${err.message}`)
    }
  }

  return (
    <div className='p-4 space-y-4'>
      <h2 className='text-lg font-bold'>Desktop Barcode Tester</h2>
      <input type='file' accept='image/*' onChange={handleFile} />
      {file && (
        <>
          <img
            ref={imgRef}
            src={URL.createObjectURL(file)}
            alt='barcode to decode'
            className='max-w-xs border'
          />

          <div className='space-x-2'>
            <button
              onClick={runDecode}
              className='px-3 py-1 bg-blue-600 text-white rounded'
            >
              Decode!
            </button>
            <button
              onClick={() => setFile(null)}
              className='px-3 py-1 bg-gray-300 rounded'
            >
              Clear
            </button>
          </div>
          {result && (
            <p>
              <strong>Result:</strong> {result}
            </p>
          )}
        </>
      )}
    </div>
  )
}
