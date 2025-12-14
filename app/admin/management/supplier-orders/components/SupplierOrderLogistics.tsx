'use client'

import { useEffect } from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SupplierOrderCreateInput } from '@/lib/db/modules/supplier-orders/supplier-order.validator'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'

interface SupplierOrderLogisticsProps {
  form: UseFormReturn<SupplierOrderCreateInput>
  vatRates: VatRateDTO[]
}

export function SupplierOrderLogistics({
  form,
  vatRates,
}: SupplierOrderLogisticsProps) {
  const transportType = useWatch({
    control: form.control,
    name: 'transportDetails.transportType',
  })

  // Ascultăm valorile pentru calcul în timp real
  const costPerTrip = useWatch({
    control: form.control,
    name: 'transportDetails.transportCost',
  })
  const tripsCount = useWatch({
    control: form.control,
    name: 'transportDetails.estimatedTransportCount',
  })

  // Setăm default VAT Rate dacă este 0 (adică proaspăt inițializat)
  const currentTransportVat = useWatch({
    control: form.control,
    name: 'transportDetails.transportVatRate',
  })

  useEffect(() => {
    // Dacă cota e 0 și avem rate disponibile, punem default-ul
    if (currentTransportVat === 0 && vatRates.length > 0) {
      const defaultRate = vatRates.find((v) => v.isDefault)?.rate || 0
      if (defaultRate > 0) {
        form.setValue('transportDetails.transportVatRate', defaultRate)
      }
    }
  }, [vatRates, currentTransportVat, form])

  // Efect pentru calcularea automată a totalului
  useEffect(() => {
    const cost = Number(costPerTrip) || 0
    const count = Number(tripsCount) || 1
    const total = cost * count

    // Setăm valoarea în form (fără validare vizibilă imediat pentru a nu fi agresiv)
    form.setValue('transportDetails.totalTransportCost', total)
  }, [costPerTrip, tripsCount, form])

  return (
    <div className='space-y-4'>
      {/* Tip Transport */}
      <FormField
        name='transportDetails.transportType'
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tip Transport</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Selectează...' />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value='INTERN'>Intern (Efectuat de GNS)</SelectItem>
                <SelectItem value='EXTERN_FURNIZOR'>
                  Extern (Efectuat de Furnizor)
                </SelectItem>
                <SelectItem value='TERT'>Transport Terț</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Rândul cu Calcule: Cost x Curse = Total */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-2 bg-muted/10 p-2 rounded-lg border'>
        {/* 1. Cost per Cursă */}
        <FormField
          name='transportDetails.transportCost'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-xs'>Cost / Cursă (RON)</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* 3. Selector TVA Transport */}
        <FormField
          name='transportDetails.transportVatRate'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-xs'>Cota TVA Transport</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(Number(val))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='%' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vatRates.map((rate) => (
                    <SelectItem key={rate._id} value={rate.rate.toString()}>
                      {rate.rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        {/* 2. Număr Curse */}
        <FormField
          name='transportDetails.estimatedTransportCount'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-xs'>Numar Curse (Estimat)</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='1'
                  min='1'
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value) || 1)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Detalii Șofer / Auto */}
      <div className='grid grid-cols-2 gap-4'>
        <FormField
          name='transportDetails.driverName'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nume Șofer</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name='transportDetails.carNumber'
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nr. Auto</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <FormField
        name='transportDetails.notes'
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Note Transport</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className='h-16 resize-none'
                value={field.value ?? ''}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Secțiunea Terț - Condițională */}
      {transportType === 'TERT' && (
        <div className='p-3 pt-4 border-t space-y-3 bg-muted/30 rounded-md'>
          <h5 className='font-semibold text-sm'>Detalii Transportator Terț</h5>
          <FormField
            name='transportDetails.tertiaryTransporterDetails.name'
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nume Firmă <span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              name='transportDetails.tertiaryTransporterDetails.cui'
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CUI</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name='transportDetails.tertiaryTransporterDetails.regCom'
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nr. Reg. Com.</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}
