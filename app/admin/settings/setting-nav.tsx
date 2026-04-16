'use client'

import { Button } from '@/components/ui/button'
import {
  PercentSquare,
  Handshake,
  FileText,
  Truck,
  Building,
  ShieldCheck,
  FileSignature,
} from 'lucide-react'

const navItems = [
  { name: 'Date Companie', hash: 'company-info', icon: <Building /> },
  {
    name: 'e-Factura (ANAF)',
    hash: 'efactura',
    icon: <ShieldCheck className='w-4 h-4' />,
  },
  { name: 'Cote TVA', hash: 'vat-rates', icon: <PercentSquare /> },
  { name: 'Servicii', hash: 'services', icon: <Handshake /> },
  { name: 'Tarife Transport', hash: 'shipping-rates', icon: <Truck /> },
  { name: 'Serii Documente', hash: 'series', icon: <FileText /> },
  {
    name: 'Șabloane Contracte',
    hash: 'contracts',
    icon: <FileSignature className='w-4 h-4' />,
  },
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
