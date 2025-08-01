import { ReceptionForm } from '../reception-form' // Ajustează calea dacă este necesar

export default function CreateReceptionPage() {
  return (
    <div className='container mx-auto py-10'>
      <h1 className='text-3xl font-bold mb-6'>Notă de Recepție Nouă</h1>

      <ReceptionForm />
    </div>
  )
}
