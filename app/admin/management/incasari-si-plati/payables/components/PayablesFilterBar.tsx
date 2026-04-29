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
import { Checkbox } from '@/components/ui/checkbox'
import {
  PAYMENT_METHOD_MAP,
  PAYMENT_METHODS,
} from '@/lib/db/modules/financial/treasury/payment.constants'

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
  const [balanceType, setBalanceType] = useState(
    searchParams.get('balanceType') || 'ALL',
  )
  const [overdueDays, setOverdueDays] = useState(
    searchParams.get('overdueDays') || 'ALL',
  )
  const [minAmt, setMinAmt] = useState(searchParams.get('minAmt') || '')
  const [maxAmt, setMaxAmt] = useState(searchParams.get('maxAmt') || '')
  const [onlyOverdue, setOnlyOverdue] = useState(
    searchParams.get('onlyOverdue') === 'true',
  )
  const [hideCompensations, setHideCompensations] = useState(
    searchParams.get('hideCompensations') === 'true',
  )
  const [method, setMethod] = useState(searchParams.get('method') || 'ALL')

  const isMounted = useRef(false)
  const isTyping = useRef(false)
  const [fromDate, setFromDate] = useState<Date | undefined>(
    searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
  )
  const [toDate, setToDate] = useState<Date | undefined>(
    searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
  )

  // Sincronizare cu URL la Back/Forward
  useEffect(() => {
    if (!isTyping.current) setText(searchParams.get('q') || '')
    setStatus(searchParams.get('status') || 'ALL')
    setDateType(searchParams.get('dateType') || 'due')
    setBalanceType(searchParams.get('balanceType') || 'ALL')
    setOverdueDays(searchParams.get('overdueDays') || 'ALL')
    setMinAmt(searchParams.get('minAmt') || '')
    setMaxAmt(searchParams.get('maxAmt') || '')
    setOnlyOverdue(searchParams.get('onlyOverdue') === 'true')
    setHideCompensations(searchParams.get('hideCompensations') === 'true')
    setMethod(searchParams.get('method') || 'ALL')

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
    currentBalanceType: string = balanceType,
    currentOverdueDays: string = overdueDays,
    currentMinAmt: string = minAmt,
    currentMaxAmt: string = maxAmt,
    currentOnlyOverdue: boolean = onlyOverdue,
    currentHideCompensations: boolean = hideCompensations,
    currentMethod: string = method,
  ) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1') // Resetăm pagina la 1

    if (currentText) params.set('q', currentText)
    else params.delete('q')

    if (currentStatus && currentStatus !== 'ALL')
      params.set('status', currentStatus)
    else params.delete('status')

    if (isInvoices || isBalances) params.set('dateType', currentDateType)
    else params.delete('dateType')

    if (currentFrom) params.set('from', format(currentFrom, 'yyyy-MM-dd'))
    else params.delete('from')

    if (currentTo) params.set('to', format(currentTo, 'yyyy-MM-dd'))
    else params.delete('to')

    if (isBalances) {
      if (currentBalanceType !== 'ALL')
        params.set('balanceType', currentBalanceType)
      else params.delete('balanceType')

      if (currentOverdueDays !== 'ALL')
        params.set('overdueDays', currentOverdueDays)
      else params.delete('overdueDays')

      if (currentMinAmt) params.set('minAmt', currentMinAmt)
      else params.delete('minAmt')

      if (currentMaxAmt) params.set('maxAmt', currentMaxAmt)
      else params.delete('maxAmt')
    }

    if (isInvoices || isBalances) {
      if (currentOnlyOverdue) params.set('onlyOverdue', 'true')
      else params.delete('onlyOverdue')
    }

    if (isPayments) {
      if (currentHideCompensations) params.set('hideCompensations', 'true')
      else params.delete('hideCompensations')
    }

    if (currentMethod && currentMethod !== 'ALL')
      params.set('method', currentMethod)
    else params.delete('method')

    router.push(`${pathname}?${params.toString()}`)
  }

  // EFECT 1: Debounce Text & Sume
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    isTyping.current = true

    const timer = setTimeout(() => {
      isTyping.current = false
      updateUrl(
        text,
        status,
        dateType,
        fromDate,
        toDate,
        balanceType,
        overdueDays,
        minAmt,
        maxAmt,
        onlyOverdue,
        hideCompensations,
        method,
      )
    }, 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, minAmt, maxAmt])

  // Extragem valorile de timp în variabile separate pentru a rezolva eroarea ESLint
  const fromTime = fromDate?.getTime()
  const toTime = toDate?.getTime()

  // EFECT 2: Filtrare Instantanee
  useEffect(() => {
    if (isMounted.current && !isTyping.current) {
      updateUrl(
        text,
        status,
        dateType,
        fromDate,
        toDate,
        balanceType,
        overdueDays,
        minAmt,
        maxAmt,
        onlyOverdue,
        hideCompensations,
        method,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    status,
    dateType,
    balanceType,
    overdueDays,
    onlyOverdue,
    fromTime,
    toTime,
    hideCompensations,
    method,
  ])

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
    setBalanceType('ALL')
    setOverdueDays('ALL')
    setMinAmt('')
    setMaxAmt('')
    setOnlyOverdue(false)
    setFromDate(undefined)
    setHideCompensations(false)
    setMethod('ALL')
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
      {/* 1. SEARCH TEXT */}
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

      {/* --- FILTRE SPECIFICE SOLDURILOR (Apar doar pe tabul de Solduri) --- */}
      {isBalances && (
        <>
          <Select value={balanceType} onValueChange={setBalanceType}>
            <SelectTrigger className='max-h-8.5 w-[140px] text-xs bg-background cursor-pointer'>
              <SelectValue placeholder='Tip Sold' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL' className='cursor-pointer'>
                Orice Sold
              </SelectItem>
              <SelectItem value='DEBT' className='cursor-pointer'>
                Doar cu Datorii
              </SelectItem>
              <SelectItem value='ADVANCE' className='cursor-pointer'>
                Doar cu Avans
              </SelectItem>
              <SelectItem value='OVERDUE' className='cursor-pointer'>
                Facturi Restante
              </SelectItem>
              <SelectItem value='UNALLOCATED' className='cursor-pointer'>
                Plăți Nealocate
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={overdueDays} onValueChange={setOverdueDays}>
            <SelectTrigger className='max-h-8.5 w-[130px] text-xs bg-background cursor-pointer'>
              <SelectValue placeholder='Vechime factură' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL' className='cursor-pointer'>
                Orice vechime
              </SelectItem>
              <SelectItem value='15' className='cursor-pointer'>
                &gt; 15 zile
              </SelectItem>
              <SelectItem value='30' className='cursor-pointer'>
                &gt; 30 zile
              </SelectItem>
              <SelectItem value='45' className='cursor-pointer'>
                &gt; 45 zile
              </SelectItem>
              <SelectItem value='60' className='cursor-pointer'>
                &gt; 60 zile
              </SelectItem>
              <SelectItem value='90' className='cursor-pointer'>
                &gt; 90 zile
              </SelectItem>
              <SelectItem value='120' className='cursor-pointer'>
                &gt; 120 zile
              </SelectItem>
            </SelectContent>
          </Select>

          <div className='flex items-center gap-1'>
            <Input
              type='number'
              placeholder='Suma Min'
              value={minAmt}
              onChange={(e) => setMinAmt(e.target.value)}
              className='w-[100px] h-8 text-xs bg-background'
            />
            <span className='text-muted-foreground text-xs'>-</span>
            <Input
              type='number'
              placeholder='Suma Max'
              value={maxAmt}
              onChange={(e) => setMaxAmt(e.target.value)}
              className='w-[100px] h-8 text-xs bg-background'
            />
          </div>

          <div className='flex items-center space-x-2 h-8 px-3 border rounded-md bg-background cursor-pointer hover:bg-muted/50 transition-colors'>
            <Checkbox
              id='strict-restante'
              checked={onlyOverdue}
              onCheckedChange={(checked) => setOnlyOverdue(!!checked)}
            />
            <label
              htmlFor='strict-restante'
              className='text-xs font-medium leading-none cursor-pointer select-none'
            >
              Strict Restante
            </label>
          </div>
        </>
      )}

      {/* 2. STATUS SELECT (Ascuns pe Solduri) */}
      {!isBalances && (
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className='max-h-8.5 w-[120px] text-xs bg-background cursor-pointer'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL' className='cursor-pointer'>
              Status
            </SelectItem>
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

      {/* METODĂ PLATĂ (Adăugat doar pe tabul de Plăți) */}
      {isPayments && !isBalances && (
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className='max-h-8.5 w-[140px] text-xs bg-background cursor-pointer'>
            <SelectValue placeholder='Metodă Plată' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Metoda Plata</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m} className='cursor-pointer'>
                {PAYMENT_METHOD_MAP[m].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 3. TIP DATĂ (Vizibil și pe Facturi și pe Solduri) */}
      {(isInvoices || isBalances) && (
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

      {/* 4. DATE PICKERS (Vizibil și pe Facturi și pe Solduri) */}
      {(!isBalances ||
        isBalances) /* Am forțat vizibilitatea scriind așa ca să înțelegi, deși condiția e mereu true acum. Așa că îl lăsăm vizibil pentru logica de "Ce urmează să plătim" */ && (
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

      {/* --- FILTRU SPECIFIC FACTURILOR --- */}
      {isInvoices && (
        <div className='flex items-center space-x-2 h-8 px-3 border rounded-md bg-background cursor-pointer hover:bg-muted/50 transition-colors'>
          <Checkbox
            id='invoices-overdue'
            checked={onlyOverdue}
            onCheckedChange={(checked) => setOnlyOverdue(!!checked)}
          />
          <label
            htmlFor='invoices-overdue'
            className='text-xs font-medium leading-none cursor-pointer select-none whitespace-nowrap'
          >
            Doar Restante
          </label>
        </div>
      )}

      {/* --- FILTRU SPECIFIC PLĂȚILOR --- */}
      {isPayments && (
        <div className='flex items-center space-x-2 h-8 px-3 border rounded-md bg-background cursor-pointer hover:bg-muted/50 transition-colors'>
          <Checkbox
            id='hide-compensations'
            checked={hideCompensations}
            onCheckedChange={(checked) => setHideCompensations(!!checked)}
          />
          <label
            htmlFor='hide-compensations'
            className='text-xs font-medium leading-none cursor-pointer select-none whitespace-nowrap'
          >
            Ascunde Compensările
          </label>
        </div>
      )}

      {/* Butonul de RESET */}
      {(text ||
        status !== 'ALL' ||
        fromDate ||
        toDate ||
        balanceType !== 'ALL' ||
        overdueDays !== 'ALL' ||
        minAmt ||
        maxAmt ||
        onlyOverdue ||
        hideCompensations ||
        method !== 'ALL') && (
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
