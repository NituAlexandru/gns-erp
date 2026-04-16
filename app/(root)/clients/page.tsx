import { getAllClients } from '@/lib/db/modules/client/client.actions'
import ClientList from './client-list'
import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { getContractTemplates } from '@/lib/db/modules/contracts/contract-template.actions'
import { ContractTemplateDTO } from '@/lib/db/modules/contracts/contract.types'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const resolvedParams = await searchParams

  const page = Number(resolvedParams.page) || 1
  const query = resolvedParams.q || ''

  const { data, totalPages } = await getAllClients({ page, query })

  const session = await auth()
  const adminId = session?.user?.id || ''
  const userRole = session?.user?.role || ''
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole)

  let addendumTemplates: ContractTemplateDTO[] = []

  if (isAdmin) {
    const allTemplates = await getContractTemplates()
    addendumTemplates = allTemplates.filter(
      (t: ContractTemplateDTO) => t.type === 'ADDENDUM',
    )
  }

  return (
    <ClientList
      data={data}
      totalPages={totalPages}
      currentPage={page}
      adminId={adminId}
      isAdmin={isAdmin}
      addendumTemplates={addendumTemplates}
    />
  )
}
