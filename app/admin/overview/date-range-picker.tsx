'use client'
import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { addMonths } from 'date-fns'
import { cn, formatDateTime } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { DayPicker } from 'react-day-picker'
import { PopoverClose } from '@radix-ui/react-popover'
import 'react-day-picker/dist/style.css'

export function CalendarDateRangePicker({
  defaultDate,
  setDate,
  className,
}: {
  defaultDate?: DateRange
  setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>
  className?: string
}) {
  const [range, setRange] = React.useState<DateRange | undefined>(defaultDate)
  const [startMonth, setStartMonth] = React.useState<Date>(
    defaultDate?.from ?? new Date()
  )
  const [endMonth, setEndMonth] = React.useState<Date>(
    defaultDate?.to
      ? defaultDate.to
      : addMonths(defaultDate?.from ?? new Date(), 1)
  )

  React.useEffect(() => {
    if (defaultDate) {
      setRange(defaultDate)
      setStartMonth(defaultDate.from ?? new Date())
      setEndMonth(
        defaultDate.to
          ? defaultDate.to
          : addMonths(defaultDate.from ?? new Date(), 1)
      )
    }
  }, [defaultDate])

  // când selectezi în primul calendar, actualizezi numai from
  const handleStart = (date: Date | undefined) => {
    setRange((r) => ({ from: date ?? r?.from, to: r?.to }))
  }
  // când selectezi în al doilea, actualizezi numai to
  const handleEnd = (date: Date | undefined) => {
    setRange((r) => ({ from: r?.from, to: date ?? r?.to }))
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id='date'
            variant='outline'
            className={cn(
              'justify-start text-left font-normal',
              !range && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className='mr-1 h-4 w-4' />
            {range?.from ? (
              range.to ? (
                <>
                  {formatDateTime(range.from).dateOnly} –{' '}
                  {formatDateTime(range.to).dateOnly}
                </>
              ) : (
                formatDateTime(range.from).dateOnly
              )
            ) : (
              <span>Alege o dată</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          onCloseAutoFocus={() => {
            // reset luni dacă dai cancel
            setStartMonth(defaultDate?.from ?? new Date())
            setEndMonth(
              defaultDate?.to
                ? defaultDate.to
                : addMonths(defaultDate?.from ?? new Date(), 1)
            )
          }}
          className='w-auto p-0'
          align='end'
        >
          <div className='flex space-x-4 p-4'>
            <div>
              <div className='text-center mb-2 font-medium'>Început</div>
              <DayPicker
                mode='single'
                selected={range?.from}
                onSelect={handleStart}
                month={startMonth}
                onMonthChange={setStartMonth}
              />
            </div>
            <div>
              <div className='text-center mb-2 font-medium'>Sfârșit</div>
              <DayPicker
                mode='single'
                selected={range?.to}
                onSelect={handleEnd}
                month={endMonth}
                onMonthChange={setEndMonth}
                disabled={(date) => Boolean(range?.from && date < range.from)}
              />
            </div>
          </div>
          <div className='flex gap-4 p-4 pt-0'>
            <PopoverClose asChild>
              <Button onClick={() => setDate(range)}>Aplică</Button>
            </PopoverClose>
            <PopoverClose asChild>
              <Button variant='outline'>Anulează</Button>
            </PopoverClose>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
