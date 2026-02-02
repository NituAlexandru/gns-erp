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
              <ClientLedgerTable
                clientId={client._id}
                entries={tabData} // Ledger-ul e o listă simplă
                onInvoiceClick={handleInvoiceClick}
                onPaymentClick={handlePaymentClick}
                isAdmin={isAdmin}
              />
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
