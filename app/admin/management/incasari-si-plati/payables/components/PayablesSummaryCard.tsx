import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PayablesSummaryCardProps {
  label: string
  amount: number
  type?: 'invoice' | 'payment'
}

export function PayablesSummaryCard({
  label,
  amount,
}: PayablesSummaryCardProps) {
  const isNegative = amount < 0

  return (
    <div className='flex items-center gap-2 px-2 py-2 rounded-md border bg-muted/20 w-fit text-sm shadow-sm mb-1 mt-1 '>
      <span className='text-muted-foreground font-medium text-xs uppercase tracking-wide'>
        {label}:
      </span>
      <span
        className={cn(
          'font-bold font-mono',
          isNegative ? 'text-red-600' : 'text-foreground',
        )}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  )
}
