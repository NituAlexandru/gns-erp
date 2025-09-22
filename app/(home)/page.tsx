export default function HomePage() {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-2 py-3'>
      {/* --- COLOANA 1 (Livrări) --- */}
      <div
        style={{ height: 'calc(100vh - 180px)' }}
        className='flex flex-col py-3 overflow-auto p-4 rounded-lg shadow-sm border'
      >
        <h1 className='text-3xl font-bold mb-6'>
          Livrari{' '}
          <span className='text-sm text-muted-foreground cursor-pointer'>
            Vezi toate livrarile
          </span>
        </h1>
        <div className='text-sm'>
          <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie 4{' '}
          Aici va fi lista cu livrările... (adaugă mai mult conținut aici pentru
          a testa scroll-ul)
          <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie 4{' '}
          Aici va fi lista cu livrările... (adaugă mai mult conținut aici pentru
          a testa scroll-ul)
          <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie 4{' '}
          Aici va fi lista cu livrările... (adaugă mai mult conținut aici pentru
          a testa scroll-ul)
          <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie 4{' '}
          Aici va fi lista cu livrările... (adaugă mai mult conținut aici pentru
          a testa scroll-ul)
          <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie 4{' '}
          Aici va fi lista cu livrările... (adaugă mai mult conținut aici pentru
          a testa scroll-ul)
          <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie 4{' '}
          Aici va fi lista cu livrările... (adaugă mai mult conținut aici pentru
          a testa scroll-ul)
          <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie 4{' '}
          Aici va fi lista cu livrările... (adaugă mai mult conținut aici pentru
          a testa scroll-ul)
          <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie 4{' '}
          Aici va fi lista cu livrările... (adaugă mai mult conținut aici pentru
          a testa scroll-ul)
          <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie
          4{' '}
        </div>
      </div>

      {/* --- COLOANA 2 (Comenzi) --- */}
      <div className='flex' style={{ height: 'calc(100vh - 180px)' }}>
        <div className='overflow-y-auto  p-4 rounded-lg shadow-sm border'>
          <h1 className='text-3xl font-bold mb-6'>Comenzi</h1>
          <p className='text-sm'>
            Aici va fi lista cu livrările... (adaugă mai mult conținut aici
            pentru a testa scroll-ul)
            <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie
            4{' '}
          </p>{' '}
          <p className='text-sm'>
            Aici va fi lista cu livrările... (adaugă mai mult conținut aici
            pentru a testa scroll-ul)
            <br /> <br /> Linie 1 <br /> Linie 2 <br /> Linie 3 <br /> Linie
            4{' '}
          </p>
        </div>
      </div>
      {/* --- COLOANA 3 (Notificări) --- */}
      <div className='flex flex-col space-y-4  h-full'>
        <div className='flex-grow p-4 rounded-lg shadow-sm border'>
          <h2 className='font-semibold text-lg'>Notificări</h2>
          <p className='text-sm mt-2'>
            Aici vor fi diverse notificări sau alerte.
          </p>
        </div>
        <div className='flex-grow p-4 rounded-lg shadow-sm border'>
          <h2 className='font-semibold text-lg'>Solduri clienti</h2>
          <p className='text-sm mt-2'>
            Aici vor fi butoane pentru acțiuni rapide.
          </p>
        </div>
        <div className='flex-grow p-4 rounded-lg shadow-sm border'>
          <h2 className='font-semibold text-lg'>Clienti Blocati Livrari</h2>
          <p className='text-sm mt-2'>
            Aici vor fi butoane pentru acțiuni rapide.
          </p>
        </div>
      </div>
    </div>
  )
}
