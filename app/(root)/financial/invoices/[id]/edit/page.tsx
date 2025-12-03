// app/(root)/financial/invoices/[id]/edit/page.tsx
import { getSetting } from '@/lib/db/modules/setting/setting.actions'
import { InvoiceForm } from '../../components/InvoiceForm'
import { getActiveSeriesForDocumentType } from '@/lib/db/modules/numbering/numbering.actions'
import { SeriesDTO } from '@/lib/db/modules/numbering/types'
import { getVatRates } from '@/lib/db/modules/setting/vat-rate/vatRate.actions'
import { getActiveServices } from '@/lib/db/modules/setting/services/service.actions'
import { getInvoiceById } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { redirect } from 'next/navigation'
import { InvoiceInput } from '@/lib/db/modules/financial/invoices/invoice.types'

interface InvoiceEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditInvoicePage({
  params: paramsPromise,
}: InvoiceEditPageProps) {
  const params = await paramsPromise
  // 1. Preluăm datele facturii existente
  const invoiceResult = await getInvoiceById(params.id)

  if (!invoiceResult.success || !invoiceResult.data) {
    // TODO: Afișează un toast de eroare? Momentan facem redirect.
    console.error(invoiceResult.message)
    return redirect('/financial/invoices')
  }

  const invoiceData = invoiceResult.data

  // 2. Protecție: Nu permitem editarea dacă nu e 'CREATED' sau 'REJECTED'
  if (invoiceData.status !== 'CREATED' && invoiceData.status !== 'REJECTED') {
    return (
      <div className='text-destructive-foreground bg-destructive p-4 rounded-md'>
        Eroare: Facturile cu statusul {invoiceData.status} nu pot fi modificate.
      </div>
    )
  }

  // 3. Preluăm restul setărilor necesare pentru formular
  const companySettings = await getSetting()
  if (!companySettings) {
    return (
      <div className='text-destructive-foreground bg-destructive p-4 rounded-md'>
        Eroare: Setările companiei nu sunt configurate.
      </div>
    )
  }

  const invoiceSeries = (await getActiveSeriesForDocumentType(
    'Factura' as unknown as DocumentType
  )) as SeriesDTO[]

  const vatRatesResult = await getVatRates()
  const vatRates = vatRatesResult.data || []
  const servicesResult = await getActiveServices('Serviciu')

  // Convertim datele înapoi în obiecte Date pentru formular
  const initialData = {
    ...invoiceData,
    clientId: invoiceData.clientId._id.toString(),
    salesAgentId: invoiceData.salesAgentId._id.toString(),
    vatCategory: invoiceData.vatCategory || 'S',
    invoiceDate: new Date(invoiceData.invoiceDate),
    dueDate: new Date(invoiceData.dueDate),
    // Asigurăm că `items` conțin obiecte Date (dacă e cazul, ex: costBreakdown)
    items: invoiceData.items.map((item) => ({
      ...item,
      costBreakdown: (item.costBreakdown || []).map((cb) => ({
        ...cb,
        entryDate: new Date(cb.entryDate),
      })),
    })),
  }

  return (
    <div className='flex flex-col gap-2'>
      <h1 className='text-2xl font-bold tracking-tight'>
        Modifică Factura {invoiceData.seriesName}-{invoiceData.invoiceNumber}
      </h1>

      <InvoiceForm
        initialData={initialData as unknown as Partial<InvoiceInput>}
        seriesList={invoiceSeries}
        companySettings={companySettings}
        vatRates={vatRates}
        services={servicesResult}
      />
    </div>
  )
}
