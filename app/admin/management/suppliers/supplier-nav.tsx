'use client'

import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  FileText,
  Archive,
  Package,
  User,
  Wallet,
} from 'lucide-react'

// Tab-uri specifice pentru furnizori
export const SUPPLIER_TABS = [
  { id: 'details', label: 'Detalii', icon: <User size={16} /> },
  {
    id: 'purchaseOrders',
    label: 'Comenzi',
    icon: <ClipboardList size={16} />,
  },
  { id: 'receptions', label: 'Recepții', icon: <Archive size={16} /> },
  { id: 'invoices', label: 'Facturi', icon: <FileText size={16} /> },
  { id: 'payments', label: 'Plăți', icon: <Wallet size={16} /> },
  { id: 'products', label: 'Produse', icon: <Package size={16} /> },
]

interface SupplierNavProps {
  activeTab: string
  setActiveTab: (tabId: string) => void
}

export function SupplierNav({ activeTab, setActiveTab }: SupplierNavProps) {
  return (
    <nav className='flex flex-col gap-2'>
      {SUPPLIER_TABS.map((tab) => (
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
