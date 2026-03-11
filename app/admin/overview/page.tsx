import { auth } from '@/auth'
import { AgentOverviewWidget } from './agents/components/AgentOverviewWidget'
import { SalesOverviewWidget } from './sales/components/SalesOverviewWidget'

const DashboardPage = async () => {
  const session = await auth()

  if (session?.user.role !== 'Admin')
    throw new Error('Admin permission required')

  return (
    <div className='flex flex-col gap-2 p-0'>
      <h1 className='text-3xl font-bold tracking-tight'>Dashboard General</h1>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
        <AgentOverviewWidget />

        <SalesOverviewWidget />
      </div>
    </div>
  )
}

export default DashboardPage
