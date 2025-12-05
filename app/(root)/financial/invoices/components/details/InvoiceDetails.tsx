'use client'

import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import { InvoiceInfoCards } from './InvoiceInfoCards'
import { InvoiceItemsTable } from './InvoiceItemsTable'
import { InvoiceSummary } from './InvoiceSummary'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'

interface InvoiceDetailsProps {
  invoice: PopulatedInvoice
  currentUserRole: string
}

export function InvoiceDetails({
  invoice,
  currentUserRole,
}: InvoiceDetailsProps) {
  const isAdmin = SUPER_ADMIN_ROLES.includes(
    currentUserRole?.toLowerCase() || ''
  )

  return (
    <div className='grid grid-cols-1 2xl:grid-cols-3 gap-2 p-0'>
      {/* COLOANA STÂNGA (2/3) - Detalii bogate */}
      <div className='xl:col-span-2 space-y-1'>
        <InvoiceInfoCards invoice={invoice} />
      </div>
      {/* COLOANA DREAPTA (1/3) - Cardul tău de totaluri + Note */}
      <div className='2xl:col-span-1'>
        <InvoiceSummary invoice={invoice} isAdmin={isAdmin} />
      </div>
      <div className='xl:col-span-3 mt-[-8px]'>
        <InvoiceItemsTable
          items={invoice.items}
          currentUserRole={currentUserRole}
        />
      </div>
    </div>
  )
}
