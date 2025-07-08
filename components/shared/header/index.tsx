import { APP_NAME } from '@/lib/constants'
import Image from 'next/image'
import Link from 'next/link'
import Menu from './menu'
import { MainNav } from './main-nav'
import MobileMainMenuDropdown from './mobile-main-menu'

export default function Header() {
  return (
    <header className='bg-black text-white'>
      <div className='px-2'>
        <div className='flex items-center justify-between'>
          <Link
            href='/'
            className='flex items-center header-button font-extrabold text-2xl m-1'
          >
            <Image
              src='/icons/logo-light.svg'
              width={160}
              height={160}
              alt={`${APP_NAME} logo`}
              priority
            />
          </Link>
          <Menu />
        </div>
      </div>

      {/* Navigația principală */}
      <div className='flex items-center justify-end min-[850px]:justify-start px-3 bg-gray-800 overflow-x-auto'>
        <div className='hidden min-[850px]:flex'>
          <MainNav />
        </div>

        {/* Dropdown pentru Mobil - afișat până la 678px */}
        <div className='min-[850px]:hidden'>
          <MobileMainMenuDropdown />
        </div>
      </div>
    </header>
  )
}
