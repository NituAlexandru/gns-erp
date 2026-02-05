'use client'

import {
  useFieldArray,
  Control,
  useWatch,
  UseFormSetValue,
} from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, PlusCircle, Calculator } from 'lucide-react'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
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
  setValue: UseFormSetValue<InvoiceFormValues>
  unitsOfMeasure: string[]
  vatRates: number[]
  defaultVat: number
  invoiceCurrency: string
  exchangeRate: number
}

interface LineItemProps {
  control: Control<InvoiceFormValues>
  setValue: UseFormSetValue<InvoiceFormValues>
  index: number
  remove: (index: number) => void
  unitsOfMeasure: string[]
  vatRates: number[]
  invoiceCurrency: string
  exchangeRate: number
}

function LineItem({
  control,
  setValue,
  index,
  remove,
  unitsOfMeasure,
  vatRates,
  invoiceCurrency,
  exchangeRate,
}: LineItemProps) {
  // Monitorizăm valorile pentru a face calculele vizuale în timp real
  const [quantity, unitPrice, originalCurrencyAmount, vatRate] = useWatch({
    control,
    name: [
      `items.${index}.quantity`,
      `items.${index}.unitPrice`,
      `items.${index}.originalCurrencyAmount`,
      `items.${index}.vatRateDetails.rate`,
    ],
  })

  const isForeign = invoiceCurrency !== 'RON'

  // Calculăm totalurile liniei pentru afișare
  const lineValueRon = round2((quantity || 0) * (unitPrice || 0))
  const vatValueRon = round2(lineValueRon * ((vatRate || 0) / 100))
  const lineTotalRon = round2(lineValueRon + vatValueRon)

  const lineTotalForeign = isForeign
    ? round2(
        (quantity || 0) *
          (originalCurrencyAmount || 0) *
          (1 + (vatRate || 0) / 100),
      )
    : 0

  return (
    <div className='flex w-full items-start gap-3'>
      {/* 1. Nume Produs (35%) */}
      <div className='flex-shrink-0 w-[35%]'>
        <FormField
          control={control}
          name={`items.${index}.productName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] font-normal text-muted-foreground px-1'>
                Produs/Serviciu
              </FormLabel>
              <FormControl>
                <Input placeholder='Nume Produs/Serviciu' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 2. Cantitate (8%) */}
      <div className='flex-shrink-0 w-[8%]'>
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] font-normal text-muted-foreground px-1 text-center block'>
                Cant.
              </FormLabel>
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

      {/* 3. UM (8%) */}
      <div className='flex-shrink-0 w-[8%]'>
        <FormField
          control={control}
          name={`items.${index}.unitOfMeasure`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] font-normal text-muted-foreground px-1 text-center block'>
                UM
              </FormLabel>
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

      {/* 4. PREȚ UNITAR */}
      <div className='flex-shrink-0 w-[15%] ml-7'>
        <FormField
          control={control}
          name={
            isForeign
              ? `items.${index}.originalCurrencyAmount`
              : `items.${index}.unitPrice`
          }
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] font-normal text-muted-foreground px-1'>
                {isForeign ? `Preț ${invoiceCurrency}` : 'Preț RON'}
              </FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    type='number'
                    step='0.01'
                    placeholder='Preț'
                    className={
                      isForeign ? 'bg-background font-semibold pr-8' : ''
                    }
                    {...field}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      field.onChange(val)
                      if (isForeign) {
                        setValue(
                          `items.${index}.unitPrice`,
                          round2(val * exchangeRate),
                        )
                      }
                    }}
                  />
                  {isForeign && (
                    <span className='absolute right-2 top-2 text-xs text-muted-foreground font-bold opacity-70'>
                      {invoiceCurrency}
                    </span>
                  )}
                </div>
              </FormControl>

              {/* Feedback vizual RON sub input */}
              {isForeign && (
                <div className='flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground'>
                  <Calculator className='h-3 w-3 opacity-50' />
                  <span className='font-mono'>
                    {formatCurrency(round2((field.value || 0) * exchangeRate))}
                  </span>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 5. Cota TVA (%) (8%) */}
      <div className='flex-shrink-0 w-[8%]'>
        <FormField
          control={control}
          name={`items.${index}.vatRateDetails.rate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] font-normal text-muted-foreground px-1 text-center block'>
                TVA %
              </FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='TVA' />
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

      {/* 6. Total Linie */}
      <div className='flex-shrink-0 w-[15%]'>
        <div className='h-full flex flex-col justify-end items-end pb-2'>
          {/* Total RON - formatCurrency pune "RON" automat */}
          <span className='text-sm font-bold text-foreground'>
            {formatCurrency(lineTotalRon)}
          </span>

          {/* Total Valută - punem noi simbolul manual */}
          {isForeign && (
            <span className='text-[10px] text-muted-foreground'>
              {lineTotalForeign.toLocaleString('ro-RO', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {invoiceCurrency}
            </span>
          )}
        </div>
      </div>

      {/* 7. Buton Ștergere */}
      <div className='flex-shrink-0 pt-7'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='text-destructive hover:bg-destructive/10'
          onClick={() => remove(index)}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}

export function SupplierInvoiceLineEditor({
  control,
  setValue,
  unitsOfMeasure,
  vatRates,
  defaultVat,
  invoiceCurrency,
  exchangeRate,
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
      originalCurrencyAmount: 0,
      lineValue: 0,
      vatRateDetails: { rate: defaultVat, value: 0 },
      lineTotal: 0,
    })
  }

  return (
    <div className='space-y-4'>
      {/* Header-ul Tabelului (Doar vizual) */}
      <div className='hidden text-xs font-medium text-muted-foreground md:flex w-full gap-3 border-b pb-1'>
        {/* Header-urile sunt acum pe labels individuale în LineItem pentru responsive, 
              dar poți păstra un header global dacă preferi. 
              Momentan l-am lăsat gol/ascuns pentru că folosim labels pe fiecare input 
              ca să ne asigurăm că se aliniază perfect. */}
      </div>

      <div className='space-y-2'>
        {fields.map((field, index) => (
          <LineItem
            key={field.id}
            control={control}
            setValue={setValue}
            index={index}
            remove={remove}
            unitsOfMeasure={unitsOfMeasure}
            vatRates={vatRates}
            invoiceCurrency={invoiceCurrency}
            exchangeRate={exchangeRate}
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
