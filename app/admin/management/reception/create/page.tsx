import { auth } from '@/auth'
import { ReceptionForm } from '../reception-form'

export default async function CreateReceptionPage() {
  const session = await auth()
  const currentUserId = session?.user?.id

  if (!currentUserId) {
    return <div>Eroare: Utilizator neautentificat. Vă rugăm să vă logați.</div>
  }

  return (
    <div className='container mx-auto py-10'>
      <h1 className='text-3xl font-bold mb-6'>Notă de Recepție Nouă</h1>
      <div className='text-sm mb-2 text-muted-foreground px-4 py-2 bg-muted/50 rounded-lg flex items-center gap-4'>
        <span className='font-semibold'>
          <span className='text-foreground'>*</span> Obligatoriu pentru Salvare
          Ciornă
        </span>
        <span className='font-semibold'>
          <span className='text-red-500'>*</span> Obligatoriu pentru Salvare și
          Finalizare
        </span>
      </div>
      <ReceptionForm currentUserId={currentUserId} />
    </div>
  )
}
