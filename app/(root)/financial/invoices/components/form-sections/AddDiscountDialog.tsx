'use client'

import { useEffect, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { formatCurrency, round2 } from '@/lib/utils'

interface AddDiscountDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    description: string
    amount: number // Valoarea finală a discountului (pozitivă aici, o facem negativă în părinte)
    vatRate: number
  }) => void
  currentSubtotal: number // Necesar pentru calculul procentual
  vatRates: VatRateDTO[]
}

export function AddDiscountDialog({
  isOpen,
  onClose,
  onConfirm,
  currentSubtotal,
  vatRates,
}: AddDiscountDialogProps) {
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [value, setValue] = useState<number>(0) // Valoarea introdusă (ex: 10 pt 10%)
  const [description, setDescription] = useState('Discount comercial')
  const [selectedVatRate, setSelectedVatRate] = useState<number>(
    vatRates[0]?.rate || 19
  )

  // Reset la deschidere
  useEffect(() => {
    if (isOpen) {
      setValue(0)
      setDescription('Discount comercial')
      // Dacă nu avem subtotal, forțăm pe Sumă Fixă, altfel Procentual
      setType(currentSubtotal > 0 ? 'PERCENT' : 'FIXED')
    }
  }, [isOpen, currentSubtotal])

  // Calculăm valoarea finală a discountului pentru preview
  const calculatedAmount =
    type === 'PERCENT' ? round2(currentSubtotal * (value / 100)) : round2(value)

  const handleConfirm = () => {
    onConfirm({
      description,
      amount: calculatedAmount,
      vatRate: selectedVatRate,
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Adaugă Discount</DialogTitle>
          <DialogDescription>
            Alegeți tipul de reducere. Aceasta va fi adăugată ca o linie cu
            valoare negativă pe factură.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* 1. Tipul Discountului */}
          <div className='flex items-center gap-4'>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as 'PERCENT' | 'FIXED')}
              className='flex gap-4'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='PERCENT' id='r-percent' />
                <Label htmlFor='r-percent'>Procentual (%)</Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='FIXED' id='r-fixed' />
                <Label htmlFor='r-fixed'>Sumă Fixă (RON)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 2. Valoarea */}
          <div className='grid gap-2'>
            <Label htmlFor='value'>
              {type === 'PERCENT' ? 'Procent (%)' : 'Valoare (RON)'}
            </Label>
            <div className='flex items-center gap-2'>
              <Input
                id='value'
                type='number'
                value={value || ''}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                className='text-right'
              />
              {type === 'PERCENT' && <span className='font-bold'>%</span>}
            </div>
            {type === 'PERCENT' && (
              <p className='text-xs text-muted-foreground text-right'>
                Din subtotalul curent ({formatCurrency(currentSubtotal)}) ={' '}
                <strong>{formatCurrency(calculatedAmount)}</strong>
              </p>
            )}
          </div>

          {/* 3. Descriere */}
          <div className='grid gap-2'>
            <Label htmlFor='description'>Descriere pe Factură</Label>
            <Input
              id='description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* 4. Cota TVA */}
          <div className='grid gap-2'>
            <Label>Cota TVA aplicabilă</Label>
            <Select
              value={selectedVatRate.toString()}
              onValueChange={(v) => setSelectedVatRate(parseFloat(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vatRates.map((vat) => (
                  <SelectItem key={vat._id} value={vat.rate.toString()}>
                    {vat.rate}% - {vat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-[10px] text-muted-foreground'>
              * Discountul trebuie să aibă cota de TVA a produselor la care se
              referă.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type='button' variant='ghost' onClick={onClose}>
            Anulează
          </Button>
          <Button type='button' onClick={handleConfirm}>
            Adaugă Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
