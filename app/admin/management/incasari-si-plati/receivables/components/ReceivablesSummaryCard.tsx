import { formatCurrency, cn } from '@/lib/utils'

interface ReceivablesSummaryCardProps {
  label: string
  amount: number
  type: 'invoice' | 'receipt'
}

export function ReceivablesSummaryCard({
  label,
  amount,
  type,
}: ReceivablesSummaryCardProps) {
  const colorClass = type === 'invoice' ? 'text-red-600' : 'text-green-600'

  return (
    <div className='flex items-center gap-2 px-2 py-2 rounded-md border bg-muted/20 w-fit text-sm shadow-sm mb-1 mt-1'>
      <span className='text-muted-foreground font-medium text-xs uppercase tracking-wide'>
        {label}:
      </span>
      <span className={cn('font-bold font-mono', colorClass)}>
        {formatCurrency(amount)}
      </span>
    </div>
  )
}
