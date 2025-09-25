'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SeriesSchema } from '@/lib/db/modules/numbering/validator'
import { SeriesDTO, SeriesFormData } from '@/lib/db/modules/numbering/types'

const DOCUMENT_TYPES = [
  { value: 'Factura', label: 'Factură' },
  { value: 'FacturaStorno', label: 'Factură Storno' },
  { value: 'Proforma', label: 'Proformă' },
  { value: 'Aviz', label: 'Aviz' },
  { value: 'NIR', label: 'NIR' },
  { value: 'Chitanta', label: 'Chitanță' },
  { value: 'BonConsum', label: 'Bon de Consum' },
  { value: 'DispozitiePlata', label: 'Dispoziție de Plată' },
]

interface SeriesFormProps {
  onSave: (data: SeriesFormData, seriesId?: string) => void
  isSaving: boolean
  onClose: () => void
  initialData?: SeriesDTO | null
}

export function SeriesForm({
  onSave,
  isSaving,
  onClose,
  initialData,
}: SeriesFormProps) {
  const form = useForm<SeriesFormData>({
    resolver: zodResolver(SeriesSchema),
    defaultValues: initialData || {
      name: '',
      documentType: undefined,
    },
  })

  const handleSubmit = (data: SeriesFormData) => {
    onSave(data, initialData?._id)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nume Serie</FormLabel>
              <FormControl>
                <Input
                  placeholder='ex: FACT, BVB'
                  {...field}
                  style={{ textTransform: 'uppercase' }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='documentType'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tip Document</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Alege tipul documentului...' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Generam optiunile din lista definita mai sus */}
                  {DOCUMENT_TYPES.map((docType) => (
                    <SelectItem key={docType.value} value={docType.value}>
                      {docType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='flex justify-end gap-2 pt-4'>
          <Button type='button' variant='ghost' onClick={onClose}>
            Anulează
          </Button>
          <Button type='submit' disabled={isSaving}>
            {isSaving ? 'Se salvează...' : 'Salvează'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
