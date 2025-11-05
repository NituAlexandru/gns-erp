'use client'

import { useSession } from 'next-auth/react'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { formatCurrency, cn } from '@/lib/utils'
import {
  getMarginColorClass,
  getProfitColorClass,
} from '@/lib/db/modules/financial/invoices/invoice.utils'

interface LineProfitDisplayProps {
  cost: number
  profit: number
  margin: number
}

export function LineProfitDisplay({
  cost,
  profit,
  margin,
}: LineProfitDisplayProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase()) // Folosim .toLowerCase() pentru siguranță

  if (!isAdmin) {
    return null // Nu afișăm nimic dacă nu e admin
  }

  const profitColor = getProfitColorClass(profit)
  const marginColor = getMarginColorClass(margin)

  return (
    <div className='flex items-center gap-2 text-xs mt-1 border-t pt-1 border-dashed'>
      <span className='text-muted-foreground'>Cost:</span>
      <span className='font-medium text-destructive'>
        {formatCurrency(cost)}
      </span>
      <span className='text-muted-foreground'>|</span>
      <span className='text-muted-foreground'>Profit:</span>
      <span className={cn('font-medium', profitColor)}>
        {formatCurrency(profit)}
      </span>
      <span className={cn('font-medium text-xs', marginColor)}>
        ({margin}%)
      </span>
    </div>
  )
}
