'use client'

import { Button } from '@/components/ui/button'
import { Info, PercentSquare, Handshake, FileText } from 'lucide-react'

const navItems = [
  { name: 'Informații Site', hash: 'site-info', icon: <Info /> },
  { name: 'Cote TVA', hash: 'vat-rates', icon: <PercentSquare /> },
  { name: 'Servicii', hash: 'services', icon: <Handshake /> },
  { name: 'Serii Documente', hash: 'series', icon: <FileText /> },
]

interface SettingNavProps {
  activeSection: string
  setActiveSection: (section: string) => void
}

const SettingNav = ({ activeSection, setActiveSection }: SettingNavProps) => {
  return (
    <aside>
      <h1 className='text-2xl font-bold'>Setări</h1>
      <nav className='flex flex-col gap-2 mt-4'>
        {navItems.map((item) => (
          <Button
            key={item.hash}
            onClick={() => setActiveSection(item.hash)}
            variant={activeSection === item.hash ? 'secondary' : 'ghost'}
            className='justify-start gap-2'
          >
            {item.icon}
            {item.name}
          </Button>
        ))}
      </nav>
    </aside>
  )
}

export default SettingNav
