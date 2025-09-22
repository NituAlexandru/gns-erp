'use client'

import { useState } from 'react'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import { ISupplierSummary } from '@/lib/db/modules/suppliers/summary/supplier-summary.model'
import { SupplierNav } from '../../supplier-nav'
import SupplierSummaryCard from '../../supplier-summary-card'
import { SupplierDetails } from '../../supplier-details'

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
          <SupplierNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </aside>

      <main className='md:col-span-4 space-y-6'>
        <SupplierSummaryCard summary={summary} />
        <div>
          {activeTab === 'details' && <SupplierDetails supplier={supplier} />}
          {/* Alte tab-uri vor veni aici */}
        </div>
      </main>
    </div>
  )
}
