'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  PopulatedDefaultVatHistory,
  VatRateDTO,
} from '@/lib/db/modules/vat-rate/types'
import {
  createVatRate,
  updateVatRate,
  setDefaultVatRate,
} from '@/lib/db/modules/vat-rate/vatRate.actions'

type ServerActionResult = {
  success: boolean
  message?: string
  data?: VatRateDTO
  newHistoryEntry?: PopulatedDefaultVatHistory
}

interface VatRatesManagerProps {
  initialVatRates: VatRateDTO[]
  userId: string
}

export function VatRatesManager({
  initialVatRates,
  userId,
}: VatRatesManagerProps) {
  const router = useRouter()
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [editingRate, setEditingRate] = useState<VatRateDTO | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [rateToConfirm, setRateToConfirm] = useState<VatRateDTO | null>(null)

  const handleAction = async (
    action: Promise<ServerActionResult>,
    successMessage: string
  ) => {
    setIsLoading(true)
    const result = await action
    if (result.success) {
      toast.success(successMessage)
      router.refresh() // Comanda care actualizează TOTUL: și lista de cote, și istoricul.
    } else {
      toast.error(result.message)
    }
    // Resetăm stările UI indiferent de rezultat
    setIsLoading(false)
    setIsDialogOpen(false)
    setIsFormVisible(false)
    setEditingRate(null)
  }

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const rateData = {
      name: formData.get('name') as string,
      rate: Number(formData.get('rate')),
      isActive: formData.get('isActive') === 'on',
    }
    if (editingRate) {
      handleAction(
        updateVatRate({ _id: editingRate._id, ...rateData }),
        'Cota a fost actualizată.'
      )
    } else {
      handleAction(createVatRate(rateData), 'Cota a fost creată.')
    }
  }

  const executeSetDefault = () => {
    if (!rateToConfirm) return
    handleAction(
      setDefaultVatRate({ rateId: rateToConfirm._id, userId }),
      'Cota implicită a fost actualizată.'
    )
  }

  const handleToggleActive = (rate: VatRateDTO) => {
    handleAction(
      updateVatRate({
        _id: rate._id,
        name: rate.name,
        rate: rate.rate,
        isActive: !rate.isActive,
      }),
      'Statusul a fost modificat.'
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex justify-between items-center'>
            <CardTitle>Management Cote TVA</CardTitle>
            {!isFormVisible && (
              <Button
                onClick={() => {
                  setEditingRate(null)
                  setIsFormVisible(true)
                }}
                disabled={isLoading}
              >
                Adaugă Cotă Nouă
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isFormVisible && (
            <form
              onSubmit={handleFormSubmit}
              className='p-4 border rounded-md mb-6 space-y-4'
            >
              <h3 className='font-semibold'>
                {editingRate ? 'Modifică Cota' : 'Adaugă Cotă Nouă'}
              </h3>
              <div>
                <label htmlFor='name' className='text-sm font-medium'>
                  Nume
                </label>
                <Input
                  id='name'
                  name='name'
                  defaultValue={editingRate?.name || ''}
                  required
                />
              </div>
              <div>
                <label htmlFor='rate' className='text-sm font-medium'>
                  Cota (%)
                </label>
                <Input
                  id='rate'
                  name='rate'
                  type='number'
                  step='0.01'
                  defaultValue={editingRate?.rate || ''}
                  required
                />
              </div>
              <div className='flex items-center gap-2 pt-2'>
                <Checkbox
                  id='isActive'
                  name='isActive'
                  defaultChecked={editingRate?.isActive ?? true}
                />
                <label htmlFor='isActive' className='text-sm font-medium'>
                  Activă
                </label>
              </div>
              <div className='flex gap-2'>
                <Button type='submit' disabled={isLoading}>
                  {isLoading ? 'Se salvează...' : 'Salvează'}
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => setIsFormVisible(false)}
                >
                  Anulează
                </Button>
              </div>
            </form>
          )}
          <div className='relative max-h-[300px] overflow-y-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-full'>Nume</TableHead>
                  <TableHead>Cota (%)</TableHead>
                  <TableHead>Activ</TableHead>
                  <TableHead>Implicit</TableHead>
                  <TableHead>Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialVatRates.map((rate) => (
                  <TableRow key={rate._id}>
                    <TableCell>{rate.name}</TableCell>
                    <TableCell>{rate.rate} %</TableCell>
                    <TableCell>{rate.isActive ? '✅' : '❌'}</TableCell>
                    <TableCell>{rate.isDefault ? '⭐' : ''}</TableCell>
                    <TableCell className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setEditingRate(rate)
                          setIsFormVisible(true)
                        }}
                        disabled={isLoading}
                      >
                        Modifică
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setRateToConfirm(rate)
                          setIsDialogOpen(true)
                        }}
                        disabled={rate.isDefault || isLoading}
                      >
                        Setează ca Implicit
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleToggleActive(rate)}
                        disabled={isLoading}
                      >
                        {rate.isActive ? 'Dezactivează' : 'Activează'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmare Acțiune</DialogTitle>
            <DialogDescription>
              Sunteți sigur că doriți să setați cota{' '}
              <span className='font-bold'>
                &quot;{rateToConfirm?.name}&quot; ({rateToConfirm?.rate}%)
              </span>{' '}
              ca fiind cea implicită?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='ghost' onClick={() => setIsDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={executeSetDefault} disabled={isLoading}>
              {isLoading ? 'Se procesează...' : 'Da, confirmă'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
