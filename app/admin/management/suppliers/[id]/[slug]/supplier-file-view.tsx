'use client'

import { useState } from 'react'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import { ISupplierSummary } from '@/lib/db/modules/suppliers/summary/supplier-summary.model'
import { SupplierNav } from '../../supplier-nav'
import SupplierSummaryCard from '../../supplier-summary-card'
import { SupplierDetails } from '../../supplier-details'

import { SupplierProductsList } from './SupplierProductsList'
import { SupplierInvoicesList } from './SupplierInvoicesList'
import { SupplierLedgerTable } from '../../components/SupplierLedgerTable'
import { SupplierReceptionsList } from '../../components/SupplierReceptionsList'

interface SupplierFileViewProps {
  supplier: ISupplierDoc
  summary: ISupplierSummary
}

export default function SupplierFileView({
  supplier,
  summary,
}: SupplierFileViewProps) {
  const [activeTab, setActiveTab] = useState('details')

  return (
    <div className='grid md:grid-cols-5 max-w-full gap-8'>
      <aside className='md:col-span-1'>
        <div className='sticky top-24'>
          <SupplierNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            supplierId={supplier._id}
          />
        </div>
      </aside>

      <main className='md:col-span-4 space-y-6'>
        {/* Cardul de Sumar Financiar */}
        <SupplierSummaryCard summary={summary} />

        <div>
          {/* TAB: DETALII */}
          {activeTab === 'details' && <SupplierDetails supplier={supplier} />}

          {/* TAB: RECEPȚII (NIR) */}
          {activeTab === 'receptions' && (
            <SupplierReceptionsList supplierId={supplier._id} />
          )}

          {/* TAB: FACTURI */}
          {activeTab === 'invoices' && (
            <SupplierInvoicesList supplierId={supplier._id} />
          )}

          {/* TAB: PLĂȚI */}
          {activeTab === 'payments' && (
            <SupplierLedgerTable supplierId={supplier._id} />
          )}

          {/* TAB: PRODUSE */}
          {activeTab === 'products' && (
            <SupplierProductsList supplierId={supplier._id} />
          )}
        </div>
      </main>
    </div>
  )
}
