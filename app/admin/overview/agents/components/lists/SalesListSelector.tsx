'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { SalesListManager } from './SalesListManager'
import { SalesListViewer } from './SalesListViewer'

interface SalesListSelectorProps {
  isChecked: boolean
  onToggle: (checked: boolean) => void
}

export function SalesListSelector({
  isChecked,
  onToggle,
}: SalesListSelectorProps) {
  return (
    <div className='flex items-center gap-4 p-1.5 rounded-md border border-border/50'>
      <SalesListManager />
      <SalesListViewer />
      <div className='flex items-center gap-2 pr-2'>
        <Switch
          id='manual-mode'
          checked={isChecked}
          onCheckedChange={onToggle}
          className='data-[state=checked]:bg-red-600 scale-90 cursor-pointer'
        />
        <Label
          htmlFor='manual-mode'
          className='text-xs cursor-pointer font-medium whitespace-nowrap'
        >
          Folosește Listele personalizate
        </Label>
      </div>
    </div>
  )
}
