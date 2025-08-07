'use client'

import { useState } from 'react'
import { VatRateDTO } from '@/lib/db/modules/vat-rate/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'
import SettingNav from './setting-nav'
import { VatRatesManager } from './vat-rates-manager'

interface SettingsContainerProps {
  initialVatRates: VatRateDTO[]
  userId: string
  children: React.ReactNode
}

export default function SettingsContainer({
  initialVatRates,
  userId,
  children,
}: SettingsContainerProps) {
  const [activeSection, setActiveSection] = useState('vat-rates')

  return (
    <div className='grid md:grid-cols-5 max-w-7xl mx-auto gap-8'>
      <aside className='md:col-span-1'>
        <SettingNav
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
      </aside>
      <main className='md:col-span-4'>
        {activeSection === 'vat-rates' && (
          <>
            <VatRatesManager
              initialVatRates={initialVatRates}
              userId={userId}
            />
            {children}
          </>
        )}

        {activeSection === 'site-info' && (
          <Card>
            <CardHeader>
              <CardTitle>Informații Site</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Aici va veni formularul pentru Informații Site, refactorizat.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
