import { auth } from '@/auth'
import OverviewReport from './overview-report'

const DashboardPage = async () => {
  const session = await auth()
  if (session?.user.role !== 'Admin')
    throw new Error('Admin permission required')

  return <OverviewReport />
}

export default DashboardPage
