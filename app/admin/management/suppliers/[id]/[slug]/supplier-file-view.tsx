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

      <main className='md:col-span-4 space-y-6'>
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
            <SupplierLedgerTable
              supplierId={supplier._id}
              entries={tabData} 
            />
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
