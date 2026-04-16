import { auth } from '@/auth'
import SettingsContainer from './settings-container'
import { DefaultVatHistory } from './vat-rate/default-vat-history'
import { getVatRates } from '@/lib/db/modules/setting/vat-rate/vatRate.actions'
import { getServices } from '@/lib/db/modules/setting/services/service.actions'
import { getSeries } from '@/lib/db/modules/numbering/series.actions'
import { getShippingRates } from '@/lib/db/modules/setting/shipping-rates/shipping.actions'
import { getSetting } from '@/lib/db/modules/setting/setting.actions'
import { getAnafStatus } from '@/lib/db/modules/setting/efactura/anaf.actions' // <-- NEW
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { getContractTemplates } from '@/lib/db/modules/contracts/contract-template.actions'

const SettingPage = async () => {
  const session = await auth()
  const userId = session?.user?.id
  const userRole = session?.user?.role?.toLowerCase() || ''

  // Verificare stricta de rol
  if (!userId || !SUPER_ADMIN_ROLES.includes(userRole)) {
    return <div>Acces restricționat. Permisiuni de Admin necesare.</div>
  }

  const [
    companySettingsResult,
    vatRatesResult,
    servicesResult,
    seriesResult,
    shippingRatesResult,
    anafStatusResult,
    templatesResult,
  ] = await Promise.all([
    getSetting(),
    getVatRates(),
    getServices(),
    getSeries(),
    getShippingRates(),
    getAnafStatus(),
    getContractTemplates(),
  ])

  return (
    <SettingsContainer
      initialCompanySettings={JSON.parse(
        JSON.stringify(companySettingsResult || null),
      )}
      initialVatRates={JSON.parse(JSON.stringify(vatRatesResult.data || []))}
      initialServices={JSON.parse(JSON.stringify(servicesResult.data || []))}
      initialShippingRates={JSON.parse(
        JSON.stringify(shippingRatesResult.data || []),
      )}
      initialSeries={JSON.parse(JSON.stringify(seriesResult || []))}
      anafStatus={JSON.parse(JSON.stringify(anafStatusResult))}
      initialTemplates={JSON.parse(JSON.stringify(templatesResult || []))}
      userId={userId}
    >
      <DefaultVatHistory />
    </SettingsContainer>
  )
}

export default SettingPage
