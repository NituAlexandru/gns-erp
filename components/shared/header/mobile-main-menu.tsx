'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react' // 1. Am înlocuit ChevronDown cu Menu
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { links } from './main-nav'

export default function MobileMainMenuDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='header-button flex items-center p-2 text-lg'
        >
          <Menu className='h-6 w-5 mr-1' />
          Meniu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='start'>
        {links.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href} className='w-full'>
              {item.title}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
