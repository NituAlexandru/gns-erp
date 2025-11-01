// app/(root)/financial/components/StatCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string
  icon?: React.ReactNode
  onClick?: () => void
}

export function StatCard({ title, value, icon, onClick }: StatCardProps) {
  return (
    <Card
      className='hover:shadow-md transition-shadow cursor-pointer'
      onClick={onClick}
    >
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
      </CardContent>
    </Card>
  )
}
