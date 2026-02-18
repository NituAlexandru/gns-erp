'use client'

import { useRef, useEffect, ReactNode } from 'react'

export default function TechnicalSpecsDropdown({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        detailsRef.current &&
        !detailsRef.current.contains(event.target as Node)
      ) {
        detailsRef.current.open = false
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <details ref={detailsRef} className='relative m-0'>
      <summary className='cursor-pointer font-bold py-1'>{title}</summary>
      {/* Containerul care plutește (stilurile tale originale) */}
      <div className='absolute z-10 mt-2 overflow-auto max-h-90 border rounded shadow-sm bg-background w-full'>
        {children}
      </div>
    </details>
  )
}
