'use client'

import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className='relative w-screen h-screen bg-gray-50 overflow-hidden'>
      <Image
        src='/images/404.webp'
        alt='404 Page Not Found'
        fill
        priority
        className='object-contain'
        sizes='100vw'
      />
      <div className='absolute top-1/2 left-1/2 z-10 transform -translate-x-1/2 -translate-y-1/2 text-center'>
        <Button
          size='lg'
          onClick={() => router.push('/')}
          className='cursor-pointer'
        >
          Înapoi la pagina principală
        </Button>
      </div>
    </div>
  )
}
