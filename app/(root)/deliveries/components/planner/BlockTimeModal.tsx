'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { DELIVERY_SLOTS } from '@/lib/db/modules/deliveries/constants'
import { useTransition } from 'react'
import {
  ABLY_API_ENDPOINTS,
  ABLY_CHANNELS,
  ABLY_EVENTS,
} from '@/lib/db/modules/ably/constants'
import {
  CreateBlockInput,
  CreateBlockSchema,
} from '@/lib/db/modules/deliveries/availability/validator'
import { createTimeBlock } from '@/lib/db/modules/deliveries/availability/availability.actions'
import { useRouter } from 'next/navigation'

interface BlockTimeModalProps {
  isOpen: boolean
  onClose: () => void
  assignmentId: string
  date: Date
  initialSlot?: string
}

type DeliverySlotType = (typeof DELIVERY_SLOTS)[number]

export function BlockTimeModal({
  isOpen,
  onClose,
  assignmentId,
  date,
  initialSlot,
}: BlockTimeModalProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const validInitialSlots: DeliverySlotType[] =
    initialSlot && DELIVERY_SLOTS.includes(initialSlot as DeliverySlotType)
      ? [initialSlot as DeliverySlotType]
      : []

  const form = useForm<CreateBlockInput>({
    resolver: zodResolver(CreateBlockSchema),
    defaultValues: {
      assignmentId,
      date,
      slots: validInitialSlots,
      type: 'ALTELE',
      note: '',
    },
  })

  const onSubmit = (data: CreateBlockInput) => {
    startTransition(async () => {
      const res = await createTimeBlock(data)
      if (res.success) {
        toast.success(res.message)
        try {
          await fetch(ABLY_API_ENDPOINTS.PUBLISH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: ABLY_CHANNELS.PLANNER,
              event: ABLY_EVENTS.DATA_CHANGED,
              data: { message: 'Rezervare adăugată' },
            }),
          })
        } catch (e) {
          console.error(e)
        }
        router.refresh()
        onClose()
        form.reset()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adaugă Notiță / Rezervă Interval</DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Selectează tipul de indisponibilitate și intervalele orare afectate.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='ITP'>ITP</SelectItem>
                      <SelectItem value='SERVICE'>Service</SelectItem>
                      <SelectItem value='CONCEDIU'>Concediu</SelectItem>
                      <SelectItem value='ALTELE'>Altele / Notiță</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='note'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalii (Opțional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='Ex: Schimb ulei, ITP RAR Grivița...'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='slots'
              render={() => (
                <FormItem>
                  <div className='mb-2'>
                    <FormLabel>Intervale Rezervate</FormLabel>
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    {DELIVERY_SLOTS.filter((s) => s !== '08:00 - 17:00').map(
                      (slot) => (
                        <FormField
                          key={slot}
                          control={form.control}
                          name='slots'
                          render={({ field }) => {
                            return (
                              <FormItem className='flex flex-row items-center space-x-2 space-y-0'>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(
                                      slot as DeliverySlotType
                                    )}
                                    onCheckedChange={(checked) => {
                                      const currentValues = field.value || []
                                      let newValues: DeliverySlotType[]

                                      if (checked) {
                                        newValues = [
                                          ...currentValues,
                                          slot as DeliverySlotType,
                                        ]
                                      } else {
                                        newValues = currentValues.filter(
                                          (value) => value !== slot
                                        )
                                      }
                                      field.onChange(newValues)
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className='font-normal text-xs cursor-pointer'>
                                  {slot}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      )
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type='submit' disabled={isPending}>
                Salvează Rezervare
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
