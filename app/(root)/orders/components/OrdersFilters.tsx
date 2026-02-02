'use client'

import { useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { DateRange } from 'react-day-picker'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import { cn } from '@/lib/utils'
import { ORDER_STATUS_MAP } from '@/lib/db/modules/order/constants'

export function OrdersFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // -- LOGICĂ URL --
  const updateUrl = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1') // Reset pagină

    if (value && value !== 'ALL') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  // 1. Search Text (Debounce)
  const handleTextChange = (val: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      updateUrl('q', val)
    }, 500)
  }

  // 2. Date Range
  const date: DateRange | undefined = {
    from: searchParams.get('dateFrom')
      ? new Date(searchParams.get('dateFrom')!)
      : undefined,
    to: searchParams.get('dateTo')
      ? new Date(searchParams.get('dateTo')!)
      : undefined,
  }

  const handleDateSelect = (newDate: DateRange | undefined) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')

    if (newDate?.from)
      params.set('dateFrom', format(newDate.from, 'yyyy-MM-dd'))
    else params.delete('dateFrom')

    if (newDate?.to) params.set('dateTo', format(newDate.to, 'yyyy-MM-dd'))
    else params.delete('dateTo')

    router.replace(`${pathname}?${params.toString()}`)
  }

  // 3. Reset
  const handleReset = () => {
    router.replace(pathname)
    if (inputRef.current) inputRef.current.value = ''
  }

  const totalThresholds = [
    { label: 'Peste 1.000 RON', value: 1000 },
    { label: 'Peste 5.000 RON', value: 5000 },
    { label: 'Peste 10.000 RON', value: 10000 },
    { label: 'Peste 25.000 RON', value: 25000 },
    { label: 'Peste 50.000 RON', value: 50000 },
    { label: 'Peste 100.000 RON', value: 100000 },
  ]

  return (
    <div className='flex flex-col lg:flex-row w-full items-center justify-between gap-4'>
      <div className='flex flex-col lg:flex-row gap-2 w-full lg:w-auto'>
        {/* Căutare */}
        <Input
          ref={inputRef}
          placeholder='Caută Nr. Comandă / Client...'
          defaultValue={searchParams.get('q')?.toString()}
          onChange={(e) => handleTextChange(e.target.value)}
          className='w-[200px] xl:w-[250px]'
        />

        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={'outline'}
              className={cn(
                'w-full lg:w-[240px] justify-start text-left font-normal',
                !date && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              {date?.from ? (
                date.to ? (
                  `${format(date.from, 'dd LLL, y')} - ${format(date.to, 'dd LLL, y')}`
                ) : (
                  format(date.from, 'dd LLL, y')
                )
              ) : (
                <span>Alege perioada</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              initialFocus
              mode='range'
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Status */}
        <Select
          value={searchParams.get('status')?.toString() || 'ALL'}
          onValueChange={(val) => updateUrl('status', val)}
        >
          <SelectTrigger className='w-full lg:w-[170px] cursor-pointer'>
            <SelectValue placeholder='Toate statusurile' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Toate statusurile</SelectItem>
            {Object.entries(ORDER_STATUS_MAP).map(([key, { name }]) => (
              <SelectItem key={key} value={key} className='cursor-pointer'>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Total Min */}
        <Select
          value={searchParams.get('minTotal')?.toString() || 'ALL'}
          onValueChange={(val) => updateUrl('minTotal', val)}
        >
          <SelectTrigger className='w-full lg:w-[160px] cursor-pointer'>
            <SelectValue placeholder='Total comandă' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL' className='cursor-pointer'>
              Total comandă
            </SelectItem>
            {totalThresholds.map((t) => (
              <SelectItem
                key={t.value}
                value={t.value.toString()}
                className='cursor-pointer'
              >
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset */}
        {searchParams.toString().length > 0 && (
          <Button
            variant='ghost'
            onClick={handleReset}
            title='Resetează filtrele'
          >
            <X className='h-4 w-4' />
          </Button>
        )}
      </div>
    </div>
  )
}
