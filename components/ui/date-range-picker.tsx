'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerWithRangeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id='date'
            variant={'outline'}
            className={cn(
              'w-[250px] justify-start text-left font-normal',
              !date && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {date?.from ? (
              // 👈 MODIFICARE: Verificăm dacă 'from' și 'to' sunt aceeași zi
              date.to &&
              format(date.from, 'y-MM-dd') !== format(date.to, 'y-MM-dd') ? (
                // Dacă sunt zile diferite, afișăm intervalul
                <>
                  {format(date.from, 'LLL dd, y', { locale: ro })} -{' '}
                  {format(date.to, 'LLL dd, y', { locale: ro })}
                </>
              ) : (
                // Dacă este o singură zi, afișăm doar acea zi
                format(date.from, 'LLL dd, y', { locale: ro })
              )
            ) : (
              <span>Alege o perioadă</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            mode='range'
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={1}
            locale={ro}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
