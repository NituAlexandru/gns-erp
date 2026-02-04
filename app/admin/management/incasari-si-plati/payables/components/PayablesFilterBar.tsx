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

export function PayablesFilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isInvoices = pathname.includes('/facturi')
  const isPayments = pathname.includes('/plati')
  const isInbox = pathname.includes('/mesaje-spv')
  const isLogs = pathname.includes('/logs')
  const isBalances = pathname.includes('/solduri')

  const [text, setText] = useState(searchParams.get('q') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL')
  const [dateType, setDateType] = useState(
    searchParams.get('dateType') || 'due',
  )
  const isMounted = useRef(false)

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
    currentText: string,
    currentStatus: string,
    currentDateType: string,
    currentFrom?: Date,
    currentTo?: Date,
  ) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1') // Resetăm pagina la 1

    if (currentText) params.set('q', currentText)
    else params.delete('q')

    if (currentStatus && currentStatus !== 'ALL')
      params.set('status', currentStatus)
    else params.delete('status')

    if (isInvoices) {
      params.set('dateType', currentDateType)
    } else {
      params.delete('dateType')
    }

    if (currentFrom) params.set('from', format(currentFrom, 'yyyy-MM-dd'))
    else params.delete('from')

    if (currentTo) params.set('to', format(currentTo, 'yyyy-MM-dd'))
    else params.delete('to')

    router.push(`${pathname}?${params.toString()}`)
  }

  // EFECT 1: Debounce Text
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

  // EFECT 2: Filtrare Instantanee (cu fix pentru bucla infinită)
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

  // Configurare opțiuni status
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
      {/* 1. SEARCH TEXT - Rămâne vizibil pe Solduri */}
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

      {/* 2. STATUS SELECT - ASCUNS PE SOLDURI */}
      {!isBalances && (
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

      {/* 3. TIP DATĂ - Doar pe facturi */}
      {isInvoices && (
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

      {/* 4. DATE PICKERS - ASCUNS PE SOLDURI */}
      {!isBalances && (
        <div className='flex items-center gap-1'>
          {/* FROM DATE */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'h-8 w-[120px] justify-start text-left font-normal text-xs px-2 bg-background',
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
                  'h-8 w-[120px] justify-start text-left font-normal text-xs px-2 bg-background',
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

      {/* Butonul de RESET */}
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
