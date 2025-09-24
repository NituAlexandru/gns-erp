import { getReceptionById } from '@/lib/db/modules/reception/reception.actions'
import { ReceptionForm } from '../../reception-form'
import { auth } from '@/auth'
import {
  getDefaultVatRate,
  getVatRates,
} from '@/lib/db/modules/setting/vat-rate/vatRate.actions'

const EditReceptionPage = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params
  const reception = await getReceptionById(id)
  const session = await auth()
  const currentUserId = session?.user?.id
  const vatRatesResult = await getVatRates()
  const defaultVatRateResult = await getDefaultVatRate()
  const vatRates = vatRatesResult.success ? vatRatesResult.data || [] : []
  const defaultVatRate = defaultVatRateResult.success
    ? defaultVatRateResult.data
    : null

  if (!currentUserId) {
    return <div>Eroare: Utilizator neautentificat. Vă rugăm să vă logați.</div>
  }

  if (!reception) {
    return <div>Recepție negăsită.</div>
  }

  return (
    <div>
      <div className='flex justify-between'>
        <h1 className='text-2xl font-bold'>Modifică Recepție</h1>{' '}
        <div className='text-sm mb-2 text-muted-foreground px-4 py-2 bg-muted/50 rounded-lg flex items-center gap-4'>
          <span className='font-semibold'>
            <span className='text-foreground'>*</span> Obligatoriu pentru
            Salvare Ciornă
          </span>
          <span className='font-semibold'>
            <span className='text-red-500'>*</span> Obligatoriu pentru Salvare
            și Finalizare
          </span>
        </div>
      </div>
      <ReceptionForm
        initialData={reception}
        currentUserId={currentUserId}
        vatRates={JSON.parse(JSON.stringify(vatRates))}
        defaultVatRate={JSON.parse(JSON.stringify(defaultVatRate))}
      />
    </div>
  )
}

export default EditReceptionPage
