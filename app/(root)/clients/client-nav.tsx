'use client'

import { OpeningBalanceDialog } from '@/components/shared/modals/OpeningBalanceDialog'
import { PackagingOpeningBalanceModal } from '@/components/shared/modals/PackagingOpeningBalanceModal'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Box,
  ClipboardList,
  FileCheck,
  FileText,
  Package,
  Scale,
  Truck,
  User,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'

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
  clientId: string
  isAdmin: boolean
}

export function ClientNav({
  activeTab,
  setActiveTab,
  clientId,
  isAdmin,
}: ClientNavProps) {
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false)
  const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false)
  const canManageBalances = isAdmin

  return (
    <>
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
        <Separator className='my-2' />
        {canManageBalances && (
          <>
            <Separator className='my-2' />
            <div className='flex flex-col gap-1'>
              <Button
                variant='outline'
                className='justify-start gap-2 border-dashed text-muted-foreground hover:text-foreground'
                onClick={() => setIsBalanceModalOpen(true)}
              >
                <Scale size={16} />
                Setează Sold Financiar Inițial
              </Button>
              <Button
                variant='outline'
                className='justify-start gap-2 border-dashed text-muted-foreground hover:text-foreground'
                onClick={() => setIsPackagingModalOpen(true)}
              >
                <Box size={16} />
                Setează Sold Inițial Ambalaje
              </Button>
            </div>
          </>
        )}
      </nav>
      <OpeningBalanceDialog
        open={isBalanceModalOpen}
        onOpenChange={setIsBalanceModalOpen}
        partnerId={clientId}
        type='CLIENT'
      />
      <PackagingOpeningBalanceModal
        open={isPackagingModalOpen}
        onOpenChange={setIsPackagingModalOpen}
        partnerId={clientId}
      />
    </>
  )
}
