import { ISupplierSummary } from '@/lib/db/modules/suppliers/summary/supplier-summary.model'

interface SupplierSummaryCardProps {
  summary: ISupplierSummary
}

export default function SupplierSummaryCard({
  summary,
}: SupplierSummaryCardProps) {
  return (
    <div className=' p-4 rounded-lg border border-gray-200'>
      <h2 className='text-lg font-semibold mb-4 '>Sumar Furnizor</h2>

      <div className='flex flex-col md:flex-row gap-4 w-full'>
        <div className='flex-1  p-4 rounded-lg shadow-sm border'>
          <p className='text-sm font-medium text-gray-500'>Sold de Plată</p>
          <p className='text-2xl font-bold text-blue-600 mt-1'>
            {summary.paymentBalance.toFixed(2)} RON
          </p>
          <p className='text-xs text-gray-400 mt-1'>
            Scadent depășit: {summary.overduePaymentBalance.toFixed(2)} RON
          </p>
        </div>

        <div className='flex-1  p-4 rounded-lg shadow-sm border'>
          <p className='text-sm font-medium text-gray-500'>Total Achiziții</p>
          <p className='text-2xl font-bold  mt-1'>
            {summary.totalPurchaseValue.toFixed(2)} RON
          </p>
          <p className='text-xs text-gray-400 mt-1'>Valoare totală cumpărată</p>
        </div>
      </div>
    </div>
  )
}
