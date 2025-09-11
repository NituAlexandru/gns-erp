'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function BackButton() {
  const router = useRouter()
  return (
    <Button variant='outline' onClick={() => router.back()}>
      <ArrowLeft className='mr-2 h-4 w-4' />
      Înapoi la Stocuri
    </Button>
  )
}
