'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Calendar as CalendarIcon, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

export function ReceivablesFilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isInvoices = pathname.includes('/facturi')
  const isReceipts = pathname.includes('/incasari')
  const [text, setText] = useState('')
  const [status, setStatus] = useState('ALL')
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)

  // --- SINCRONIZARE URL -> STATE (Doar la încărcare sau Back/Forward) ---
  useEffect(() => {
    setText(searchParams.get('q') || '')
    setStatus(searchParams.get('status') || 'ALL')

    const fromParam = searchParams.get('from')
    setFromDate(fromParam ? new Date(fromParam) : undefined)

    const toParam = searchParams.get('to')
    setToDate(toParam ? new Date(toParam) : undefined)
  }, [searchParams]) // Dependența corectă pentru a asculta URL-ul

  // --- ACȚIUNEA DE FILTRARE (Doar pe buton) ---
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    // Resetăm pagina la 1 la orice filtrare nouă
    params.set('page', '1')

    if (text) params.set('q', text)
    else params.delete('q')

    if (status && status !== 'ALL') params.set('status', status)
    else params.delete('status')

    if (fromDate) params.set('from', format(fromDate, 'yyyy-MM-dd'))
    else params.delete('from')

    if (toDate) params.set('to', format(toDate, 'yyyy-MM-dd'))
    else params.delete('to')

    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    setText('')
    setStatus('ALL')
    setFromDate(undefined)
    setToDate(undefined)

    // Curățăm URL-ul
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.delete('status')
    params.delete('from')
    params.delete('to')
    params.set('page', '1')

    router.push(`${pathname}?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyFilters()
  }

  // --- CONFIGURARE OPȚIUNI STATUS ---
  let statusOptions: { value: string; label: string }[] = []

  if (isInvoices) {
    statusOptions = [
      { value: 'APPROVED', label: 'Aprobate' },
      { value: 'PARTIAL_PAID', label: 'Parțial Plătite' },
    ]
  } else if (isReceipts) {
    statusOptions = [
      { value: 'NEALOCATA', label: 'Nealocate' },
      { value: 'PARTIAL_ALOCAT', label: ' Alocată Parțial' },
      { value: 'ALOCAT_COMPLET', label: 'Alocată' },
      { value: 'ANULATA', label: 'Anulate' },
    ]
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {/* 1. SEARCH TEXT */}
      <div className='relative'>
        <Input
          placeholder='Caută...'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className='w-[180px] h-8 text-xs bg-background'
        />
      </div>

      {/* 2. STATUS SELECT */}
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className='max-h-8.5 w-[120px] text-xs bg-background cursor-pointer'>
          <SelectValue placeholder='Status' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='ALL'>Toate</SelectItem>
          {statusOptions.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className='cursor-pointer'
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 3. DATE PICKERS */}
      <div className='flex items-center gap-1'>
        {/* De la */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={'outline'}
              className={cn(
                'h-8 w-[110px] justify-start text-left font-normal text-xs px-2 bg-background',
                !fromDate && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className='mr-2 h-3 w-3' />
              {fromDate ? format(fromDate, 'dd.MM.yyyy') : <span>De la</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              mode='single'
              selected={fromDate}
              onSelect={setFromDate}
              initialFocus
              locale={ro}
            />
          </PopoverContent>
        </Popover>

        <span className='text-muted-foreground text-xs'>-</span>

        {/* Până la */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={'outline'}
              className={cn(
                'h-8 w-[110px] justify-start text-left font-normal text-xs px-2 bg-background',
                !toDate && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className='mr-2 h-3 w-3' />
              {toDate ? format(toDate, 'dd.MM.yyyy') : <span>Până la</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              mode='single'
              selected={toDate}
              onSelect={setToDate}
              initialFocus
              locale={ro}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* 4. BUTTONS (Actionarea efectivă) */}
      <Button size='sm' onClick={applyFilters} className='h-8 text-xs px-3'>
        <Search className='h-3 w-3 mr-1' />
        Filtrează
      </Button>

      {/* Buton Clear (apare doar dacă există filtre active) */}
      {(text || status !== 'ALL' || fromDate || toDate) && (
        <Button
          variant='ghost'
          size='sm'
          onClick={clearFilters}
          className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground'
        >
          <X className='h-3 w-3' />
        </Button>
      )}
    </div>
  )
}
