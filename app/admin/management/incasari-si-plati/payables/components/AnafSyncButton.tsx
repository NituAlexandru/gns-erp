'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { syncAndProcessAnaf } from '@/lib/db/modules/setting/efactura/anaf.actions'

export function AnafSyncButton() {
  const [isPending, startTransition] = useTransition()

  const handleSync = () => {
    toast.info('Se inițiază sincronizarea cu SPV...')

    startTransition(async () => {
      const result = await syncAndProcessAnaf()

      if (result.success) {
        const { newMessages, processed, errors } = result.stats || {
          newMessages: 0,
          processed: 0,
          errors: 0,
        }

        if (errors > 0) {
          toast.warning(`Sincronizare cu erori: ${errors} probleme.`, {
            description: `${newMessages} mesaje noi, ${processed} importate corect.`,
          })
        } else if (newMessages === 0) {
          toast.info('Nu există mesaje noi în SPV.')
        } else {
          toast.success('Sincronizare reușită!', {
            description: `${processed} facturi importate automat.`,
          })
        }
      } else {
        toast.error('Eroare la sincronizare', { description: result.error })
      }
    })
  }

  return (
    <Button
      variant='outline'
      onClick={handleSync}
      disabled={isPending}
      className='gap-2'
    >
      {isPending ? (
        <Loader2 className='h-4 w-4 animate-spin' />
      ) : (
        <RefreshCw className='h-4 w-4' />
      )}
      {isPending ? 'Se sincronizează...' : 'Sincronizează ANAF'}
    </Button>
  )
}
