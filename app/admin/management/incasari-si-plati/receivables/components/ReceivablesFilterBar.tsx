'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { CalendarClock, Calendar as CalendarIcon, X } from 'lucide-react'
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
  const isInbox = pathname.includes('/mesaje-spv')
  const isLogs = pathname.includes('/logs')
  const isBalances = pathname.includes('/solduri')

  const [text, setText] = useState(searchParams.get('q') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL')
  const [dateType, setDateType] = useState(
    searchParams.get('dateType') || 'due',
  )
  const [fromDate, setFromDate] = useState<Date | undefined>(
    searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
  )
  const [toDate, setToDate] = useState<Date | undefined>(
    searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
  )

  const isMounted = useRef(false)

  useEffect(() => {
    setText(searchParams.get('q') || '')
    setStatus(searchParams.get('status') || 'ALL')
    setDateType(searchParams.get('dateType') || 'due')

    setFromDate(
      searchParams.get('from')
        ? new Date(searchParams.get('from')!)
        : undefined,
    )
    setToDate(
      searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
    )
  }, [pathname, searchParams])

  // --- LOGICĂ ACTUALIZARE URL ---
  const updateUrl = (
    cText: string,
    cStatus: string,
    cDateType: string,
    cFrom?: Date,
    cTo?: Date,
  ) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    if (cText) params.set('q', cText)
    else params.delete('q')

    if (cStatus && cStatus !== 'ALL') params.set('status', cStatus)
    else params.delete('status')

    // Date Type doar la facturi
    if (isInvoices) {
      params.set('dateType', cDateType)
    } else {
      params.delete('dateType')
    }

    if (cFrom) params.set('from', format(cFrom, 'yyyy-MM-dd'))
    else params.delete('from')

    if (cTo) params.set('to', format(cTo, 'yyyy-MM-dd'))
    else params.delete('to')

    router.push(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    const timer = setTimeout(() => {
      updateUrl(text, status, dateType, fromDate, toDate)
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  useEffect(() => {
    if (isMounted.current) {
      updateUrl(text, status, dateType, fromDate, toDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dateType, fromDate?.getTime(), toDate?.getTime()])

  const clearFilters = () => {
    setText('')
    setStatus('ALL')
    setDateType('due')
    setFromDate(undefined)
    setToDate(undefined)
    router.push(pathname)
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
      { value: 'PARTIAL_ALOCAT', label: 'Alocată Parțial' },
      { value: 'ALOCAT_COMPLET', label: 'Alocată' },
      { value: 'ANULATA', label: 'Anulate' },
    ]
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {/* 1. SEARCH TEXT - Rămâne și pe Solduri */}
      {!isLogs && !isInbox && (
        <div className='relative'>
          <Input
            placeholder='Caută...'
            value={text}
            onChange={(e) => setText(e.target.value)}
            className='w-[180px] h-8 text-xs bg-background'
          />
        </div>
      )}

      {/* 2. STATUS SELECT - Ascuns pe Solduri */}
      {!isBalances && (isInvoices || isReceipts) && (
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
      )}

      {/* 3. TIP DATĂ - Doar pe Facturi */}
      {isInvoices && !isBalances && (
        <Select value={dateType} onValueChange={setDateType}>
          <SelectTrigger className='h-8 w-[150px] text-xs bg-background cursor-pointer border-dashed'>
            <div className='flex items-center gap-2'>
              <CalendarClock className='h-3 w-3' />
              <SelectValue placeholder='Tip Dată' />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='invoice' className='cursor-pointer'>
              Dată Factură
            </SelectItem>
            <SelectItem value='due' className='cursor-pointer'>
              Dată Scadență
            </SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* 4. DATE PICKERS - Ascuns pe Solduri */}
      {!isBalances && (isInvoices || isReceipts) && (
        <div className='flex items-center gap-1'>
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
      )}

      {/* Buton Reset - Doar dacă sunt filtre */}
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
