import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { NirForm } from '../components/nir-form'
import { getVatRates } from '@/lib/db/modules/setting/vat-rate/vatRate.actions'
import { getNextNirNumberSuggestion } from '@/lib/db/modules/financial/nir/nir.actions'

export default async function CreateNirPage() {
  const session = await auth()
  if (!session) redirect('/auth/signin')

  // 1. Luăm cotele TVA din baza de date
  const vatRatesResult = await getVatRates()
  const vatRates = vatRatesResult.success ? vatRatesResult.data : []
  const defaultVat = vatRates.find((v: any) => v.isDefault) || null

  const nextNumberData = await getNextNirNumberSuggestion()
  const nextNumber = nextNumberData?.number || ''

  return (
    <div className='p-0 space-y-1'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>Creare NIR Nou</h1>
      </div>

      <div className='bg-orange-50 border-l-4 border-orange-400 p-4 mb-4'>
        <div className='flex'>
          <div className='ml-3'>
            <p className='text-sm text-orange-700'>
              Poți crea un NIR manual (de la zero) sau poți importa datele din
              una sau mai multe <strong>Recepții Confirmate</strong> folosind
              butonul din dreapta-sus.
            </p>
          </div>
        </div>
      </div>

      {/* Randam formularul gol pentru creare */}
      <NirForm
        userId={session.user.id!}
        userName={session.user.name!}
        vatRates={vatRates}
        defaultVatRate={defaultVat}
        suggestedNirNumber={nextNumber}
      />
    </div>
  )
}
