'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ShippingRateDTO } from '@/lib/db/modules/setting/shipping-rates/types'
import { updateShippingRate } from '@/lib/db/modules/setting/shipping-rates/shipping.actions'

interface ShippingRatesManagerProps {
  initialRates: ShippingRateDTO[]
}

function ShippingRateRow({ rateData }: { rateData: ShippingRateDTO }) {
  const [rate, setRate] = useState(rateData.ratePerKm)
  const [isSaving, setIsSaving] = useState(false)
  const isChanged = rate !== rateData.ratePerKm

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateShippingRate(rateData.name, rate)
    if (result.success) {
      toast.success(result.message)
      rateData.ratePerKm = rate
    } else {
      toast.error(result.message)
      setRate(rateData.ratePerKm)
    }
    setIsSaving(false)
  }

  return (
    <TableRow>
      <TableCell className='font-medium'>{rateData.name}</TableCell>
      <TableCell className='w-[280px]'>
        <div className='flex items-center justify-end gap-2'>
          <Input
            type='number'
            step='0.01'
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            className='w-24 text-right'
          />

          <span className='text-muted-foreground text-sm'>(RON) / KM</span>
        </div>
      </TableCell>

      <TableCell className='w-[150px] text-right'>
        <Button
          onClick={handleSave}
          disabled={!isChanged || isSaving}
          size='sm'
        >
          {isSaving ? 'Se salvează...' : 'Salvează'}
        </Button>
      </TableCell>
    </TableRow>
  )
}

export const ShippingRatesManager = ({
  initialRates,
}: ShippingRatesManagerProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Management Tarife Vehicule</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tip Vehicul</TableHead>
              <TableHead className='text-right'>Tarif / KM (RON)</TableHead>
              <TableHead className='w-[150px] text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRates.map((rate) => (
              <ShippingRateRow key={rate._id} rateData={rate} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
