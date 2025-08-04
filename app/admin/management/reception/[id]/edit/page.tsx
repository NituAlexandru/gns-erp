import { getReceptionById } from '@/lib/db/modules/reception/reception.actions'
import { ReceptionForm } from '../../reception-form'

const EditReceptionPage = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params

  const reception = await getReceptionById(id)

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
      <ReceptionForm initialData={reception} />
    </div>
  )
}

export default EditReceptionPage
