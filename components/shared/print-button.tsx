'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      type='button'
      onClick={() => window.print()}
      aria-label='Imprimă pagina'
      className='print-btn mb-4 inline-flex items-center justify-center p-2 rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400'
    >
      <Printer className='h-5 w-5' />
    </button>
  )
}
