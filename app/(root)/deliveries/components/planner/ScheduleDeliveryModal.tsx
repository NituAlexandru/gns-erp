'use client'

import { useTransition, useEffect, useMemo, useState } from 'react'
import { useForm, Controller, FormProvider, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { CalendarIcon, Loader2, Save, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { format, isWeekend, startOfDay } from 'date-fns'
import { ro } from 'date-fns/locale'
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { IPopulatedAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { DELIVERY_SLOTS } from '@/lib/db/modules/deliveries/constants'
import {
  ScheduleDeliverySchema,
  ScheduleDeliveryInput,
} from '@/lib/db/modules/deliveries/planner-validator'
import {
  scheduleDelivery,
  unassignDelivery,
} from '@/lib/db/modules/deliveries/delivery.actions'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ITrailerDoc } from '@/lib/db/modules/fleet/trailers/types'
import {
  ABLY_API_ENDPOINTS,
  ABLY_CHANNELS,
  ABLY_EVENTS,
} from '@/lib/db/modules/ably/constants'

interface ScheduleDeliveryModalProps {
  isOpen: boolean
  onClose: () => void
  delivery: IDelivery | null
  assignments: IPopulatedAssignmentDoc[]
  assignedDeliveries: IDelivery[]
  availableTrailers: ITrailerDoc[]
}

type DeliverySlot = (typeof DELIVERY_SLOTS)[number]
type DisplaySlot = Exclude<DeliverySlot, '08:00 - 17:00'>

function isDeliverySlot(slot: unknown): slot is DeliverySlot {
  return (DELIVERY_SLOTS as readonly string[]).includes(slot as string)
}

const displaySlots = DELIVERY_SLOTS.filter((slot) => slot !== '08:00 - 17:00')
const totalDisplaySlots = displaySlots.length

function areSlotsConsecutive(slots: string[]): boolean {
  if (slots.length <= 1) {
    return true
  }

  // 1. Obține indicii sloturilor selectate din lista 'displaySlots'
  const indices = slots
    .map((slot) => displaySlots.indexOf(slot as DisplaySlot))
    .filter((index) => index !== -1)

  // Trebuie să avem același număr de indici ca și sloturi
  if (indices.length !== slots.length) {
    console.error('Eroare: Unele sloturi selectate nu sunt în displaySlots.')
    return false
  }

  // 2. Sortează indicii (deși ar trebui să fie deja sortați de map)
  indices.sort((a, b) => a - b)

  // 3. Verifică secvența
  const minIndex = indices[0]
  const maxIndex = indices[indices.length - 1]

  // 4. Compară lungimea așteptată cu cea reală
  // ex: [1, 2, 3] -> max(3) - min(1) + 1 = 3. Lungime 3. Corect.
  // ex: [1, 3] -> max(3) - min(1) + 1 = 3. Lungime 2. Incorect.
  const expectedLength = maxIndex - minIndex + 1
  const actualLength = indices.length

  return actualLength === expectedLength
}

export function ScheduleDeliveryModal({
  isOpen,
  onClose,
  delivery,
  assignments,
  assignedDeliveries,
  availableTrailers,
}: ScheduleDeliveryModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const form = useForm<ScheduleDeliveryInput>({
    resolver: zodResolver(ScheduleDeliverySchema),
    defaultValues: {
      deliveryDate: undefined,
      deliverySlots: [],
      assemblyId: undefined,
      trailerId: undefined,
      deliveryNotes: '',
    },
  })

  const { reset } = form

  // 1. Un useEffect care populează formularul DOAR când se schimbă livrarea
  useEffect(() => {
    if (delivery) {
      const validSlots = Array.isArray(delivery.deliverySlots)
        ? delivery.deliverySlots.filter(isDeliverySlot)
        : []

      const requestedValidSlots = Array.isArray(delivery.requestedDeliverySlots)
        ? delivery.requestedDeliverySlots.filter(isDeliverySlot)
        : []

      const initialDate = delivery.deliveryDate
        ? new Date(delivery.deliveryDate)
        : new Date(delivery.requestedDeliveryDate)

      const initialSlots =
        validSlots.length > 0 ? validSlots : requestedValidSlots

      reset({
        deliveryDate: initialDate,
        deliverySlots: initialSlots,
        assemblyId: delivery.assemblyId?.toString() || undefined,
        deliveryNotes: delivery.deliveryNotes || '',
      })
    }
  }, [delivery, reset])

  // 2. Un useEffect care resetează formularul DOAR când se închide modalul
  useEffect(() => {
    if (!isOpen) {
      // Resetăm formularul la valorile default CÂND se închide
      reset({
        deliveryDate: undefined,
        deliverySlots: [],
        assemblyId: undefined,
        deliveryNotes: '',
      })
    } // Depinde DOAR de 'isOpen'.
  }, [isOpen, reset])

  const selectedAssemblyId = useWatch({
    control: form.control,
    name: 'assemblyId',
  })
  const selectedDate = useWatch({ control: form.control, name: 'deliveryDate' })

  const { setValue } = form
  useEffect(() => {
    // Găsim ansamblul selectat în lista completă
    const selectedAsm = assignments.find(
      (asm) => asm._id === selectedAssemblyId
    )

    if (selectedAsm) {
      // Verificăm dacă ansamblul are o remorcă POPULATĂ
      if (selectedAsm.trailerId && typeof selectedAsm.trailerId === 'object') {
        // Dacă da, setăm valoarea selectorului de remorcă la ID-ul ei
        setValue('trailerId', selectedAsm.trailerId._id.toString())
      } else {
        // Dacă ansamblul NU are remorcă, setăm "Fără Remorcă"
        setValue('trailerId', 'none')
      }
    } else {
      // Dacă se deselectează ansamblul, resetăm și remorca
      setValue('trailerId', undefined)
    }
  }, [selectedAssemblyId, assignments, setValue])

  const blockedSlots = useMemo(() => {
    if (!selectedAssemblyId || !selectedDate) {
      return []
    }

    const selectedDayStart = startOfDay(selectedDate)

    // 1. Găsim TOATE sloturile ocupate de ALTE livrări (active)
    // pentru același ansamblu, în aceeași zi
    const occupiedSlots = assignedDeliveries
      .filter(
        (d) =>
          d._id.toString() !== delivery?._id.toString() &&
          d.status !== 'CANCELLED' &&
          d.assemblyId?.toString() === selectedAssemblyId &&
          d.deliveryDate &&
          startOfDay(new Date(d.deliveryDate)).getTime() ===
            selectedDayStart.getTime()
      )
      .flatMap((d) => d.deliverySlots || [])

    const uniqueOccupiedSlots = [...new Set(occupiedSlots)]

    // 2. Verificăm dacă "Toată Ziua" este deja ocupat
    if (uniqueOccupiedSlots.includes('08:00 - 17:00')) {
      // Dacă "Toată Ziua" e blocat, returnăm TOATE sloturile ca fiind blocate
      return [...DELIVERY_SLOTS]
    }

    // 3. Verificăm dacă vreun slot individual e ocupat
    // Filtrăm 'Toată Ziua' pentru a obține doar sloturile individuale
    const individualOccupiedSlots = uniqueOccupiedSlots.filter(
      (slot) => slot !== '08:00 - 17:00'
    )

    if (individualOccupiedSlots.length > 0) {
      // Dacă e ocupat cel puțin un slot individual,
      // returnăm sloturile individuale PLUS slotul "Toată Ziua"
      return [...individualOccupiedSlots, '08:00 - 17:00']
    }

    // 4. Dacă nu e nimic ocupat, returnăm un array gol
    return []
  }, [selectedAssemblyId, selectedDate, assignedDeliveries, delivery])

  // --- Sortăm lista de ansambluri ---
  const availableSortedAssignments = useMemo(() => {
    // Avem nevoie de data selectată pentru a ști pentru ce zi filtrăm
    // selectedDate vine de la useWatch (linia 129)
    if (!selectedDate) {
      // Dacă data nu e selectată, returnăm lista doar sortată
      return [...assignments].sort(
        (a: IPopulatedAssignmentDoc, b: IPopulatedAssignmentDoc) => {
          const typeA =
            a.vehicleId && typeof a.vehicleId === 'object'
              ? a.vehicleId.carType
              : ''
          const typeB =
            b.vehicleId && typeof b.vehicleId === 'object'
              ? b.vehicleId.carType
              : ''
          return typeA.localeCompare(typeB)
        }
      )
    }

    const selectedDayStart = startOfDay(selectedDate)

    // 1. Creăm o hartă a sloturilor UTILIZATE de fiecare ansamblu
    const slotUsage = new Map<string, Set<string>>() // <assemblyId, Set<SlotString>>

    for (const d of assignedDeliveries) {
      if (
        d.status === 'CANCELLED' ||
        !d.assemblyId ||
        !d.deliverySlots ||
        !d.deliveryDate ||
        startOfDay(new Date(d.deliveryDate)).getTime() !==
          selectedDayStart.getTime()
      ) {
        continue
      }

      const asmId = d.assemblyId.toString()
      if (!slotUsage.has(asmId)) {
        slotUsage.set(asmId, new Set())
      }
      const currentSlots = slotUsage.get(asmId)!

      if (d.deliverySlots.includes('08:00 - 17:00')) {
        displaySlots.forEach((slot) => currentSlots.add(slot))
      } else {
        d.deliverySlots.forEach((slot) => currentSlots.add(slot))
      }
    }

    // 2. Filtrăm și Sortăm lista principală de ansambluri
    return [...assignments]
      .filter((asm) => {
        // Verificăm dacă ansamblul curent este cel deja selectat pentru această livrare
        const isCurrentlySelected =
          asm._id.toString() === delivery?.assemblyId?.toString()

        // Îl lăsăm în listă dacă e cel selectat (să poată fi văzut/salvat din nou)
        if (isCurrentlySelected) {
          return true
        }

        const usedSlots = slotUsage.get(asm._id.toString())
        // Dacă un ansamblu nu e pe hartă, nu are nicio livrare azi -> e disponibil
        if (!usedSlots) {
          return true
        }

        // Dacă numărul de sloturi unice ocupate e mai mic decât totalul, e disponibil
        return usedSlots.size < totalDisplaySlots
      })
      .sort((a: IPopulatedAssignmentDoc, b: IPopulatedAssignmentDoc) => {
        const typeA =
          a.vehicleId && typeof a.vehicleId === 'object'
            ? a.vehicleId.carType
            : ''
        const typeB =
          b.vehicleId && typeof b.vehicleId === 'object'
            ? b.vehicleId.carType
            : ''
        return typeA.localeCompare(typeB)
      })
  }, [assignments, assignedDeliveries, selectedDate, delivery])

  // Creăm o hartă <TrailerID, VehicleNumber>
  // pentru a ști ce remorcă e deja într-un ansamblu
  const assignedTrailerMap = useMemo(() => {
    const map = new Map<string, string>() // <trailerId, vehicleNumber>

    for (const asm of assignments) {
      // Verificăm dacă ansamblul are o remorcă ȘI o mașină
      // și dacă ambele sunt populate ca obiecte
      if (
        asm.trailerId &&
        typeof asm.trailerId === 'object' &&
        asm.vehicleId &&
        typeof asm.vehicleId === 'object'
      ) {
        const trailerId = asm.trailerId._id.toString()
        const vehicleNumber = asm.vehicleId.carNumber // Nr. mașinii din ansamblu

        if (trailerId && vehicleNumber) {
          map.set(trailerId, vehicleNumber)
        }
      }
    }
    return map
  }, [assignments])
  // --- Funcția de Salvare (Programare) ---
  const onSave = (data: ScheduleDeliveryInput) => {
    if (!delivery) return

    //

    if (data.deliveryDate) {
      // 1. Luăm data selectată din formular (care e 00:00 Local)
      const safeDate = new Date(data.deliveryDate)
      // 2. O setăm la ora 12:00 (Prânz) TIMP LOCAL
      // Astfel, când se convertește la UTC pentru server, va fi ~10:00 AM
      // Rămânând GARANTAT în aceeași zi.
      safeDate.setHours(12, 0, 0, 0)
      // 3. Actualizăm obiectul data înainte de a-l trimite
      data.deliveryDate = safeDate
    }

    startTransition(async () => {
      try {
        const result = await scheduleDelivery(delivery._id.toString(), data)
        if (result.success) {
          toast.success('Livrare programată cu succes!')
          router.refresh()
          onClose()

          try {
            await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}${ABLY_API_ENDPOINTS.PUBLISH}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  channel: ABLY_CHANNELS.PLANNER,
                  event: ABLY_EVENTS.DATA_CHANGED,
                  data: {
                    message: `Livrare ${delivery.deliveryNumber} programată.`, // Poți adăuga 'user' dacă îl preiei din 'useSession' aici
                  },
                }),
              }
            )
          } catch (ablyError) {
            console.error('Ably fetch trigger error (schedule):', ablyError)
          }
        } else {
          toast.error('Eroare la programare:', { description: result.message })
        }
      } catch {
        toast.error('Eroare neașteptată.')
      }
    })
  }

  // --- Funcția de Dezalocare ---
  const handleUnassign = () => {
    if (!delivery) return

    toast.warning('Dezalocare Livrare... ')

    startTransition(async () => {
      try {
        const result = await unassignDelivery(delivery._id.toString())
        if (result.success) {
          toast.success(
            'Livrare dezalocată și mutată înapoi la "De Programat".'
          )
          router.refresh()
          onClose()

          try {
            await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}${ABLY_API_ENDPOINTS.PUBLISH}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  channel: ABLY_CHANNELS.PLANNER,
                  event: ABLY_EVENTS.DATA_CHANGED,
                  data: {
                    message: `Livrare ${delivery.deliveryNumber} dezalocată.`,
                    deliveryId: delivery._id.toString(),
                    newStatus: 'CREATED',
                  },
                }),
              }
            )
          } catch (ablyError) {
            console.error('Ably fetch trigger error (unassign):', ablyError)
          }
        } else {
          toast.error('Eroare la dezalocare:', { description: result.message })
        }
      } catch {
        toast.error('Eroare neașteptată.')
      }
    })
  }

  const isScheduled = delivery?.status === 'SCHEDULED'
  const isReadOnly =
    delivery?.status === 'IN_TRANSIT' ||
    delivery?.status === 'DELIVERED' ||
    delivery?.status === 'INVOICED'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className='sm:max-w-5xl'
        onPointerDownOutside={(e) => {
          if (
            (e.target as HTMLElement).closest('[data-radix-popover-content]')
          ) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Programare / Asignare Livrare</DialogTitle>
          <DialogDescription>
            Comanda nr: {delivery?.orderNumber}{' '}
            <span className='text-red-500 '>|</span> Livrare nr: {''}
            {delivery?.deliveryNumber} <span className='text-red-500 '>|</span>{' '}
            Client: {delivery?.clientSnapshot.name}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className='space-y-6'>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* --- Coloana Stângă: Dată și Sloturi --- */}
              <div className='space-y-4'>
                {/* Data Programată */}
                <FormField
                  control={form.control}
                  name='deliveryDate'
                  render={({ field }) => (
                    <FormItem className='flex flex-col'>
                      <FormLabel>Dată Programată</FormLabel>
                      <Collapsible
                        open={isCalendarOpen}
                        onOpenChange={setIsCalendarOpen}
                      >
                        <CollapsibleTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'pl-3 text-left font-normal w-full',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ro })
                              ) : (
                                <span>Alege o dată</span>
                              )}
                              <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                            </Button>
                          </FormControl>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <Calendar
                            mode='single'
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date)
                              setIsCalendarOpen(false)
                            }}
                            disabled={(date) => isWeekend(date)}
                            initialFocus
                            className='mt-2 border rounded-md'
                          />
                        </CollapsibleContent>
                      </Collapsible>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sloturi Programate */}
                <Controller
                  control={form.control}
                  name='deliverySlots'
                  render={({ field }) => (
                    <FormItem>
                      <div className='grid grid-cols-3 gap-x-4 gap-y-2 max-h-[150px] overflow-y-auto pr-2'>
                        {DELIVERY_SLOTS.map((slot) => {
                          const isBlocked = blockedSlots.includes(slot)
                          const isChecked = (field.value || []).includes(slot)

                          return (
                            <FormItem
                              key={slot}
                              className={cn(
                                'flex flex-row items-center space-x-2 space-y-0 mb-2',
                                isBlocked && 'opacity-50'
                              )}
                            >
                              <FormControl>
                                <Checkbox
                                  checked={isChecked}
                                  disabled={
                                    (isBlocked && !isChecked) || isReadOnly
                                  }
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || []
                                    let newValue: string[]

                                    // --- LOGICA "TOATĂ ZIUA" ---
                                    if (slot === '08:00 - 17:00') {
                                      newValue = checked
                                        ? ['08:00 - 17:00']
                                        : []
                                      field.onChange(newValue)
                                      return
                                    }

                                    // --- LOGICA PENTRU SLOTURI INDIVIDUALE ---
                                    if (checked) {
                                      const potentialValue = [
                                        ...currentValue.filter(
                                          (s) => s !== '08:00 - 17:00'
                                        ),
                                        slot,
                                      ]

                                      // --- VALIDARE NOUĂ ---
                                      if (areSlotsConsecutive(potentialValue)) {
                                        field.onChange(potentialValue) // E consecutiv, permitem
                                      } else {
                                        // NU e consecutiv, arătăm eroare și NU actualizăm
                                        toast.warning('Selecție nevalidă', {
                                          description:
                                            'Intervalele orare trebuie să fie consecutive.',
                                        })
                                      }
                                      // --- SFÂRȘIT VALIDARE ---
                                    } else {
                                      // Când debifăm (SCOATEM)
                                      // Debifarea este întotdeauna permisă
                                      newValue = currentValue.filter(
                                        (value) => value !== slot
                                      )
                                      field.onChange(newValue)
                                    }
                                  }}
                                  // --- SFÂRȘIT MODIFICARE ---
                                />
                              </FormControl>
                              <FormLabel
                                className={cn(
                                  'font-normal text-sm whitespace-nowrap',
                                  isBlocked &&
                                    !isChecked &&
                                    'text-muted-foreground line-through'
                                )}
                              >
                                {slot}
                              </FormLabel>
                            </FormItem>
                          )
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* --- Coloana Dreaptă: Ansamblu și Note --- */}
              <div className='space-y-4'>
                {/* --- LOGICĂ AFISARE CÂMPURI --- */}
                {(() => {
                  const isSpecialDelivery =
                    delivery?.deliveryType === 'PICK_UP_SALE' ||
                    delivery?.isThirdPartyHauler === true

                  // Dacă e livrare specială, NU afișăm selectorii de flotă
                  if (isSpecialDelivery) {
                    return (
                      <div className='p-4 border rounded-md bg-muted/50 text-sm text-muted-foreground text-center'>
                        <p>
                          Această livrare nu necesită alocare pe flota proprie.
                        </p>
                        <p className='font-semibold mt-1'>
                          {delivery?.deliveryType === 'PICK_UP_SALE'
                            ? 'Ridicare de către Client'
                            : 'Transportator Terț'}
                        </p>
                      </div>
                    )
                  }

                  // Dacă e livrare normală (Flotă Proprie), afișăm selectorii
                  return (
                    <>
                      {/* Selectare Ansamblu */}
                      <FormField
                        control={form.control}
                        name='assemblyId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asignează Ansamblu</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ''}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder='Selectează șofer / mașină...' />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableSortedAssignments.map((asm) => {
                                  // ... (codul de randare itemi rămâne identic) ...
                                  const driver =
                                    asm.driverId &&
                                    typeof asm.driverId === 'object'
                                      ? asm.driverId.name
                                      : 'N/A'
                                  const vehicle =
                                    asm.vehicleId &&
                                    typeof asm.vehicleId === 'object'
                                      ? asm.vehicleId
                                      : null
                                  const trailer =
                                    asm.trailerId &&
                                    typeof asm.trailerId === 'object'
                                      ? asm.trailerId
                                      : null
                                  const details = [
                                    driver,
                                    vehicle?.carNumber || 'N/A',
                                    trailer?.licensePlate,
                                  ]
                                    .filter(Boolean)
                                    .join(' - ')

                                  return (
                                    <SelectItem
                                      key={asm._id}
                                      value={asm._id}
                                      className='flex justify-between items-center w-full'
                                    >
                                      <span className='font-semibold text-primary'>
                                        {vehicle?.carType || 'Tip Necunoscut'}
                                      </span>
                                      <div className='text-right'>
                                        <span className='text-muted-foreground ml-2 text-xs'>
                                          ({details})
                                        </span>
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Selectare Remorcă */}
                      <FormField
                        control={form.control}
                        name='trailerId'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asignează Remorcă (Opțional)</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ''}
                              disabled={!selectedAssemblyId}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder='Selectează o remorcă...' />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value='none'>
                                  <span className='text-muted-foreground'>
                                    Fără Remorcă
                                  </span>
                                </SelectItem>
                                {(availableTrailers || []).map((trailer) => {
                                  const assignedVehicleNumber =
                                    assignedTrailerMap.get(
                                      trailer._id.toString()
                                    )
                                  return (
                                    <SelectItem
                                      key={trailer._id}
                                      value={trailer._id}
                                    >
                                      <div className='flex justify-between w-full items-center'>
                                        <span>
                                          {trailer.licensePlate}{' '}
                                          <span className='text-muted-foreground ml-2 text-xs'>
                                            ({trailer.type || 'N/A'})
                                          </span>
                                        </span>
                                        {assignedVehicleNumber && (
                                          <span className='text-red-500 text-xs ml-4 font-medium'>
                                            (Folosită de {assignedVehicleNumber}
                                            )
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )
                })()}

                {/* Note Livrare (Apare Mereu) */}
                <FormField
                  control={form.control}
                  name='deliveryNotes'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note Logistică</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Note interne, detalii programare, observații...'
                          className='resize-none h-32'
                          {...field}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* --- Footer cu Butoane --- */}
            <DialogFooter className='pt-6 flex flex-row justify-between w-full'>
              {/* Butonul de Dezalocare (stânga) */}
              <div>
                {isScheduled && (
                  <Button
                    type='button'
                    variant='destructive'
                    onClick={handleUnassign}
                    disabled={isPending}
                  >
                    <XCircle className='mr-2 h-4 w-4' />
                    Dezalocă Livrarea
                  </Button>
                )}
              </div>

              {/* Butoanele de Anulare și Salvare (dreapta) */}
              <div className='flex gap-2'>
                <DialogClose asChild>
                  <Button type='button' variant='outline'>
                    <XCircle className='mr-2 h-4 w-4' /> Inchide
                  </Button>
                </DialogClose>
                <Button type='submit' disabled={isPending || isReadOnly}>
                  {isPending ? (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  ) : (
                    <Save className='mr-2 h-4 w-4' />
                  )}

                  {/* Textul butonului a fost simplificat, deoarece e dezactivat oricum */}
                  {isScheduled
                    ? 'Actualizează Programarea'
                    : 'Salvează Programarea'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
