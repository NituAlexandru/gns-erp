'use client'

import { useState, useTransition, useEffect } from 'react'
import { Loader2, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreatePackagingOpeningBalanceInput } from '@/lib/db/modules/financial/initial-balance/initial-balance.validator'
import { createPackagingOpeningBalance } from '@/lib/db/modules/financial/invoices/invoice.actions'
import {
  getDefaultVatRate,
  getVatRates,
} from '@/lib/db/modules/setting/vat-rate/vatRate.actions'
import {
  AutocompleteSearch,
  SearchResult,
} from '@/app/admin/management/reception/autocomplete-search'
import { formatCurrency } from '@/lib/utils'
import { getClientById } from '@/lib/db/modules/client/client.actions'
import { InvoiceAddressSelector } from '@/app/(root)/financial/invoices/components/form-sections/InvoiceAddressSelector'

interface PackagingOpeningBalanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerId: string
}

export function PackagingOpeningBalanceModal({
  open,
  onOpenChange,
  partnerId,
}: PackagingOpeningBalanceModalProps) {
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState<
    CreatePackagingOpeningBalanceInput['items']
  >([])
  const [vatRates, setVatRates] = useState<any[]>([])
  const [defaultVatRate, setDefaultVatRate] = useState<number>(19)
  const [clientData, setClientData] = useState<any>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<
    string | undefined
  >(undefined)

  // 1. La montare, încărcăm Cotele TVA și Default-ul si clientul
  useEffect(() => {
    const loadData = async () => {
      const [ratesRes, defaultRes, client] = await Promise.all([
        getVatRates(),
        getDefaultVatRate(),
        getClientById(partnerId),
      ])

      if (ratesRes.success && ratesRes.data) setVatRates(ratesRes.data)
      if (defaultRes.success && defaultRes.data)
        setDefaultVatRate(defaultRes.data.rate)
      if (client) setClientData(client)
    }

    if (open) {
      loadData()
    }
  }, [open, partnerId])

  // 2. Logică Adăugare Item (Handler pentru AutocompleteSearch)
  const handleProductSelect = (id: string, item: SearchResult | null) => {
    if (!item) return

    // Verificăm duplicarea
    if (items.find((i) => i.productId === item._id)) {
      toast.warning('Acest ambalaj este deja în listă.')
      return
    }

    // Încercăm să găsim un preț de vânzare dacă vine din API, altfel 0
    // SearchResult-ul tău nu are explicit 'sellingPrice' definit în type,
    // dar de obicei API-ul de produse îl returnează. Folosim 'any' pt siguranță sau 0.
    const suggestedPrice =
      (item as any).sellingPrice || (item as any).price || 0

    setItems((prev) => [
      ...prev,
      {
        productId: item._id,
        productName: item.name,
        quantity: 1,
        unitPrice: suggestedPrice,
        vatRate: defaultVatRate, // Folosim default-ul încărcat din DB
      },
    ])
  }

  const updateItem = (
    index: number,
    field: keyof (typeof items)[0],
    value: number
  ) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (items.length === 0) {
      toast.error('Adăugați cel puțin un produs.')
      return
    }

    const payload: CreatePackagingOpeningBalanceInput = {
      partnerId,
      deliveryAddressId: selectedAddressId,
      date: new Date('2025-12-31'),
      items,
    }

    startTransition(async () => {
      const result = await createPackagingOpeningBalance(payload)
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        setItems([])
      } else {
        toast.error('Eroare', { description: result.message })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-5xl max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Setare Sold Ambalaje (Istoric)</DialogTitle>
          <DialogDescription>
            Adăugați ambalajele aflate la client inainte de data 31.12.2025.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto py-4 space-y-6 px-1'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-muted/10 p-4 border rounded-md'>
              <InvoiceAddressSelector
                client={clientData}
                onAddressSelect={(addr) => {
                  setSelectedAddressId(addr?._id?.toString())
                }}
              />
            </div>
            {/* ZONA DE CĂUTARE - Folosim AutocompleteSearch */}
            <div className='space-y-2 border p-4 rounded-md bg-muted/20'>
              <Label>Caută Ambalaj</Label>
              <div className='bg-background rounded-md'>
                <AutocompleteSearch
                  searchType='packaging' 
                  value='' // Lăsăm gol ca să se reseteze după selecție (vezi logica din componenta ta)
                  onChange={handleProductSelect}
                  placeholder='Caută după nume sau cod...'
                />
              </div>
            </div>
          </div>

          {/* Tabel Produse */}
          <div className='border rounded-md overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead>Produs</TableHead>
                  <TableHead>Cantitate</TableHead>
                  <TableHead>Preț (RON)</TableHead>
                  <TableHead>TVA (%)</TableHead>
                  <TableHead>Total (fără TVA)</TableHead>
                  <TableHead className='text-right'>Total Linie</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className='text-center h-24 text-muted-foreground'
                    >
                      Lista este goală. Căutați un ambalaj mai sus.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, idx) => {
                    const lineVal = item.quantity * item.unitPrice
                    const vatVal = lineVal * (item.vatRate / 100)
                    return (
                      <TableRow key={idx}>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <Package className='h-4 w-4 text-muted-foreground' />
                            {item.productName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type='number'
                            min='0'
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                'quantity',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className='w-24 h-8'
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type='number'
                            min='0'
                            step='0.01'
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                'unitPrice',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className='w-24 h-8'
                          />
                        </TableCell>
                        <TableCell>
                          {/* SELECTOR DE TVA CONECTAT LA DB */}
                          <Select
                            value={item.vatRate.toString()}
                            onValueChange={(val) =>
                              updateItem(idx, 'vatRate', parseFloat(val))
                            }
                          >
                            <SelectTrigger className='w-65 h-8'>
                              <SelectValue placeholder='TVA' />
                            </SelectTrigger>
                            <SelectContent>
                              {vatRates.map((rate: any) => (
                                <SelectItem
                                  key={rate._id}
                                  value={rate.rate.toString()}
                                >
                                  {rate.name} ({rate.rate}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatCurrency(lineVal)}
                        </TableCell>
                        <TableCell className='text-right font-semibold'>
                          {formatCurrency(lineVal + vatVal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => removeItem(idx)}
                            className='h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10'
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {items.length > 0 && (
            <div className='flex flex-col gap-1 items-end p-3 bg-muted/20 rounded-md'>
              {/* Total Fără TVA */}
              <div className='flex justify-between w-64 text-sm'>
                <span className='text-muted-foreground'>Total (fără TVA):</span>
                <span className='font-semibold'>
                  {formatCurrency(
                    items.reduce(
                      (acc, curr) => acc + curr.quantity * curr.unitPrice,
                      0
                    )
                  )}
                </span>
              </div>

              {/* Total Cu TVA */}
              <div className='flex justify-between w-64 text-base'>
                <span className='font-medium'>Total (cu TVA):</span>
                <span className='font-bold text-primary'>
                  {formatCurrency(
                    items.reduce((acc, curr) => {
                      const val = curr.quantity * curr.unitPrice
                      return acc + val + val * (curr.vatRate / 100)
                    }, 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || items.length === 0}
          >
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Generează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
