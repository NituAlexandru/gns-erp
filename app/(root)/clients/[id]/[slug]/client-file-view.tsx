'use client'

import { useState } from 'react'
import { IClientDoc } from '@/lib/db/modules/client/types'
import { IClientSummary } from '@/lib/db/modules/client/summary/client-summary.model'
import { ClientNav } from '../../client-nav'
import ClientSummaryCard from '../../client-summary-card'
import { ClientDetails } from '../../client-details'
import { ClientLedgerTable } from './ClientLedgerTable'
import { ClientLedgerEntry } from '@/lib/db/modules/client/summary/client-summary.types'
import { InvoiceAllocationHistorySheet } from './InvoiceAllocationHistorySheet'
import { PopulatedClientPayment } from '@/lib/db/modules/financial/treasury/receivables/client-payment.types'
import { AllocationModal } from '@/app/admin/management/incasari-si-plati/receivables/components/AllocationModal'
import { ClientInvoicesList } from './ClientInvoicesList'
import { ClientOrdersList } from './ClientOrdersList'
import { ClientDeliveriesList } from './ClientDeliveriesList'
import { ClientDeliveryNotesList } from './ClientDeliveryNotesList'
import { ClientProductsList } from './ClientProductsList'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { TIMEZONE } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'

interface ClientFileViewProps {
  client: IClientDoc
  summary: IClientSummary
  isAdmin: boolean
  clientSlug: string
  activeTab: string
  tabData: any
  currentPage: number
}

export default function ClientFileView({
  client,
  summary,
  isAdmin,
  clientSlug,
  activeTab,
  tabData,
  currentPage,
}: ClientFileViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // State-uri locale (doar pentru modale/interacțiuni UI)
  const [selectedLedgerEntry, setSelectedLedgerEntry] =
    useState<ClientLedgerEntry | null>(null)
  const [selectedPayment, setSelectedPayment] =
    useState<PopulatedClientPayment | null>(null)

  // Funcție care schimbă URL-ul când dai click pe un tab
  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newTab)
    params.delete('page') // Resetăm pagina
    params.delete('status') // Resetăm filtrele
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleInvoiceClick = (entry: ClientLedgerEntry) => {
    setSelectedLedgerEntry(entry)
  }

  const handlePaymentClick = (paymentId: string) => {
    const pseudoPayment: PopulatedClientPayment = {
      _id: paymentId,
      clientId: {
        _id: client._id,
        name: client.name,
      },
      paymentNumber: '...',
      seriesName: '...',
      paymentDate: new Date().toISOString(),
      paymentMethod: 'ALTUL',
      totalAmount: 0,
      unallocatedAmount: 0,
      status: 'NEALOCATA',
      createdByName: '',
      createdAt: new Date().toISOString(),
      currency: 'RON',
      exchangeRate: 1,
      isRefund: false,
    }
    setSelectedPayment(pseudoPayment)
  }

  return (
    <>
      <div className='grid md:grid-cols-5 max-w-full gap-8'>
        <aside className='md:col-span-1'>
          <div className='sticky top-24'>
            {/* ClientNav trebuie să accepte acum setActiveTab care schimbă URL-ul */}
            <ClientNav
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              clientId={client._id}
              isAdmin={isAdmin}
            />
          </div>
        </aside>
        <main className='md:col-span-4 space-y-2'>
          <ClientSummaryCard
            summary={summary}
            clientId={client._id}
            clientSlug={clientSlug}
            isAdmin={isAdmin}
          />

          <div>
            {/* Randăm condiționat, dar pasăm datele (tabData) direct */}

            {activeTab === 'details' && (
              <ClientDetails client={client} isAdmin={isAdmin} />
            )}

            {activeTab === 'orders' && (
              <ClientOrdersList
                clientId={client._id}
                initialData={tabData} // <--- Datele vin de sus
                currentPage={currentPage}
              />
            )}

            {activeTab === 'deliveries' && (
              <ClientDeliveriesList
                clientId={client._id}
                initialData={tabData}
                currentPage={currentPage}
              />
            )}

            {activeTab === 'notices' && (
              <ClientDeliveryNotesList
                clientId={client._id}
                initialData={tabData}
                currentPage={currentPage}
              />
            )}

            {activeTab === 'invoices' && (
              <ClientInvoicesList
                clientId={client._id}
                initialData={tabData}
                currentPage={currentPage}
              />
            )}

            {activeTab === 'payments' && (
              <div className='space-y-1'>
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

                {/* TABELUL */}
                <ClientLedgerTable
                  clientId={client._id}
                  data={tabData}
                  onInvoiceClick={handleInvoiceClick}
                  onPaymentClick={handlePaymentClick}
                  isAdmin={isAdmin}
                />
              </div>
            )}

            {activeTab === 'products' && (
              <ClientProductsList
                clientId={client._id}
                initialData={tabData}
                currentPage={currentPage}
              />
            )}
          </div>
        </main>
      </div>

      <InvoiceAllocationHistorySheet
        ledgerEntry={selectedLedgerEntry}
        onClose={() => setSelectedLedgerEntry(null)}
      />

      <AllocationModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        isAdmin={isAdmin}
      />
    </>
  )
}
