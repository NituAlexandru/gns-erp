'use client'

import { OpeningBalanceDialog } from '@/components/shared/modals/OpeningBalanceDialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FileText, Package, Scale, Truck, User, Wallet } from 'lucide-react'
import { useState } from 'react'

export const SUPPLIER_TABS = [
  { id: 'details', label: 'Detalii', icon: <User size={16} /> },
  { id: 'receptions', label: 'Recepții (NIR)', icon: <Truck size={16} /> },
  { id: 'invoices', label: 'Facturi', icon: <FileText size={16} /> },
  { id: 'payments', label: 'Plăți', icon: <Wallet size={16} /> },
  { id: 'products', label: 'Produse', icon: <Package size={16} /> },
]

interface SupplierNavProps {
  activeTab: string
  setActiveTab: (tabId: string) => void
  supplierId: string
}

export function SupplierNav({
  activeTab,
  setActiveTab,
  supplierId,
}: SupplierNavProps) {
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false)

  return (
    <>
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
        <Separator className='my-2' />

        <Button
          variant='outline'
          className='justify-start gap-2 border-dashed text-muted-foreground hover:text-foreground'
          onClick={() => setIsBalanceModalOpen(true)}
        >
          <Scale size={16} />
          Setează Sold Inițial
        </Button>
      </nav>
      <OpeningBalanceDialog
        open={isBalanceModalOpen}
        onOpenChange={setIsBalanceModalOpen}
        partnerId={supplierId}
        type='SUPPLIER'
      />
    </>
  )
}
