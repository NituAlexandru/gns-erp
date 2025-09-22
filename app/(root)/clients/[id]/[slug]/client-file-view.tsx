'use client'

import { useState } from 'react'
import { IClientDoc } from '@/lib/db/modules/client/types'
import { IClientSummary } from '@/lib/db/modules/client/summary/client-summary.model'
import { ClientNav } from '../../client-nav'
import ClientSummaryCard from '../../client-summary-card'
import { ClientDetails } from '../../client-details'

interface ClientFileViewProps {
  client: IClientDoc
  summary: IClientSummary
  isAdmin: boolean
}

export default function ClientFileView({
  client,
  summary,
  isAdmin,
}: ClientFileViewProps) {
  const [activeTab, setActiveTab] = useState('details')

  return (
    <div className='grid md:grid-cols-5 max-w-full gap-8'>
      {/* Coloana Stânga: Meniul */}
      <aside className='md:col-span-1'>
        <div className='sticky top-24'>
          <ClientNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </aside>

      {/* Coloana Dreapta: Conținutul */}
      <main className='md:col-span-4 space-y-6'>
        {/* Sumarul - mereu vizibil */}
        <ClientSummaryCard summary={summary} />

        {/* Conținutul dinamic în funcție de tab-ul activ */}
        <div>
          {activeTab === 'details' && (
            <ClientDetails client={client} isAdmin={isAdmin} />
          )}
          {activeTab === 'deliveries' && (
            <div className='card bg-base-200 p-4'>
              Aici va fi tabelul cu livrări.
            </div>
          )}
          {activeTab === 'invoices' && (
            <div className='card bg-base-200 p-4'>
              Aici va fi tabelul cu facturi.
            </div>
          )}
          {activeTab === 'orders' && (
            <div className='card bg-base-200 p-4'>
              Aici va fi tabelul cu comenzi.
            </div>
          )}
          {activeTab === 'notices' && (
            <div className='card bg-base-200 p-4'>
              Aici va fi tabelul cu avize.
            </div>
          )}
          {activeTab === 'payments' && (
            <div className='card bg-base-200 p-4'>
              Aici va fi tabelul cu plăți.
            </div>
          )}
          {activeTab === 'products' && (
            <div className='card bg-base-200 p-4'>
              Aici va fi tabelul cu produse.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
