import { auth } from '@/auth'
import { getVatRates } from '@/lib/db/modules/vat-rate/vatRate.actions'
import SettingsContainer from './settings-container'
import { DefaultVatHistory } from './default-vat-history'

const SettingPage = async () => {
  const session = await auth()
  const userId = session?.user?.id

  if (session?.user.role !== 'Admin' || !userId) {
    return <div>Acces restricționat. Permisiuni de Admin necesare.</div>
  }

  const vatRatesResult = await getVatRates()

  return (
    <SettingsContainer
      initialVatRates={JSON.parse(JSON.stringify(vatRatesResult.data || []))}
      userId={userId}
    >
      <DefaultVatHistory />
    </SettingsContainer>
  )
}

export default SettingPage
