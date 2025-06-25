'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export default function ErrorPage({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const router = useRouter()

  return (
    <div
      className='relative w-screen h-screen overflow-hidden'
      style={{ backgroundColor: '#fdf7ec' }}
    >
      <Image
        src='/images/error.webp'
        alt='Error'
        fill
        priority
        className='object-contain'
        sizes='100vw'
      />

      <div className='absolute inset-0 flex flex-col items-center justify-center z-10 px-4 sm:px-0'>
        <div className='text-center sm:mt-0'>
          <h2 className='text-3xl font-bold mb-2 hidden'>Pagina de eroare</h2>
          <p className='text-destructive mb-4 text-sm sm:text-base'>
            O eroare neașteptată a avut loc. Te rugăm să încerci din nou mai
            târziu.
          </p>
          <div className='flex justify-center gap-4 flex-wrap'>
            <Button variant='outline' size='lg' onClick={() => reset()}>
              Încearcă din nou
            </Button>
            <Button
              variant='outline'
              size='lg'
              onClick={() => router.push('/')}
              className='cursor-pointer'
            >
              Înapoi la pagina principală
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
