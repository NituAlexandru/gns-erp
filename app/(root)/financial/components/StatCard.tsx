import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon?: React.ReactNode
  onClick?: () => void
  description?: string
  infoText?: string
}

export function StatCard({
  title,
  value,
  icon,
  description,
  infoText,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <div className='flex items-center gap-2'>
          <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        </div>
        {icon} {/* 2. Logica de afișare a iconiței Info */}
        {infoText && (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Info className='h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors' />
              </TooltipTrigger>
              <TooltipContent className='max-w-[250px] bg-slate-900 text-white text-xs p-2'>
                <p>{infoText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        {description && (
          <p className='text-xs text-muted-foreground'>{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
