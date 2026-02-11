import { auth } from '@/auth'
import { NirList } from './components/NirList'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'
import { MANAGEMENT_ROLES } from '@/lib/db/modules/user/user-roles'
import { getNirs } from '@/lib/db/modules/financial/nir/nir.actions'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function NirListPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    q?: string
    status?: string
    startDate?: string
    endDate?: string
  }>
}) {
  const session = await auth()

  const userRole = (session?.user?.role || '').toLowerCase()

  const hasAccess = MANAGEMENT_ROLES.some(
    (role) => role.toLowerCase() === userRole,
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

  const resolvedSearchParams = await searchParams
  const page = Number(resolvedSearchParams.page) || 1

  // Construim filtrele din URL
  const filters = {
    q: resolvedSearchParams.q,
    status: resolvedSearchParams.status,
    startDate: resolvedSearchParams.startDate,
    endDate: resolvedSearchParams.endDate,
  }

  // Cerem datele filtrate direct de la server
  const { data, totalPages, totalSum } = await getNirs(page, filters)

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>
          Note de Intrare Recepție (NIR)
        </h1>
        <Button asChild variant='default'>
          <Link href='/admin/management/reception/nir/create'>
            Adaugă NIR (Manual)
          </Link>
        </Button>
      </div>

      <NirList
        data={data}
        totalPages={totalPages}
        currentPage={page}
        totalSum={totalSum}
      />
    </div>
  )
}
