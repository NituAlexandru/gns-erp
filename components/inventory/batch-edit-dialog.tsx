'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { updateBatchDetails } from '@/lib/db/modules/inventory/inventory.actions'
import { toast } from 'sonner'
import { PopulatedBatch } from '@/lib/db/modules/inventory/types' // Importul corect
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { MultiStringInput } from '@/app/admin/management/reception/multi-string-input'

interface BatchEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: PopulatedBatch
  inventoryItemId: string
}

interface BatchFormValues {
  qualityDetails: {
    lotNumbers: string[]
    certificateNumbers: string[]
    testReports: string[]
    additionalNotes: string
  }
}

export function BatchEditDialog({
  open,
  onOpenChange,
  batch,
  inventoryItemId,
}: BatchEditDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<BatchFormValues>({
    defaultValues: {
      qualityDetails: {
        lotNumbers: batch?.qualityDetails?.lotNumbers || [],
        certificateNumbers: batch?.qualityDetails?.certificateNumbers || [],
        testReports: batch?.qualityDetails?.testReports || [],
        additionalNotes: batch?.qualityDetails?.additionalNotes || '',
      },
    },
  })

  // Resetăm formularul când se schimbă lotul
  useEffect(() => {
    if (batch) {
      form.reset({
        qualityDetails: {
          lotNumbers: batch.qualityDetails?.lotNumbers || [],
          certificateNumbers: batch.qualityDetails?.certificateNumbers || [],
          testReports: batch.qualityDetails?.testReports || [],
          additionalNotes: batch.qualityDetails?.additionalNotes || '',
        },
      })
    }
  }, [batch, form])

  const onSubmit = async (data: BatchFormValues) => {
    setLoading(true)
    try {
      const batchIdentifier = batch.movementId.toString()

      const result = await updateBatchDetails(
        inventoryItemId,
        batchIdentifier,
        {
          lotNumbers: data.qualityDetails.lotNumbers,
          certificateNumbers: data.qualityDetails.certificateNumbers,
          testReports: data.qualityDetails.testReports,
          additionalNotes: data.qualityDetails.additionalNotes,
        }
      )

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error(error)
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[800px]'>
        <DialogHeader>
          <DialogTitle>Adauga / Editeaza Detalii Note Calitate Lot</DialogTitle>
          <DialogDescription>
            Modificați certificatele, șarjele și rapoartele asociate acestui
            lot.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 py-2'
          >
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* 1. Certificate */}
              <div className='bg-muted/30 p-3 rounded-md border border-dashed border-border'>
                <MultiStringInput
                  control={form.control}
                  name='qualityDetails.certificateNumbers'
                  label='Certificate Conformitate / Calitate'
                  placeholder='Ex: CE-1029 (Enter)'
                />
              </div>

              {/* 2. Loturi */}
              <div className='bg-muted/30 p-3 rounded-md border border-dashed border-border'>
                <MultiStringInput
                  control={form.control}
                  name='qualityDetails.lotNumbers'
                  label='Șarje / Loturi Producție'
                  placeholder='Ex: A55, B-2024 (Enter)'
                />
              </div>

              {/* 3. Rapoarte */}
              <div className='bg-muted/30 p-3 rounded-md border border-dashed border-border'>
                <MultiStringInput
                  control={form.control}
                  name='qualityDetails.testReports'
                  label='Declaratie / Rapoarte Încercări'
                  placeholder='Ex: Raport Lab 55 (Enter)'
                />
              </div>

              {/* 4. Note */}
              <div className='bg-muted/30 p-3 rounded-md border border-dashed border-border'>
                <FormField
                  name='qualityDetails.additionalNotes'
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold text-muted-foreground'>
                        Note Adiționale Calitate
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className='h-[82px] resize-none text-sm bg-background'
                          placeholder='Alte detalii relevante...'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                Anulează
              </Button>
              <Button type='submit' disabled={loading}>
                {loading ? 'Se salvează...' : 'Salvează Modificări'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
