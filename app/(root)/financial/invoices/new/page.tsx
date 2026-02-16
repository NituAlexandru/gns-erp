import { getSetting } from '@/lib/db/modules/setting/setting.actions'
import { InvoiceForm } from '../components/InvoiceForm'
import { getActiveSeriesForDocumentType } from '@/lib/db/modules/numbering/numbering.actions'
import { SeriesDTO } from '@/lib/db/modules/numbering/types'
import { getVatRates } from '@/lib/db/modules/setting/vat-rate/vatRate.actions'
import { getActiveServices } from '@/lib/db/modules/setting/services/service.actions'
import { connectToDatabase } from '@/lib/db'
import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'

export default async function NewInvoicePage() {
  await connectToDatabase()
  const session = await auth()

  const userRole = session?.user?.role || 'user'
  const userId = session?.user?.id
  // ID-ul Monicăi (Udateanu Ionela Monica)
  const SPECIAL_USER_ID = '695f50ad9dfaf202582254ee'
  const isAdmin = SUPER_ADMIN_ROLES.map((r) => r.toLowerCase()).includes(
    userRole.toLowerCase(),
  )
  const canOverridePrice = isAdmin || userId === SPECIAL_USER_ID

  const companySettings = await getSetting()

  if (!companySettings) {
    return (
      <div className='text-destructive-foreground bg-destructive p-4 rounded-md'>
        Eroare: Setările companiei nu sunt configurate. Vă rugăm să configurați
        datele companiei în meniul de Setări înainte de a crea o factură.
      </div>
    )
  }

  const invoiceSeries = JSON.parse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JSON.stringify(await getActiveSeriesForDocumentType('Factura' as any)),
  ) as SeriesDTO[]

  const vatRatesResult = await getVatRates()
  const vatRates = JSON.parse(
    JSON.stringify(vatRatesResult.data || []),
  ) as typeof vatRatesResult.data
  const servicesResult = JSON.parse(
    JSON.stringify(await getActiveServices('Serviciu')),
  )

  return (
    <div className='flex flex-col gap-2'>
      <h1 className='text-2xl font-bold tracking-tight'>Factură Nouă</h1>

      <InvoiceForm
        isAdmin={canOverridePrice}
        initialData={null}
        seriesList={invoiceSeries}
        companySettings={companySettings}
        vatRates={vatRates}
        services={servicesResult}
      />
    </div>
  )
}
