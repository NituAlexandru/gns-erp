'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DELIVERY_NOTE_STATUS_MAP } from '@/lib/db/modules/financial/delivery-notes/delivery-note.constants'
import { X } from 'lucide-react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useRef } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export function DeliveryNotesFilters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const date: DateRange | undefined = {
    from: searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined,
    to: searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined,
  }

  const handleDateSelect = (newDate: DateRange | undefined) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')

    if (newDate?.from)
      params.set('startDate', format(newDate.from, 'yyyy-MM-dd'))
    else params.delete('startDate')

    if (newDate?.to) params.set('endDate', format(newDate.to, 'yyyy-MM-dd'))
    else params.delete('endDate')

    replace(`${pathname}?${params.toString()}`)
  }

  const handleSearch = (val: string, key: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')
    if (val && val !== 'ALL') {
      params.set(key, val)
    } else {
      params.delete(key)
    }
    replace(`${pathname}?${params.toString()}`)
  }

  const handleTextChange = (term: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      handleSearch(term, 'q')
    }, 500)
  }

  // Resetare filtre
  const handleReset = () => {
    replace(pathname)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className='flex flex-col sm:flex-row w-full items-center justify-between gap-2 mb-0'>
      <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
        <Input
          ref={inputRef}
          placeholder='Caută Nr. Aviz / Client...'
          defaultValue={searchParams.get('q')?.toString() || ''}
          onChange={(e) => handleTextChange(e.target.value)}
          className='w-full sm:w-[250px]'
        />
        <Select
          value={searchParams.get('status')?.toString() || 'ALL'}
          onValueChange={(value) => handleSearch(value, 'status')}
        >
          <SelectTrigger className='w-full sm:w-[180px]'>
            <SelectValue placeholder='Toate statusurile' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Toate statusurile</SelectItem>
            {Object.entries(DELIVERY_NOTE_STATUS_MAP).map(([key, { name }]) => (
              <SelectItem key={key} value={key}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={'outline'}
              className={cn(
                'w-[240px] justify-start text-left font-normal',
                !date && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'dd LLL, y')} -{' '}
                    {format(date.to, 'dd LLL, y')}
                  </>
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
        {searchParams.toString().length > 0 && (
          <Button
            variant='ghost'
            onClick={handleReset}
            className='px-2 lg:px-3'
            title='Resetează filtrele'
          >
            <X className='h-4 w-4 mr-2' />
            Resetează
          </Button>
        )}
      </div>
    </div>
  )
}
