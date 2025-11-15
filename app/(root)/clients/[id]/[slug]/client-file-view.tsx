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

interface ClientFileViewProps {
  client: IClientDoc
  summary: IClientSummary
  isAdmin: boolean
  clientSlug: string
}

export default function ClientFileView({
  client,
  summary,
  isAdmin,
  clientSlug,
}: ClientFileViewProps) {
  const [activeTab, setActiveTab] = useState('details')

  const [selectedLedgerEntry, setSelectedLedgerEntry] =
    useState<ClientLedgerEntry | null>(null)

  const [selectedPayment, setSelectedPayment] =
    useState<PopulatedClientPayment | null>(null)

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
        {/* Coloana Stânga: Meniul */}
        <aside className='md:col-span-1'>
          <div className='sticky top-24'>
            <ClientNav activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </aside>
        {/* Coloana Dreapta: Conținutul */}
        <main className='md:col-span-4 space-y-6'>
          <ClientSummaryCard
            summary={summary}
            clientId={client._id}
            clientSlug={clientSlug}
            isAdmin={isAdmin}
          />

          <div>
            {activeTab === 'details' && (
              <ClientDetails client={client} isAdmin={isAdmin} />
            )}
            {activeTab === 'orders' && (
              <div className='p-4 border rounded-md'>
                Aici va fi tabelul cu comenzi.
              </div>
            )}
            {activeTab === 'deliveries' && (
              <div className='p-4 border rounded-md'>
                Aici va fi tabelul cu livrări.
              </div>
            )}
            {activeTab === 'notices' && (
              <div className='p-4 border rounded-md'>
                Aici va fi tabelul cu avize.
              </div>
            )}
            {activeTab === 'invoices' && (
              <div className='p-4 border rounded-md'>
                Aici va fi tabelul cu facturi.
              </div>
            )}

            {activeTab === 'payments' && (
              <ClientLedgerTable
                clientId={client._id}
                onInvoiceClick={handleInvoiceClick}
                onPaymentClick={handlePaymentClick}
                isAdmin={isAdmin}
              />
            )}

            {activeTab === 'products' && (
              <div className='p-4 border rounded-md'>
                Aici va fi tabelul cu produse.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modalele pentru Drill-Down */}

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
