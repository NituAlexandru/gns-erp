import { EllipsisVertical } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import UserButton from './user-button'
import ThemeSwitcher from './theme-switcher'

export default function Menu({ forAdmin = false }: { forAdmin?: boolean }) {
  return (
    <div className='flex justify-end'>
      <nav className='hidden md:flex gap-3  w-full'>
        <ThemeSwitcher />
        {forAdmin ? null : <UserButton />}
      </nav>
      <nav className='md:hidden'>
        <Sheet>
          <SheetTrigger className='align-middle header-button'>
            <EllipsisVertical className='h-6 w-6' />
          </SheetTrigger>
          <SheetContent className='  flex flex-col items-start  '>
            <SheetHeader className='w-full'>
              <div className='flex items-center justify-between '>
                <SheetTitle>Site Menu</SheetTitle>
                <SheetDescription></SheetDescription>
              </div>
            </SheetHeader>
            <ThemeSwitcher />
            <UserButton />
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  )
}
