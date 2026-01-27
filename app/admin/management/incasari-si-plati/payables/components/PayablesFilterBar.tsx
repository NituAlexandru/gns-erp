'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale' // Pentru limba română la calendar
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

export function PayablesFilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isInvoices = pathname.includes('/facturi')
  const isPayments = pathname.includes('/plati')
  const isInbox = pathname.includes('/mesaje-spv')
  const isLogs = pathname.includes('/logs')

  // --- STATE ---
  const [text, setText] = useState(searchParams.get('q') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL')

  // Datele le ținem ca Date objects pentru Calendar, dar le convertim la string pentru URL
  const [fromDate, setFromDate] = useState<Date | undefined>(
    searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
  )
  const [toDate, setToDate] = useState<Date | undefined>(
    searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
  )

  // Sincronizare cu URL la Back/Forward
  useEffect(() => {
    setText(searchParams.get('q') || '')
    setStatus(searchParams.get('status') || 'ALL')
    setFromDate(
      searchParams.get('from')
        ? new Date(searchParams.get('from')!)
        : undefined,
    )
    setToDate(
      searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
    )
  }, [pathname, searchParams])

  // --- ACTIONS ---
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams)
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
    router.push(pathname)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyFilters()
  }

  // --- OPTIONS CONFIG ---
  // Aici am reparat eroarea de TS definind tipul explicit
  let statusOptions: { value: string; label: string }[] = []

  if (isInvoices) {
    statusOptions = [
      { value: 'NEPLATITA', label: 'Neplătite' },
      { value: 'PARTIAL_PLATITA', label: 'Parțial' },
      { value: 'PLATITA', label: 'Plătite' },
      { value: 'ANULATA', label: 'Anulate' },
      { value: 'STORNO', label: 'Storno' },
    ]
  } else if (isPayments) {
    statusOptions = [
      { value: 'NEALOCATA', label: 'Nealocate' },
      { value: 'PARTIAL_ALOCATA', label: 'Parțial' },
      { value: 'ALOCATA', label: 'Alocate' },
      { value: 'ANULATA', label: 'Anulate' },
    ]
  } else if (isInbox) {
    statusOptions = [
      { value: 'UNPROCESSED', label: 'Noi' },
      { value: 'COMPLETED', label: 'Procesate' },
      { value: 'ERROR_NO_SUPPLIER', label: 'Err Furnizor' },
      { value: 'ERROR_OTHER', label: 'Alte Erori' },
    ]
  } else if (isLogs) {
    statusOptions = [
      { value: 'ERROR', label: 'Erori' },
      { value: 'SUCCESS', label: 'Succes' },
      { value: 'INFO', label: 'Info' },
    ]
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {/* 1. SEARCH TEXT */}
      {!isLogs && !isInbox && (
        <div className='relative'>
          <Input
            placeholder='Caută...'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className='w-[180px] h-8 text-xs bg-background'
          />
        </div>
      )}

      {/* 2. SHADCN SELECT (STATUS) */}
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

      {/* 3. DATE PICKERS (SHADCN POPOVER + CALENDAR) */}
      <div className='flex items-center gap-1'>
        {/* FROM DATE */}
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

        {/* TO DATE */}
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

      {/* 4. BUTTONS */}
      <Button size='sm' onClick={applyFilters} className='h-8 text-xs px-3'>
        <Search className='h-3 w-3 mr-1' />
        Filtrează
      </Button>

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
