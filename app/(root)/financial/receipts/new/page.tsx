import { CreateReceiptForm } from '../components/CreateReceiptForm'

export default function NewReceiptPage() {
  return (
    <div className=' py-2'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold '>Emitere Chitanță</h1>
        <p className='text-muted-foreground'>
          Completează formularul pentru a emite o nouă chitanță de încasare.
        </p>
      </div>

      <CreateReceiptForm />
    </div>
  )
}
