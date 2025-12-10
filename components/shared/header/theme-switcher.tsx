'use client'

import { useTheme } from 'next-themes'
import { ChevronDownIcon, Moon, Sun } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import useIsMounted from '@/hooks/use-is-mounted'

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const isMounted = useIsMounted()

  const handleChange = (value: string) => {
    setTheme(value)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='header-button h-[41px]'>
        {isMounted && theme === 'dark' ? (
          <div className='flex items-center gap-1'>
            <Moon className='h-4 w-4' /> Dark <ChevronDownIcon />
          </div>
        ) : (
          <div className='flex items-center gap-1'>
            <Sun className='h-4 w-4' /> Light <ChevronDownIcon />
          </div>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent className='w-44 bg-accent cursor-pointer'>
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={handleChange}>
          <DropdownMenuRadioItem
            className='cursor-pointer hover:bg-accent-foreground hover:text-accent'
            value='light'
          >
            <Sun className='h-4 w-4 mr-1' /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className='cursor-pointer hover:bg-accent-foreground hover:text-accent'
            value='dark'
          >
            <Moon className='h-4 w-4 mr-1' /> Dark
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
