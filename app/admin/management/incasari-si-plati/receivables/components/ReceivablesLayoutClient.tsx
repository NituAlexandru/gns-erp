'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { ReceivablesFilterBar } from './ReceivablesFilterBar'
import { CreateClientPaymentForm } from './CreateClientPaymentForm'

interface ReceivablesLayoutClientProps {
  children: React.ReactNode
  counts: {
    invoices: number
    receipts: number
  }
}

export function ReceivablesLayoutClient({
  children,
  counts,
}: ReceivablesLayoutClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  // --- DETERMINARE TAB ACTIV ---
  const activeTab = useMemo(() => {
    if (pathname.includes('/receivables/incasari')) return 'receipts'
    return 'invoices'
  }, [pathname])

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [preselectedClientId, setPreselectedClientId] = useState<
    string | undefined
  >(undefined)

  const handlePaymentFormSubmit = () => {
    setPaymentModalOpen(false)
    setPreselectedClientId(undefined)
    router.refresh()
  }

  return (
    <div className='flex flex-col h-full min-h-0 gap-0'>
      {/* 1. HEADER */}
      <div className='flex flex-col md:flex-row gap-0 md:items-center justify-between pb-0'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            Încasări Clienți
          </h1>
          <p className='text-muted-foreground'>
            Urmărește facturile emise și înregistrează încasările.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            className='gap-2'
            onClick={() => {
              setPreselectedClientId(undefined)
              setPaymentModalOpen(true)
            }}
          >
            <PlusCircle className='h-4 w-4' />
            Înregistrează Încasare
          </Button>
        </div>
      </div>

      {/* 2. TABURI + FILTRE */}
      <div className='flex-1 flex flex-col overflow-hidden p-0 mt-0'>
        <div className='flex gap-10 items-center mb-0 mt-0'>
          {/* GRUP TABURI */}
          <div>
            <Tabs value={activeTab} className='w-full'>
              <TabsList className='bg-transparent h-auto p-0 gap-1'>
                <Link href='/admin/management/incasari-si-plati/receivables/facturi'>
                  <TabsTrigger
                    value='invoices'
                    className='border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-1 cursor-pointer'
                  >
                    Facturi
                    <Badge variant='secondary' className='ml-2'>
                      {counts.invoices}
                    </Badge>
                  </TabsTrigger>
                </Link>

                <Link href='/admin/management/incasari-si-plati/receivables/incasari'>
                  <TabsTrigger
                    value='receipts'
                    className='border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-1 cursor-pointer'
                  >
                    Încasări
                    <Badge variant='secondary' className='ml-2'>
                      {counts.receipts}
                    </Badge>
                  </TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>
          </div>

          {/* BARA FILTRE */}
          <ReceivablesFilterBar />
        </div>

        {/* 3. CONȚINUTUL PAGINII */}
        <div className='flex-1 overflow-hidden pt-0 bg-background'>
          {children}
        </div>
      </div>

      {/* 4. MODALE */}
      <Sheet open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <SheetContent
          side='right'
          className='w-[90%] max-w-none sm:w-[90%] md:w-[80%] lg:w-[60%] overflow-y-auto'
        >
          <SheetHeader>
            <SheetTitle>Înregistrare Încasare Client</SheetTitle>
            <SheetDescription>
              Adaugă o încasare nouă (OP, Cash, Card) de la un client.
            </SheetDescription>
          </SheetHeader>
          <div className='p-5'>
            <CreateClientPaymentForm
              onFormSubmit={handlePaymentFormSubmit}
              initialClientId={preselectedClientId}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
