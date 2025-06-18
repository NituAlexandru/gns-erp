import { APP_NAME } from '@/lib/constants'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const currentYear = new Date().getFullYear()
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col items-center min-h-screen highlight-link  '>
      <header className='pb-6 pt-6 bg-gray-800 w-full flex justify-center'>
        <Link href='/'>
          <Image
            src='/icons/logo-light.svg'
            alt='logo'
            width={200}
            height={200}
            priority
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </Link>
      </header>
      <main className='mx-auto max-w-sm min-w-80 p-4'>{children}</main>
      <footer className=' flex-1 mt-2  bg-gray-800 w-full flex flex-col gap-4 items-center p-8 text-sm'>
        <div className='flex justify-center space-x-4'>
          <Link href='/page/termeni-si-conditii' className='hover:underline'>
            Termeni și Condiții
          </Link>
          <Link
            href='/page/politica-de-confidentialitate'
            className='hover:underline'
          >
            Politica de Confidențialitate
          </Link>
          <Link href='/page/ajutor' className='hover:underline'>
            Ajutor
          </Link>
        </div>
        <div>
          <p className='text-gray-400'>
            Copyright © 2015-{currentYear}, SC {APP_NAME} SRL. Toate drepturile
            rezervate.
          </p>
        </div>
      </footer>
    </div>
  )
}
