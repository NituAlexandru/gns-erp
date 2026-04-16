'use client'

import { useEffect, useState } from 'react'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import React from 'react'
import SettingNav from './setting-nav'
import { VatRatesManager } from './vat-rate/vat-rates-manager'
import { ServiceDTO } from '@/lib/db/modules/setting/services/types'
import { ServicesManager } from './services/services-manager'
import { SeriesManager } from './series/series-manager'
import { SeriesDTO } from '@/lib/db/modules/numbering/types'
import { ShippingRateDTO } from '@/lib/db/modules/setting/shipping-rates/types'
import { ShippingRatesManager } from './shipping-rates/shipping-manager'
import { ISettingInput } from '@/lib/db/modules/setting/types'
import { CompanySettingsForm } from './components/company-settings-form'
import { useSearchParams } from 'next/navigation'
import { EFacturaSettings } from './efactura/efactura-settings'
import { ContractTemplateDTO } from '@/lib/db/modules/contracts/contract.types'
import { ContractTemplateBuilder } from '../contracts/contract-template-builder'

interface SettingsContainerProps {
  initialCompanySettings: ISettingInput | null
  initialVatRates: VatRateDTO[]
  initialServices: ServiceDTO[]
  initialSeries: SeriesDTO[]
  initialShippingRates: ShippingRateDTO[]
  initialTemplates: ContractTemplateDTO[]
  anafStatus: {
    connected: boolean
    expiresAt?: Date
    lastLogin?: Date
  }
  userId: string
  children?: React.ReactNode
}

export default function SettingsContainer({
  initialCompanySettings,
  initialVatRates,
  initialServices,
  initialSeries,
  initialShippingRates,
  initialTemplates,
  anafStatus,
  userId,
  children,
}: SettingsContainerProps) {
  const [activeSection, setActiveSection] = useState('company-info')
  const searchParams = useSearchParams()

  // --- Detectare Redirect ANAF ---
  useEffect(() => {
    // Dacă URL-ul conține ?code=..., înseamnă că ne-am întors de la ANAF
    if (searchParams.get('code')) {
      setActiveSection('efactura')
    }
  }, [searchParams])

  return (
    <div className='grid md:grid-cols-5 max-w-full mx-auto gap-8'>
      <aside className='md:col-span-1 sticky top-24 self-start'>
        <SettingNav
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
      </aside>
      <main className='md:col-span-4 space-y-6'>
        {activeSection === 'company-info' && (
          <CompanySettingsForm initialData={initialCompanySettings} />
        )}

        {activeSection === 'efactura' && (
          <EFacturaSettings initialStatus={anafStatus} />
        )}

        {activeSection === 'contracts' && (
          <ContractTemplateBuilder initialTemplates={initialTemplates} />
        )}

        {activeSection === 'vat-rates' && (
          <>
            <VatRatesManager
              initialVatRates={initialVatRates}
              userId={userId}
            />
            {children}
          </>
        )}

        {activeSection === 'services' && (
          <ServicesManager
            initialServices={initialServices}
            vatRates={initialVatRates}
            userId={userId}
          />
        )}

        {activeSection === 'shipping-rates' && (
          <ShippingRatesManager initialRates={initialShippingRates} />
        )}

        {activeSection === 'series' && (
          <SeriesManager initialSeries={initialSeries} />
        )}
      </main>
    </div>
  )
}
