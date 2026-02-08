import { auth } from '@/auth'
import { getNirById } from '@/lib/db/modules/financial/nir/nir.actions'
import { redirect } from 'next/navigation'
import { NirEditForm } from './nir-edit-form'
import { getVatRates } from '@/lib/db/modules/setting/vat-rate/vatRate.actions'

export default async function EditNirPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/auth/signin')

  const { id } = await params

  // 1. Luăm datele NIR existente
  const nirResult = await getNirById(id)
  if (!nirResult.success || !nirResult.data) {
    return <div>NIR-ul nu a fost găsit sau a apărut o eroare.</div>
  }

  // 2. Luăm cotele TVA (Fix aici)
  const vatRatesResult = await getVatRates()
  const vatRates = vatRatesResult.success ? vatRatesResult.data : []

  // Găsim rata default (acum vatRates este array corect)
  const defaultVat = vatRates.find((v: any) => v.isDefault) || null

  return (
    <div className='p-4 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>
          Editare NIR (Corecție Fiscală)
        </h1>
      </div>

      <div className='bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4'>
        <div className='flex'>
          <div className='ml-3'>
            <p className='text-sm text-yellow-700'>
              <strong>Atenție!</strong> Modificările efectuate aici se aplică
              <strong> EXCLUSIV documentului NIR</strong> (financiar-contabil).
              Stocul din gestiune și documentul de Recepție rămân neschimbate.
            </p>
          </div>
        </div>
      </div>

      <NirEditForm
        initialData={nirResult.data}
        userId={session.user.id!}
        userName={session.user.name!}
        vatRates={vatRates}
        defaultVatRate={defaultVat}
      />
    </div>
  )
}
