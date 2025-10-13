import { auth } from '@/auth' 
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles' 
import { OrderForm } from '../components/OrderForm'

export default async function NewOrderPage() {

  const session = await auth()

  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole)

  return (
    <div className='container mx-auto py-8'>
      <OrderForm isAdmin={isAdmin} />
    </div>
  )
}
