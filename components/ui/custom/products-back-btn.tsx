'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

export function ProductsBackBtn({
  defaultHref = '/catalog-produse',
}: {
  defaultHref?: string
}) {
  const router = useRouter()

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(defaultHref)
    }
  }

  return (
    <Button variant='outline' size='sm' onClick={handleClick}>
      <ChevronLeft />
      Înapoi
    </Button>
  )
}
