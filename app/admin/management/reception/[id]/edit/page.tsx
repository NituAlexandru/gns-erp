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

  if (reception.status === 'CONFIRMAT') {
    return <div>O recepție confirmată nu mai poate fi modificată.</div>
  }

  return (
    <div>
      <h1 className='text-2xl font-bold mb-4'>Modifică Recepție</h1>
      <ReceptionForm initialData={reception} />
    </div>
  )
}

export default EditReceptionPage
