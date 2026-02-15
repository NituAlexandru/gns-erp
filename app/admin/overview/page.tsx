import { auth } from '@/auth'
import { AgentOverviewWidget } from './agents/components/AgentOverviewWidget'

const DashboardPage = async () => {
  const session = await auth()

  if (session?.user.role !== 'Admin')
    throw new Error('Admin permission required')

  return (
    <div className='flex flex-col gap-2 p-0'>
      <h1 className='text-3xl font-bold tracking-tight'>Dashboard General</h1>


      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <AgentOverviewWidget />

        {/* Aici poți pune un alt widget în viitor (ex: Top Clienți) */}
        <div className='border rounded-xl p-4 bg-muted/10 border-dashed flex items-center justify-center text-muted-foreground text-sm'>
          Spațiu pentru alt Widget (ex: Top Clienți)
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
