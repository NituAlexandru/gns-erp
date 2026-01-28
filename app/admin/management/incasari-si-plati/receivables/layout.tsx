import { ReactNode } from 'react'
import { ReceivablesLayoutClient } from './components/ReceivablesLayoutClient'
import { getReceivablesCounts } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'

export default async function ReceivablesLayout({
  children,
}: {
  children: ReactNode
}) {
  const counts = await getReceivablesCounts()

  return (
    <ReceivablesLayoutClient counts={counts}>
      {children}
    </ReceivablesLayoutClient>
  )
}
