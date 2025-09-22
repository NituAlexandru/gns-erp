import { IClientSummary } from '@/lib/db/modules/client/summary/client-summary.model'

interface ClientSummaryCardProps {
  summary: IClientSummary
}

export default function ClientSummaryCard({ summary }: ClientSummaryCardProps) {
  return (
    // Containerul exterior cu stiluri de bază
    <div className=' p-4 rounded-lg border border-gray-200'>
      <h2 className='text-lg font-semibold mb-4 '>Sumar Financiar</h2>

      {/* Containerul principal - un flexbox responsive */}
      <div className='flex flex-col md:flex-row gap-4 w-full'>
        {/* 1. Sold Restant */}
        <div className='flex-1  p-4 rounded-lg shadow-sm border'>
          <p className='text-sm font-medium text-gray-500'>Sold Restant</p>
          <p className='text-2xl font-bold text-red-600 mt-1'>
            {summary.outstandingBalance.toFixed(2)} RON
          </p>
          <p className='text-xs text-gray-400 mt-1'>
            Scadent depășit: {summary.overdueBalance.toFixed(2)} RON
          </p>
        </div>

        {/* 2. Plafon Credit */}
        <div className='flex-1 p-4 rounded-lg shadow-sm border'>
          <p className='text-sm font-medium text-gray-500'>Plafon Credit</p>
          <p className='text-2xl font-bold  mt-1'>
            {summary.creditLimit.toFixed(2)} RON
          </p>
          <p className='text-xs text-gray-400 mt-1'>
            Disponibil: {summary.availableCredit.toFixed(2)} RON
          </p>
        </div>

        {/* 3. Status Client */}
        <div className='flex-1 p-4 rounded-lg shadow-sm border'>
          <p className='text-sm font-medium text-gray-500'>Status</p>
          <p
            className={`text-2xl font-bold mt-1 ${summary.isBlocked ? 'text-yellow-500' : 'text-green-600'}`}
          >
            {summary.isBlocked ? 'Blocat' : 'Activ'}
          </p>
          {/* Poți adăuga un desc aici dacă e necesar */}
          <p className='text-xs text-gray-400 mt-1'>&nbsp;</p>
        </div>
      </div>
    </div>
  )
}
