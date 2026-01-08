import { auth } from '@/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOut } from '@/lib/db/modules/user/user.actions'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

export default async function UserButton() {
  const session = await auth()
  return (
    <div className='flex gap-2 items-center'>
      <DropdownMenu>
        <DropdownMenuTrigger className='header-button' asChild>
          <div className='flex items-center'>
            <div className='flex flex-col text-xs text-left'>
              <span>
                Salut, {session ? session.user.name : 'intră în cont'}
              </span>
              <span className='font-bold'>Cont și Comenzi</span>
            </div>
            <ChevronDown />
          </div>
        </DropdownMenuTrigger>

        {session ? (
          <DropdownMenuContent
            className='w-56 bg-white text-black dark:bg-black dark:text-white border shadow-md'
            align='end'
            forceMount
          >
            <DropdownMenuLabel className='font-normal'>
              <div className='flex flex-col space-y-1'>
                <p className='text-sm font-medium leading-none'>
                  {session.user.name}
                </p>
                <p className='text-xs leading-none text-muted-foreground'>
                  {session.user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <Link className='w-full cursor-pointer' href='/account'>
                <DropdownMenuItem>Contul tău</DropdownMenuItem>
              </Link>
              <Link className='w-full cursor-pointer' href='/account/orders'>
                <DropdownMenuItem>Comenzile tale</DropdownMenuItem>
              </Link>

              {(() => {
                const userRole = session.user.role
                // Dacă e super-admin, arată link-ul principal de admin
                if (['Administrator', 'Admin'].includes(userRole)) {
                  return (
                    <Link
                      className='w-full cursor-pointer'
                      href='/admin/overview'
                    >
                      <DropdownMenuItem>Admin</DropdownMenuItem>
                    </Link>
                  )
                }
                // Dacă e manager, arată un link specific pentru el
                if (userRole === 'Manager') {
                  return (
                    <Link
                      className='w-full cursor-pointer'
                      href='admin/management/overview'
                    >
                      <DropdownMenuItem>Management</DropdownMenuItem>
                    </Link>
                  )
                }
                // Pentru orice alt rol, nu afișa nimic
                return null
              })()}
            </DropdownMenuGroup>
            <DropdownMenuItem className='p-0 mb-1'>
              <form action={SignOut} className='w-full'>
                <Button
                  className='w-full py-4 px-2 h-4 justify-start'
                  variant='ghost'
                >
                  Deconectare
                </Button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        ) : (
          <DropdownMenuContent className='w-56' align='end' forceMount>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link
                  className={cn(buttonVariants(), 'w-full')}
                  href='/sign-in'
                >
                  Autentifică-te
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className='font-normal'>
                Client nou? <Link href='/sign-up'>Înregistrează-te</Link>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  )
}
