'use client'

import { useFieldArray, Control, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, PlusCircle } from 'lucide-react'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, round2 } from '@/lib/utils'
import { InvoiceFormValues } from './CreateSupplierInvoiceForm'

interface SupplierInvoiceLineEditorProps {
  control: Control<InvoiceFormValues>
  unitsOfMeasure: string[]
  vatRates: number[]
  defaultVat: number
}

interface LineItemProps {
  control: Control<InvoiceFormValues>
  index: number
  remove: (index: number) => void
  unitsOfMeasure: string[]
  vatRates: number[]
}

function LineItem({
  control,
  index,
  remove,
  unitsOfMeasure,
  vatRates,
}: LineItemProps) {
  const [quantity, unitPrice, vatRate] = useWatch({
    control,
    name: [
      `items.${index}.quantity`,
      `items.${index}.unitPrice`,
      `items.${index}.vatRateDetails.rate`,
    ],
  })

  const lineValue = round2((quantity || 0) * (unitPrice || 0))
  const vatValue = round2(lineValue * ((vatRate || 0) / 100))
  const lineTotal = round2(lineValue + vatValue)

  return (
    <div className='flex w-full items-start gap-3'>
      {/* Nume Produs (35%) */}
      <div className='flex-shrink-0 w-[35%]'>
        <FormField
          control={control}
          name={`items.${index}.productName`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder='Nume Produs/Serviciu' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Cantitate (8%) */}
      <div className='flex-shrink-0 w-[8%]'>
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type='number'
                  placeholder='Cant.'
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* UM (8%) */}
      <div className='flex-shrink-0 w-[8%]'>
        <FormField
          control={control}
          name={`items.${index}.unitOfMeasure`}
          render={({ field }) => (
            <FormItem>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='UM' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {unitsOfMeasure.map((um) => (
                    <SelectItem key={um} value={um}>
                      {um}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Preț Unitar (15%) */}
      <div className='flex-shrink-0 w-[15%] ml-7'>
        <FormField
          control={control}
          name={`items.${index}.unitPrice`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  placeholder='Preț Unitar'
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Cota TVA (%) (8%) */}
      <div className='flex-shrink-0 w-[8%]'>
        <FormField
          control={control}
          name={`items.${index}.vatRateDetails.rate`}
          render={({ field }) => (
            <FormItem>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='TVA %' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vatRates.map((rate) => (
                    <SelectItem key={rate} value={String(rate)}>
                      {rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Total Linie (calculat) (15%) */}
      <div className='flex-shrink-0 w-[15%]'>
        <div className='h-10 px-3 text-right text-sm font-bold flex items-center justify-end text-foreground'>
          {formatCurrency(lineTotal)}
        </div>
      </div>

      {/* Buton Ștergere (flex-shrink-0) */}
      <div className='flex-shrink-0 pt-2'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='text-primary'
          onClick={() => remove(index)}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}

// Componenta principală a editorului
export function SupplierInvoiceLineEditor({
  control,
  unitsOfMeasure,
  vatRates,
  defaultVat,
}: SupplierInvoiceLineEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const addNewLine = () => {
    append({
      productName: '',
      quantity: 1,
      unitOfMeasure: 'bucata',
      unitPrice: 0,
      lineValue: 0,
      vatRateDetails: { rate: defaultVat, value: 0 },
      lineTotal: 0,
    })
  }

  return (
    <div className='space-y-4'>
      {/* Antetul (Flex) */}
      <div className='hidden text-xs font-medium text-muted-foreground md:flex w-full gap-3 border-b pb-1'>
        <span className='flex-shrink-0 w-[35%]'>Produs/Serviciu</span>
        <span className='flex-shrink-0 w-[8%] text-center'>Cant.</span>
        <span className='flex-shrink-0 w-[8%] text-center'>UM</span>
        <span className='flex-shrink-0 w-[15%] text-center'>Preț Unitar</span>
        <span className='flex-shrink-0 w-[8%] text-center'>TVA %</span>
        <span className='flex-shrink-0 w-[15%] text-right'>Total Linie</span>
        <span className='flex-shrink-0'></span>
        {/* Spațiu pentru buton (calculat automat de flex) */}
      </div>

      <div className='space-y-2'>
        {fields.map((field, index) => (
          <LineItem
            key={field.id}
            control={control}
            index={index}
            remove={remove}
            unitsOfMeasure={unitsOfMeasure}
            vatRates={vatRates}
          />
        ))}
      </div>

      <Button
        type='button'
        variant='outline'
        className='gap-2'
        onClick={addNewLine}
      >
        <PlusCircle size={18} />
        Adaugă Linie Nouă
      </Button>
    </div>
  )
}
