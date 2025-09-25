import { auth } from '@/auth'
import { getVatRates } from '@/lib/db/modules/setting/vat-rate/vatRate.actions'
import SettingsContainer from './settings-container'
import { DefaultVatHistory } from './vat-rate/default-vat-history'
import { getServices } from '@/lib/db/modules/setting/services/service.actions' // <-- IMPORTĂ ACȚIUNEA
import { getSeries } from '@/lib/db/modules/numbering/series.actions'

const SettingPage = async () => {
  const session = await auth()
  const userId = session?.user?.id

  if (session?.user.role !== 'Admin' || !userId) {
    return <div>Acces restricționat. Permisiuni de Admin necesare.</div>
  }

  const vatRatesResult = await getVatRates()
  const servicesResult = await getServices()
  const seriesResult = await getSeries()

  return (
    <SettingsContainer
      initialVatRates={JSON.parse(JSON.stringify(vatRatesResult.data || []))}
      initialServices={JSON.parse(JSON.stringify(servicesResult.data || []))}
      initialSeries={JSON.parse(JSON.stringify(seriesResult || []))}
      userId={userId}
    >
      <DefaultVatHistory />
    </SettingsContainer>
  )
}

export default SettingPage
