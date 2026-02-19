import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export type InvoiceItem = PopulatedInvoice['items'][number]

export function getSmartDescription(
  item: InvoiceItem,
): { val: number; unit: string }[] | null {
  if (!item.packagingOptions || item.packagingOptions.length === 0) return null

  const currentUom = item.unitOfMeasure.toLowerCase()
  const selectedOption = item.packagingOptions.find(
    (opt) => opt.unitName.toLowerCase() === currentUom,
  )
  const currentFactor = selectedOption ? selectedOption.baseUnitEquivalent : 1

  const baseQty = item.quantity * currentFactor
  const baseUnit = (item.baseUnit || 'bucata').toLowerCase()
  const equivalents: { val: number; unit: string }[] = []

  if (baseUnit !== currentUom) {
    equivalents.push({ val: Number(baseQty.toFixed(3)), unit: baseUnit })
  }

  item.packagingOptions.forEach((opt) => {
    const optUnit = opt.unitName.toLowerCase()

    if (
      optUnit !== currentUom &&
      optUnit !== baseUnit &&
      opt.baseUnitEquivalent > 0
    ) {
      const qtyInThisOpt = baseQty / opt.baseUnitEquivalent
      equivalents.push({ val: Number(qtyInThisOpt.toFixed(3)), unit: optUnit })
    }
  })

  if (equivalents.length === 0) return null

  return equivalents
}

// --- LOGIC: Tax Breakdown ---
export function getTaxBreakdown(items: PopulatedInvoice['items']) {
  const breakdown: Record<number, { base: number; vat: number; name: string }> =
    {}

  items.forEach((item) => {
    const rate = item.vatRateDetails.rate
    if (!breakdown[rate]) {
      breakdown[rate] = { base: 0, vat: 0, name: `TVA ${rate}%` }
    }
    breakdown[rate].base += item.lineValue
    breakdown[rate].vat += item.vatRateDetails.value
  })

  return Object.entries(breakdown).sort(([a], [b]) => Number(b) - Number(a))
}

// --- UI COMPONENTS ---
export const DetailRow = ({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: LucideIcon
  label: string
  value: React.ReactNode
  className?: string
}) => (
  <div className={cn('flex items-center gap-2 text-sm', className)}>
    {Icon && <Icon className='h-4 w-4 text-muted-foreground mt-0.5 shrink-0' />}
    <div className='flex gap-2 items-center w-full'>
      <span className='text-muted-foreground font-semibold tracking-wide'>
        {label}
      </span>
      <div className='font-medium text-sm break-words leading-tight'>
        {value || '-'}
      </div>
    </div>
  </div>
)

export const TotalRow = ({
  label,
  value,
  className,
}: {
  label: string
  value: string | number
  className?: string
}) => (
  <div className={cn('flex items-center justify-between text-sm', className)}>
    <span className='text-muted-foreground'>{label}</span>
    <span className='font-medium'>{value}</span>
  </div>
)
