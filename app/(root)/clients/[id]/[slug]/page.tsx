import { notFound, redirect } from 'next/navigation'
import { getClientById } from '@/lib/db/modules/client/client.actions'
import { getClientSummary } from '@/lib/db/modules/client/summary/client-summary.actions'
import { toSlug } from '@/lib/utils'
import { auth } from '@/auth'
import ClientFileView from './client-file-view'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default async function ClientViewPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'Admin'

  const { id, slug } = await params

  const client = await getClientById(id)
  if (!client) {
    return notFound()
  }

  const summary = await getClientSummary(id)
  if (!summary) {
    throw new Error('Nu s-a putut încărca sumarul pentru acest client.')
  }

  const canonical = toSlug(client.name)
 
  if (slug !== canonical) {

    return redirect(`/clients/${id}/${canonical}`)
  }

  return (
    <div className='px-6 space-y-6'>
      <div className='flex items-center gap-4 mb-5'>
        <Button asChild variant='outline'>
          <Link href='/clients'>
            <ChevronLeft /> Înapoi
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Fișă Client: {client.name}</h1>
      </div>
      <ClientFileView client={client} summary={summary} isAdmin={isAdmin} />
    </div>
  )
}
