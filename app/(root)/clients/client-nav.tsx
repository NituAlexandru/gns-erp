'use client'

import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  FileCheck,
  FileText,
  Package,
  Truck,
  User,
  Wallet,
} from 'lucide-react'

// Definirea tab-urilor actualizate, în noua ordine
export const CLIENT_TABS = [
  { id: 'details', label: 'Detalii', icon: <User size={16} /> },
  { id: 'orders', label: 'Comenzi', icon: <ClipboardList size={16} /> },
  { id: 'deliveries', label: 'Livrări', icon: <Truck size={16} /> },
  { id: 'notices', label: 'Avize', icon: <FileCheck size={16} /> },
  { id: 'invoices', label: 'Facturi', icon: <FileText size={16} /> },
  { id: 'payments', label: 'Plăți', icon: <Wallet size={16} /> },
  { id: 'products', label: 'Produse', icon: <Package size={16} /> },
]

interface ClientNavProps {
  activeTab: string
  setActiveTab: (tabId: string) => void
}

export function ClientNav({ activeTab, setActiveTab }: ClientNavProps) {
  return (
    <nav className='flex flex-col gap-2'>
      {CLIENT_TABS.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? 'secondary' : 'ghost'}
          className='justify-start gap-2'
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.icon}
          {tab.label}
        </Button>
      ))}
    </nav>
  )
}
