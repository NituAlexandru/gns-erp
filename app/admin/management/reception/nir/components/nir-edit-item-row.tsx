'use client'

import { UseFormReturn } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import {
  FormControl,
  FormField,
  FormItem,
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
import { Button } from '@/components/ui/button'
import { formatCurrency, round2 } from '@/lib/utils'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { useEffect } from 'react'
import { UNITS } from '@/lib/constants'
import { AutocompleteSearch } from '../../autocomplete-search'

interface NirEditItemRowProps {
  index: number
  form: UseFormReturn<any>
  itemType: 'products' | 'packagingItems'
  onRemove: () => void
  vatRates: VatRateDTO[]
}

export function NirEditItemRow({
  index,
  form,
  itemType,
  onRemove,
  vatRates,
}: NirEditItemRowProps) {
  // 1. Urmărim valorile brute (pot fi string-uri gen "-" sau "")
  const rawQuantity = form.watch(`${itemType}.${index}.quantity`)
  const rawPrice = form.watch(`${itemType}.${index}.invoicePricePerUnit`)
  const rawVatRate = form.watch(`${itemType}.${index}.vatRate`)

  // 2. Convertim în numere sigure pentru calcule (fără NaN)
  const quantity = isNaN(Number(rawQuantity)) ? 0 : Number(rawQuantity)
  const price = isNaN(Number(rawPrice)) ? 0 : Number(rawPrice)
  const vatRate = isNaN(Number(rawVatRate)) ? 0 : Number(rawVatRate)

  // 3. Facem calculele
  const lineValue = round2(quantity * price)
  const lineVat = round2(lineValue * (vatRate / 100))
  const lineTotal = round2(lineValue + lineVat)

  // 4. Actualizăm totalurile în form
  useEffect(() => {
    form.setValue(`${itemType}.${index}.lineValue`, lineValue)
    form.setValue(`${itemType}.${index}.lineVatValue`, lineVat)
    form.setValue(`${itemType}.${index}.lineTotal`, lineTotal)
  }, [lineValue, lineVat, lineTotal, index, form, itemType])

  return (
    <tr className='hover:bg-muted/30 transition-colors'>
      <td className='px-2 py-1 text-muted-foreground w-[40px] text-xs'>
        {index + 1}
      </td>

      {/* --- AUTCOMPLETE PRODUS/AMBALAJ --- */}
      <td className='px-2 py-1 min-w-[200px]'>
        <FormField
          control={form.control}
          name={`${itemType}.${index}.productName`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <AutocompleteSearch
                  searchType={
                    itemType === 'packagingItems' ? 'packaging' : 'product'
                  }
                  value={
                    form.getValues(`${itemType}.${index}.product`) ||
                    form.getValues(`${itemType}.${index}.packaging`) ||
                    ''
                  }
                  initialSelectedItem={{
                    _id:
                      form.getValues(`${itemType}.${index}.product`) ||
                      form.getValues(`${itemType}.${index}.packaging`) ||
                      '',
                    name: field.value,
                    productCode: form.getValues(
                      `${itemType}.${index}.productCode`,
                    ),
                  }}
                  onChange={(id, item) => {
                    if (item) {
                      field.onChange(item.name)
                      form.setValue(
                        `${itemType}.${index}.productCode`,
                        item.productCode || '',
                      )
                      form.setValue(
                        itemType === 'packagingItems'
                          ? `${itemType}.${index}.packaging`
                          : `${itemType}.${index}.product`,
                        id,
                      )
                      if (item.unit || item.packagingUnit) {
                        form.setValue(
                          `${itemType}.${index}.unitMeasure`,
                          item.unit || item.packagingUnit,
                        )
                      }
                    } else {
                      field.onChange('')
                      form.setValue(
                        itemType === 'packagingItems'
                          ? `${itemType}.${index}.packaging`
                          : `${itemType}.${index}.product`,
                        '',
                      )
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </td>

      {/* --- UNITATE DE MĂSURĂ --- */}
      <td className='px-2 py-1 w-[80px]'>
        <FormField
          control={form.control}
          name={`${itemType}.${index}.unitMeasure`}
          render={({ field }) => (
            <FormItem>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className='h-8'>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </td>

      {/* --- CANTITATE (MODIFICAT PENTRU NEGATIV) --- */}
      <td className='px-2 py-1 w-[100px]'>
        <FormField
          control={form.control}
          name={`${itemType}.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type='number'
                  {...field}
                  onChange={(e) => {
                    const val = e.target.value
                    // Permitem string gol sau "-" simplu
                    if (val === '' || val === '-') {
                      field.onChange(val)
                    } else {
                      field.onChange(parseFloat(val))
                    }
                  }}
                  className='h-8 text-right font-medium'
                />
              </FormControl>
            </FormItem>
          )}
        />
      </td>

      {/* --- PREȚ (MODIFICAT PENTRU NEGATIV) --- */}
      <td className='px-2 py-1 w-[120px]'>
        <FormField
          control={form.control}
          name={`${itemType}.${index}.invoicePricePerUnit`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type='number'
                  {...field}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || val === '-') {
                      field.onChange(val)
                    } else {
                      field.onChange(parseFloat(val))
                    }
                  }}
                  className='h-8 text-right'
                />
              </FormControl>
            </FormItem>
          )}
        />
      </td>

      {/* --- COTA TVA --- */}
      <td className='px-2 py-1 w-[100px]'>
        <FormField
          control={form.control}
          name={`${itemType}.${index}.vatRate`}
          render={({ field }) => (
            <FormItem>
              <Select
                onValueChange={(v) => field.onChange(Number(v))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger className='h-8'>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vatRates.map((r) => (
                    <SelectItem key={r._id} value={r.rate.toString()}>
                      {r.rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </td>

      {/* --- TOTAL LINIE (READ ONLY) --- */}
      <td className='px-2 py-1 text-right font-mono text-sm w-[120px] font-bold'>
        {formatCurrency(lineValue)}
      </td>

      {/* --- DELETE BUTTON --- */}
      <td className='px-2 py-1 text-center w-[50px]'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-destructive hover:bg-destructive/10'
          onClick={onRemove}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </td>
    </tr>
  )
}
