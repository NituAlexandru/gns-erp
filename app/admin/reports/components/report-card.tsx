'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Layers, BarChart3, FileText, LucideIcon } from 'lucide-react' // Importăm iconițele aici
import { ReportDefinition } from '@/lib/db/modules/reports/reports.types'

const ICON_MAP: Record<string, LucideIcon> = {
  Layers: Layers,
  BarChart3: BarChart3,
  FileText: FileText,
}

interface ReportCardProps {
  report: ReportDefinition
  onSelect: (report: ReportDefinition) => void
}

export function ReportCard({ report, onSelect }: ReportCardProps) {
  const Icon = ICON_MAP[report.icon] || FileText

  return (
    <Card className='flex flex-col h-full hover:shadow-md transition-shadow'>
      <CardHeader>
        <div className='flex items-center gap-3 mb-2'>
          <div className='p-2 bg-primary/10 rounded-lg'>
            <Icon className='h-6 w-6 text-primary' />
          </div>
          <CardTitle className='text-lg'>{report.title}</CardTitle>
        </div>
        <CardDescription>{report.description}</CardDescription>
      </CardHeader>
      <CardContent className='flex-grow'>
        <div className='flex gap-2 flex-wrap'>
          {report.filters.length > 0 ? (
            <span className='text-xs text-muted-foreground bg-muted px-2 py-1 rounded'>
              Necesită filtre
            </span>
          ) : (
            <span className='text-xs text-muted-foreground bg-muted px-2 py-1 rounded'>
              Instant
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onSelect(report)}
          className='w-full'
          variant='outline'
        >
          <Download className='mr-2 h-4 w-4' />
          Configurează & Exportă
        </Button>
      </CardFooter>
    </Card>
  )
}
