'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { refreshAllOutgoingStatuses } from '@/lib/db/modules/setting/efactura/outgoing/outgoing.actions'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface RefreshAnafButtonProps {
  onLoadingChange?: (isLoading: boolean) => void
}

export function RefreshAnafButton({ onLoadingChange }: RefreshAnafButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRefreshAll = async () => {
    if (isLoading) return

    // START
    setIsLoading(true)
    if (onLoadingChange) onLoadingChange(true)

    toast.info('Se verifică statusurile la ANAF...')

    try {
      const result = await refreshAllOutgoingStatuses()

      if (result.success) {
        toast.success('Actualizare terminată', { description: result.message })
        router.refresh()
      } else {
        toast.error('Eroare actualizare', { description: result.message })
      }
    } catch (err) {
      toast.error('Eroare neașteptată', { description: String(err) })
    } finally {
      setIsLoading(false)
      if (onLoadingChange) onLoadingChange(false)
    }
  }

  return (
    <Button
      variant='outline'
      onClick={handleRefreshAll}
      disabled={isLoading}
      className='gap-2'
    >
      <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
      <span>Actualizează ANAF</span>
    </Button>
  )
}
