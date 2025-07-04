'use client'

import React, { useState, useRef, ChangeEvent, useEffect } from 'react'

interface SearchBarProps {
  placeholder?: string
  debounceMs?: number
  /** se cheamă după fiecare debounce cu textul actual */
  onSearch: (query: string) => void
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Caută…',
  debounceMs = 300,
  onSearch,
}) => {
  const [query, setQuery] = useState('')
  const debounceRef = useRef<number | null>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)

    // reset timer
    if (debounceRef.current != null) {
      clearTimeout(debounceRef.current)
    }

    // setează un nou debounce
    debounceRef.current = window.setTimeout(() => {
      onSearch(v)
    }, debounceMs)
  }

  // când componenta se demontează, curățăm orice timer rămas
  useEffect(() => {
    return () => {
      if (debounceRef.current != null) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <input
      type='text'
      className='w-full border rounded px-3 py-2 focus:outline-none focus:ring'
      placeholder={placeholder}
      value={query}
      onChange={handleChange}
    />
  )
}
