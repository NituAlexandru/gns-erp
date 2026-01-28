import { formatCurrency } from '@/lib/utils'

interface ReceivablesStatsLineProps {
  label: string
  amount: number
  type: 'invoice' | 'receipt'
}

export function ReceivablesStatsLine({
  label,
  amount,
  type,
}: ReceivablesStatsLineProps) {

  const colorClass = type === 'invoice' ? 'text-red-500' : 'text-green-500'

  return (
    <div className='flex items-center px-1 py-2'>
      <span className='text-sm font-bold text-muted-foreground uppercase mr-2'>
        {label}:
      </span>
      <span className={`text-base font-bold ${colorClass}`}>
        {formatCurrency(amount)}
      </span>
    </div>
  )
}
