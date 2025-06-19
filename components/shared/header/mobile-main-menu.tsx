'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Tipul MenuItem
interface MenuItem {
  name: string
  href: string
  isSpecial?: boolean
}

// Props: primește doar menuItems
interface MobileMainMenuDropdownProps {
  menuItems: MenuItem[]
}

export default function MobileMainMenuDropdown({
  menuItems,
}: MobileMainMenuDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Butonul care deschide dropdown-ul */}
        <Button
          variant='ghost'
          className='header-button flex items-center p-2 text-lg'
        >
          <ChevronDown className='h-6 w-5 mr-1' />
          Meniu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='start'>
        {menuItems.map((menu) => (
          <DropdownMenuItem key={menu.href} asChild>
            <Link href={menu.href} className='w-full cursor-pointer'>
              {menu.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
