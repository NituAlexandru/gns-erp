export default function ManagementOverviewPage() {
  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Dashboard Management</h1>
      <p className='text-muted-foreground'>
        Bun venit în panoul de management. Aici vei găsi statistici și
        scurtături către cele mai importante secțiuni.
      </p>

      {/* Exemplu de carduri cu statistici */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <div className='border rounded-lg p-4'>
          <h3 className='text-sm font-medium text-muted-foreground'>
            Furnizori Activi
          </h3>
          <p className='text-2xl font-bold'>12</p>
        </div>
        <div className='border rounded-lg p-4'>
          <h3 className='text-sm font-medium text-muted-foreground'>
            Comenzi în Așteptare
          </h3>
          <p className='text-2xl font-bold'>5</p>
        </div>
        {/* Poți adăuga mai multe carduri aici */}
      </div>
    </div>
  )
}
