'use client'

import { useState } from 'react'
import { useFieldArray, Control } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormLabel } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'

interface MultiStringInputProps {
  control: Control<any>
  name: string
  label: string
  placeholder: string
}

export function MultiStringInput({
  control,
  name,
  label,
  placeholder,
}: MultiStringInputProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  })

  const [currentValue, setCurrentValue] = useState('')

  const handleAdd = () => {
    if (currentValue.trim()) {
      append(currentValue.trim())
      setCurrentValue('')
    }
  }

  return (
    <div className='space-y-2'>
      <FormLabel className='text-xs font-semibold text-muted-foreground'>
        {label}
      </FormLabel>
      <div className='flex gap-2'>
        <Input
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder={placeholder}
          className='h-8 text-sm'
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault() 
              handleAdd()
            }
          }}
        />
        <Button
          type='button'
          onClick={handleAdd}
          size='sm'
          variant='secondary'
          className='h-8 px-3'
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>

      {/* Lista de elemente adăugate */}
      <div className='flex flex-wrap gap-2 mt-2'>
        {fields.map((field, index) => {
          return (
            <Badge
              key={field.id}
              variant='secondary'
              className='pr-1 gap-1 font-normal'
            >
              {/* Afișăm valoarea folosind o componentă care face watch pe acest index specific */}
              <WatchStringValue control={control} name={`${name}.${index}`} />
              <button
                type='button'
                onClick={() => remove(index)}
                className='ml-1 rounded-full p-0.5 hover:bg-destructive hover:text-white transition-colors'
              >
                <X className='h-3 w-3' />
              </button>
            </Badge>
          )
        })}
      </div>
    </div>
  )
}

import { useWatch } from 'react-hook-form'

function WatchStringValue({ control, name }: { control: any; name: string }) {
  const value = useWatch({
    control,
    name,
  })
  return <span>{value}</span>
}
