'use client'

import { Input } from '@/components/ui/input'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function ProformasFilters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Data curentă din URL
  const date: DateRange | undefined = {
    from: searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined,
    to: searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined,
  }

  const handleSearch = (term: string, key: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')
    if (term) params.set(key, term)
    else params.delete(key)
    replace(`${pathname}?${params.toString()}`)
  }

  const handleTextChange = (term: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => handleSearch(term, 'q'), 500)
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

  const handleReset = () => {
    replace(pathname)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className='flex flex-wrap w-full items-center gap-2 mb-1'>
      <Input
        ref={inputRef}
        placeholder='Caută Nr. Proformă / Client...'
        defaultValue={searchParams.get('q')?.toString()}
        onChange={(e) => handleTextChange(e.target.value)}
        className='w-full sm:w-[250px]'
      />
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
        <Button variant='ghost' size='icon' onClick={handleReset}>
          <X className='h-4 w-4' />
        </Button>
      )}
    </div>
  )
}
