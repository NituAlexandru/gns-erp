import SettingForm from './setting-form'
import SettingNav from './setting-nav'

import { Metadata } from 'next'
import { auth } from '@/auth'
import { getNoCachedSetting } from '@/lib/db/modules/setting'

export const metadata: Metadata = {
  title: 'Setting',
}
const SettingPage = async () => {
  const session = await auth()

  if (session?.user.role !== 'Admin')
    throw new Error('Admin permission required')

  return (
    <div className='grid md:grid-cols-5 max-w-6xl mx-auto gap-4'>
      <SettingNav />
      <main className='col-span-4 '>
        <div className='my-8'>
          <SettingForm setting={await getNoCachedSetting()} />
        </div>
      </main>
    </div>
  )
}

export default SettingPage
