'use client'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { IClientDoc } from '@/lib/db/modules/client/types'
import { useFormContext, useWatch } from 'react-hook-form'
import { ClientSelector } from '../ClientSelector'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EntitySelectorProps {
  onClientSelect: (client: IClientDoc | null) => void
  selectedClient: IClientDoc | null
}

export function EntitySelector({
  onClientSelect,
  selectedClient,
}: EntitySelectorProps) {
  const { control } = useFormContext()
  const entityType = useWatch({ control, name: 'entityType' })

  return (
    <div className='space-y-4'>
      <FormField
        control={control}
        name='entityType'
        render={({ field }) => (
          <FormItem className='flex items-center space-x-4'>
            <FormLabel className='whitespace-nowrap text-md'>
              Comandă pentru:
            </FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue='client'
                className='flex items-center space-x-4'
              >
                {/* --- OPȚIUNEA "CLIENT" --- */}
                <FormItem className='flex items-center space-x-2 space-y-0'>
                  <FormControl>
                    <RadioGroupItem value='client' />
                  </FormControl>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <FormLabel className='font-normal cursor-help'>
                          Client
                        </FormLabel>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className='max-w-xs text-secondary-foreground'>
                          Alegeți <b>Client</b> pentru comenzi standard,
                          destinate unei singure entități juridice. Fiecare
                          adresa este considerata un proiect separat.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormItem>

                {/* --- OPȚIUNEA "PROIECT"  --- */}
                <FormItem className='flex items-center space-x-2 space-y-0'>
                  <FormControl>
                    <RadioGroupItem value='project' />
                  </FormControl>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <FormLabel className='font-normal cursor-help'>
                          Proiect
                        </FormLabel>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className='max-w-xs text-secondary-foreground'>
                          Alegeți <b>Proiect</b> când comanda este pentru o
                          asociație de 2 sau mai mulți clienți, permițând
                          facturarea separată. Fiecare adresa este considerata
                          un proiect separat.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormItem>
              </RadioGroup>
            </FormControl>
          </FormItem>
        )}
      />

      {entityType === 'client' && (
        <ClientSelector
          onClientSelect={onClientSelect}
          selectedClient={selectedClient}
        />
      )}

      {entityType === 'project' && (
        <div className='p-4 border-dashed border rounded-md text-center text-muted-foreground'>
          <p>Selectorul pentru Proiecte va fi implementat aici.</p>
        </div>
      )}
    </div>
  )
}
