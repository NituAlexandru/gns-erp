'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { TIMEZONE } from '@/lib/constants'

export function DateRangeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <div className='flex items-center gap-2 bg-muted/30 p-1 px-2 rounded-md border'>
      <span className='text-sm font-bold text-muted-foreground uppercase'>
        Filtrează Perioada:
      </span>

      {/* Calendar DE LA */}
      <div className='flex items-center gap-2'>
        <label className='text-sm font-medium'>De la:</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              className='w-[160px] justify-start text-left font-normal bg-background'
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              {searchParams.get('from')
                ? formatInTimeZone(
                    new Date(searchParams.get('from')!),
                    TIMEZONE,
                    'dd.MM.yyyy',
                  )
                : `01.01.${new Date().getFullYear()}`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              mode='single'
              selected={
                searchParams.get('from')
                  ? new Date(searchParams.get('from')!)
                  : new Date(`${new Date().getFullYear()}-01-01`)
              }
              defaultMonth={
                searchParams.get('from')
                  ? new Date(searchParams.get('from')!)
                  : new Date(`${new Date().getFullYear()}-01-01`)
              }
              onSelect={(date) => {
                const params = new URLSearchParams(searchParams.toString())
                if (date) {
                  params.set(
                    'from',
                    formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd'),
                  )
                } else {
                  params.delete('from')
                }
                router.replace(`${pathname}?${params.toString()}`, {
                  scroll: false,
                })
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Calendar PÂNĂ LA */}
      <div className='flex items-center gap-2'>
        <label className='text-sm font-medium'>Până la:</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              className='w-[160px] justify-start text-left font-normal bg-background'
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              {searchParams.get('to')
                ? formatInTimeZone(
                    new Date(searchParams.get('to')!),
                    TIMEZONE,
                    'dd.MM.yyyy',
                  )
                : `31.12.${new Date().getFullYear()}`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              mode='single'
              selected={
                searchParams.get('to')
                  ? new Date(searchParams.get('to')!)
                  : new Date(`${new Date().getFullYear()}-12-31`)
              }
              defaultMonth={
                searchParams.get('to')
                  ? new Date(searchParams.get('to')!)
                  : new Date(`${new Date().getFullYear()}-12-31`)
              }
              onSelect={(date) => {
                const params = new URLSearchParams(searchParams.toString())
                if (date) {
                  params.set(
                    'to',
                    formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd'),
                  )
                } else {
                  params.delete('to')
                }
                router.replace(`${pathname}?${params.toString()}`, {
                  scroll: false,
                })
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
