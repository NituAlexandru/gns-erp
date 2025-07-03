import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import Menu from '@/components/shared/header/menu'
import { AdminNav } from './admin-nav'
import { ManagementNav } from './management/management-nav' // Importăm și navigația pentru manager
import { APP_NAME } from '@/lib/constants'
import { auth } from '@/auth'

const SUPER_ADMIN_ROLES = ['Administrator', 'Admin']

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const userRole = session?.user?.role

  return (
    <>
      <div className='flex flex-col'>
        <div className='bg-black text-white'>
          <div className='flex h-16 items-center px-2'>
            <Link href='/' className=' '>
              <Image
                src='/icons/logo-light.svg'
                width={150}
                height={150}
                alt={`${APP_NAME} logo`}
              />
            </Link>

            {/* afișăm navigația corectă în funcție de rol */}
            <div className='mx-6 hidden md:flex'>
              {userRole && SUPER_ADMIN_ROLES.includes(userRole) ? (
                <AdminNav />
              ) : (
                <ManagementNav />
              )}
            </div>

            <div className='ml-auto flex items-center space-x-4'>
              <Menu forAdmin />
            </div>
          </div>
          <div className='flex md:hidden px-4 pb-2'>
            {/*  La fel și pentru varianta mobilă*/}
            {userRole && SUPER_ADMIN_ROLES.includes(userRole) ? (
              <AdminNav />
            ) : (
              <ManagementNav />
            )}
          </div>
        </div>
        <div className='flex-1 p-4'>{children}</div>
      </div>
    </>
  )
}
