'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { Search, X, Calendar as CalendarIcon } from 'lucide-react'
import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export function ReceiptsFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Gestionare Text (Search) cu Debounce
  const handleTextChange = (term: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      params.set('page', '1')
      if (term) params.set('search', term)
      else params.delete('search')
      router.replace(`${pathname}?${params.toString()}`)
    }, 500)
  }

  // Gestionare Dată
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
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleReset = () => {
    router.replace(pathname)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className='flex flex-col md:flex-row gap-2 items-center w-full md:w-auto'>
      <div className='relative w-full md:w-[250px]'>
        <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
        <Input
          ref={inputRef}
          placeholder='Caută serie, client...'
          className='pl-8 bg-background'
          defaultValue={searchParams.get('search')?.toString()}
          onChange={(e) => handleTextChange(e.target.value)}
        />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className={cn(
              'w-[240px] justify-start text-left font-normal',
              !date?.from && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {date?.from ? (
              date.to ? (
                `${format(date.from, 'dd MMM y', { locale: ro })} - ${format(date.to, 'dd MMM y', { locale: ro })}`
              ) : (
                format(date.from, 'dd MMM y', { locale: ro })
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
            locale={ro}
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
