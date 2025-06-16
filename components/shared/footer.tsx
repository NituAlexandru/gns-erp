'use client'

import { APP_NAME } from '@/lib/constants'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className='bg-black text-white'>
      <div className='border-t border-gray-700 mt-1 flex'>
        <div className='max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-1'>
          <div className='flex justify-center text-sm'>
            <p>
              Copyright © 2015-{currentYear}, {APP_NAME}. Toate drepturile
              rezervate.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
