import { auth } from '@/auth'
import { NirList } from './components/NirList'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'
import { MANAGEMENT_ROLES } from '@/lib/db/modules/user/user-roles'
import { getNirs } from '@/lib/db/modules/financial/nir/nir.actions'

export default async function NirListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()

  const userRole = (session?.user?.role || '').toLowerCase()

  const hasAccess = MANAGEMENT_ROLES.some(
    (role) => role.toLowerCase() === userRole
  )

  // 1. SECURITATE
  if (!hasAccess) {
    return (
      <div className='flex justify-center items-center h-[60vh]'>
        <Card className='border-destructive/50 max-w-md shadow-lg'>
          <CardContent className='flex flex-col items-center justify-center p-8 text-center gap-4'>
            <div className='bg-destructive/10 p-4 rounded-full'>
              <ShieldAlert className='h-10 w-10 text-destructive' />
            </div>
            <h1 className='text-xl font-bold text-foreground'>
              Acces Restricționat
            </h1>
            <p className='text-muted-foreground'>
              Nu aveți permisiunea de a vizualiza documentele de intrare (NIR).
              Această secțiune este dedicată administratorilor și managerilor.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 2. Fetch Data
  const resolvedSearchParams = await searchParams
  const page = Number(resolvedSearchParams.page) || 1
  const initialData = await getNirs(page)

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>
          Note de Intrare Recepție (NIR)
        </h1>
      </div>

      <NirList initialData={initialData} currentPage={page} />
    </div>
  )
}
