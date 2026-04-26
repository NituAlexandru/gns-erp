'use client'

import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import { ISupplierSummary } from '@/lib/db/modules/suppliers/summary/supplier-summary.model'
import { SupplierNav } from '../../supplier-nav'
import SupplierSummaryCard from '../../supplier-summary-card'
import { SupplierDetails } from '../../supplier-details'
import { SupplierProductsList } from './SupplierProductsList'
import { SupplierInvoicesList } from './SupplierInvoicesList'
import { SupplierReceptionsList } from './SupplierReceptionsList'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SupplierLedgerTable } from './SupplierLedgerTable'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { TIMEZONE } from '@/lib/constants'
import { Calendar } from '@/components/ui/calendar'

interface SupplierFileViewProps {
  supplier: ISupplierDoc
  summary: ISupplierSummary
  activeTab: string
  tabData: any
  currentPage: number
}

export default function SupplierFileView({
  supplier,
  summary,
  activeTab,
  tabData,
  currentPage,
}: SupplierFileViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newTab)
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className='grid md:grid-cols-5 max-w-full gap-8'>
      <aside className='md:col-span-1'>
        <div className='sticky top-24'>
          <SupplierNav
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            supplierId={supplier._id}
          />
        </div>
      </aside>

      <main className='md:col-span-4 space-y-1'>
        <SupplierSummaryCard summary={summary} />

        <div>
          {activeTab === 'details' && <SupplierDetails supplier={supplier} />}

          {/* TAB: RECEPȚII (NIR) */}
          {activeTab === 'receptions' && (
            <SupplierReceptionsList
              supplierId={supplier._id}
              initialData={tabData}
              currentPage={currentPage}
            />
          )}

          {/* TAB: FACTURI */}
          {activeTab === 'invoices' && (
            <SupplierInvoicesList
              supplierId={supplier._id}
              initialData={tabData}
              currentPage={currentPage}
            />
          )}

          {/* TAB: PLĂȚI */}
          {activeTab === 'payments' && (
            <div className='space-y-1'>
              <div className='flex items-center gap-6 bg-muted/30 p-0.5 px-2 rounded-md border'>
                <span className='text-sm font-bold text-muted-foreground uppercase'>
                  Filtrează Perioada:
                </span>
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
                            ? new Date(searchParams.get('from')! + 'T00:00:00')
                            : new Date(
                                `${new Date().getFullYear()}-01-01T00:00:00`,
                              )
                        }
                        defaultMonth={
                          searchParams.get('from')
                            ? new Date(searchParams.get('from')! + 'T00:00:00')
                            : new Date(
                                `${new Date().getFullYear()}-01-01T00:00:00`,
                              )
                        }
                        onSelect={(date) => {
                          const params = new URLSearchParams(
                            searchParams.toString(),
                          )
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
                            ? new Date(searchParams.get('to')! + 'T00:00:00')
                            : new Date(
                                `${new Date().getFullYear()}-12-31T00:00:00`,
                              )
                        }
                        defaultMonth={
                          searchParams.get('to')
                            ? new Date(searchParams.get('to')! + 'T00:00:00')
                            : new Date(
                                `${new Date().getFullYear()}-12-31T00:00:00`,
                              )
                        }
                        onSelect={(date) => {
                          const params = new URLSearchParams(
                            searchParams.toString(),
                          )
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
              <SupplierLedgerTable supplierId={supplier._id} data={tabData} />
            </div>
          )}

          {/* TAB: PRODUSE */}
          {activeTab === 'products' && (
            <SupplierProductsList
              supplierId={supplier._id}
              initialData={tabData}
              currentPage={currentPage}
            />
          )}
        </div>
      </main>
    </div>
  )
}
