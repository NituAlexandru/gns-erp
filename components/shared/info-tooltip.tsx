'use client'

import { ReactNode } from 'react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  content: ReactNode
}

export function InfoTooltip({ content }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className='text-3xl inline-block w-4 h-5 cursor-pointer' />
      </TooltipTrigger>
      <TooltipContent side='top' className='w-full bg-gray-700 text-white'>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
