// app/(root)/financial/invoices/[id]/page.tsx
import { getInvoiceById } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { InvoiceDetailsActions } from '../components/details/InvoiceDetailsActions'
import { InvoiceDetails } from '../components/details/InvoiceDetails'

interface InvoiceDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function InvoiceDetailsPage({
  params: paramsPromise,
}: InvoiceDetailsPageProps) {
  const params = await paramsPromise

  const invoiceResult = await getInvoiceById(params.id)

  if (!invoiceResult.success || !invoiceResult.data) {
    console.error(invoiceResult.message)
    return redirect('/financial/invoices')
  }

  const invoice = invoiceResult.data

  // 2. Verificăm rolul utilizatorului
  const session = await auth()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())

  return (
    <div className='flex flex-col gap-4'>
      <InvoiceDetailsActions invoice={invoice} isAdmin={isAdmin} />

      {/* Componenta care afișează detaliile facturii */}
      <InvoiceDetails invoice={invoice} isAdmin={isAdmin} />
    </div>
  )
}
