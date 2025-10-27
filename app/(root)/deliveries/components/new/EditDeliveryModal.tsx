'use client'

import { useTransition, useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, Loader2, PlusCircle, Trash2, Save } from 'lucide-react'
import { HeaderSchema } from '@/lib/db/modules/deliveries/validator'
import {
  HeaderInput,
  PlannedDelivery,
  PlannerItem,
} from '@/lib/db/modules/deliveries/types'
import { updateSingleDelivery } from '@/lib/db/modules/deliveries/delivery.actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DELIVERY_SLOTS } from '@/lib/db/modules/deliveries/constants'

interface EditDeliveryModalProps {
  isOpen: boolean
  onClose: () => void
  deliveryToEdit: PlannedDelivery | null
  currentPlannerItems: PlannerItem[]
}

type DeliverySlot = (typeof DELIVERY_SLOTS)[number]

function isDeliverySlot(slot: unknown): slot is DeliverySlot {
  return (DELIVERY_SLOTS as readonly string[]).includes(slot as string)
}

type EditDeliveryFormInput = HeaderInput & {
  items: PlannerItem[]
  deliveryDate?: Date
  deliverySlot?: DeliverySlot
}

export function EditDeliveryModal({
  isOpen,
  onClose,
  deliveryToEdit,
  currentPlannerItems,
}: EditDeliveryModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [quantitiesToAdd, setQuantitiesToAdd] = useState<
    Record<string, number>
  >({})

  // --- Definirea Formularului ---
  const methods = useForm<EditDeliveryFormInput>({
    resolver: zodResolver(HeaderSchema),
    defaultValues: {
      requestedDeliveryDate: new Date(),
      requestedDeliverySlot: undefined,
      deliveryNotes: '',
      uitCode: '',
      items: [],
      deliveryDate: undefined,
      deliverySlot: undefined,
    },
  })

  const { control, reset, handleSubmit } = methods
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
    keyName: 'keyId', // Folosim un nume diferit de 'id' pentru a evita conflicte
  })

  // Resetăm formularul de fiecare dată când `deliveryToEdit` se schimbă (când se deschide modalul)
  useEffect(() => {
    if (deliveryToEdit) {
      const validReqSlot = isDeliverySlot(deliveryToEdit.requestedDeliverySlot)
        ? deliveryToEdit.requestedDeliverySlot
        : undefined
      const validSlot = isDeliverySlot(deliveryToEdit.deliverySlot)
        ? deliveryToEdit.deliverySlot
        : undefined

      reset({
        requestedDeliveryDate: new Date(deliveryToEdit.requestedDeliveryDate),
        requestedDeliverySlot: validReqSlot,
        deliveryNotes: deliveryToEdit.deliveryNotes || '',
        uitCode: deliveryToEdit.uitCode || '',
        items: deliveryToEdit.items,
        deliveryDate: deliveryToEdit.deliveryDate
          ? new Date(deliveryToEdit.deliveryDate)
          : undefined,
        deliverySlot: validSlot,
      })
    } else {
      reset()
    }
  }, [deliveryToEdit, isOpen, reset])

  // --- Calculul Articolelor Disponibile ---

  const availableItemsToAdd = useMemo(() => {
    return currentPlannerItems.filter((plannerItem) => {
      const isAlreadyInDelivery = fields.some(
        (field) => field.id === plannerItem.id
      )
      if (isAlreadyInDelivery) return false

      const remainingBase =
        plannerItem.quantityOrdered -
        plannerItem.quantityAlreadyShipped -
        plannerItem.quantityAlreadyPlanned

      return remainingBase > 0.001
    })
  }, [currentPlannerItems, fields])

  // --- Acțiunea de Salvare ---
  const onSave = async (data: EditDeliveryFormInput) => {
    if (!deliveryToEdit) return

    const items = methods.getValues('items')

    const updatedPlannedDelivery: PlannedDelivery = {
      ...deliveryToEdit,
      ...data,
      items: items,
    }

    startTransition(async () => {
      try {
        const result = await updateSingleDelivery(
          deliveryToEdit.id,
          updatedPlannedDelivery
        )
        if (result.success) {
          toast.success(result.message)
          router.refresh()
          onClose()
        } else {
          toast.error('Eroare la actualizare:', { description: result.message })
        }
      } catch (error) {
        toast.error('Eroare neașteptată la actualizare.')
        console.error(error)
      }
    })
  }

  const handleAddItem = (item: PlannerItem, quantity: number) => {
    // Validare 1: Cantitatea trebuie să fie pozitivă
    if (quantity <= 0) {
      toast.warning('Introduceți o cantitate validă (> 0).')
      return
    }

    // Găsim item-ul corespondent în props pentru a calcula corect rămasul TOTAL
    const originalPlannerItem = currentPlannerItems.find(
      (p) => p.id === item.id
    )
    if (!originalPlannerItem) {
      toast.error('Eroare internă: Articolul original nu a fost găsit.')
      return
    }

    // Calculăm rămasul TOTAL pe comandă (în unitatea de măsură selectată)
    const remainingBase =
      originalPlannerItem.quantityOrdered -
      originalPlannerItem.quantityAlreadyShipped -
      originalPlannerItem.quantityAlreadyPlanned

    const factor =
      item.packagingOptions?.find((opt) => opt.unitName === item.unitOfMeasure)
        ?.baseUnitEquivalent || 1
    const remainingSelected = remainingBase / factor
    const remainingRounded = parseFloat(remainingSelected.toFixed(2))

    // Validare 2: Cantitatea de adăugat nu poate depăși rămasul total
    if (quantity > remainingRounded) {
      toast.error('Cantitate Invalidă', {
        description: `Nu puteți adăuga mai mult decât cantitatea rămasă (${remainingRounded.toFixed(2)} ${item.unitOfMeasure}).`,
      })
      // Resetăm inputul la maximul posibil
      setQuantitiesToAdd((prev) => ({ ...prev, [item.id]: remainingRounded }))
      return
    }

    // Adăugăm item-ul în array-ul formularului
    append({
      ...item,
      quantityToAllocate: parseFloat(quantity.toFixed(2)),
    })

    // Resetăm inputul specific după adăugare
    setQuantitiesToAdd((prev) => ({ ...prev, [item.id]: 0 }))
  }

  const handleRemoveItem = (index: number) => {
    remove(index)
  }

  const handleItemQtyChange = (index: number, value: string) => {
    let newQty = parseFloat(value)

    if (isNaN(newQty) || newQty < 0 || value.trim() === '') {
      newQty = 0
      if (
        value.trim() !== '' &&
        !isNaN(parseFloat(value)) &&
        parseFloat(value) < 0
      ) {
        toast.warning('Cantitatea nu poate fi negativă.')
      }
    }

    const itemInForm = fields[index]

    const originalPlannerItem = currentPlannerItems.find(
      (p) => p.id === itemInForm.id
    )
    if (!originalPlannerItem) return

    const factor =
      itemInForm.packagingOptions?.find(
        (opt) => opt.unitName === itemInForm.unitOfMeasure
      )?.baseUnitEquivalent || 1

    const plannedInOthersBase =
      originalPlannerItem.quantityAlreadyPlanned -
      itemInForm.quantityToAllocate * factor

    const availableForThisDeliveryBase =
      originalPlannerItem.quantityOrdered -
      originalPlannerItem.quantityAlreadyShipped -
      plannedInOthersBase

    const maxAllowedSelected = availableForThisDeliveryBase / factor
    const maxAllowedRounded = parseFloat(maxAllowedSelected.toFixed(2))

    // Validare 2: Noua cantitate nu poate depăși maximul permis pentru această livrare
    if (newQty > maxAllowedRounded) {
      toast.warning(
        `Cantitatea maximă permisă pentru acest articol în această livrare este ${maxAllowedRounded.toFixed(2)} ${itemInForm.unitOfMeasure}.`
      )
      newQty = maxAllowedRounded
    }

    // Rotunjim la 2 zecimale pentru consistență
    const roundedQty = parseFloat(newQty.toFixed(2))

    if (itemInForm.quantityToAllocate !== roundedQty) {
      update(index, { ...itemInForm, quantityToAllocate: roundedQty })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-none w-[90vw] md:w-[70vw] max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Editare Livrare</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSave)}
            className='flex-grow overflow-y-auto space-y-6 pr-2'
          >
            {/* Secțiunea Header (Data, Slot, Note, UIT) */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormField
                control={control}
                name='requestedDeliveryDate'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Data Solicitată</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Alege o dată</span>
                            )}
                            <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name='requestedDeliverySlot'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval Orar Solicitat</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Alege un interval...' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DELIVERY_SLOTS.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormField
                control={control}
                name='deliveryNotes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note Livrare</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name='uitCode'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cod UIT</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Secțiunea Articole DIN Livrare */}
            <Card>
              <CardHeader>
                <CardTitle>Articole în Această Livrare</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produs</TableHead>
                      <TableHead className='w-[150px]'>Cantitate</TableHead>
                      <TableHead className='w-[130px]'>UM</TableHead>
                      <TableHead className='w-[50px]'>Șterge</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className='text-center'>
                          Niciun articol în livrare.
                        </TableCell>
                      </TableRow>
                    )}
                    {fields.map((field, index) => {
                      const item = field
                      return (
                        <TableRow key={item.keyId}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>
                            <FormField
                              control={control}
                              name={`items.${index}.quantityToAllocate`}
                              render={({ field: qtyField }) => (
                                <Input
                                  type='number'
                                  step='any'
                                  value={qtyField.value}
                                  onBlur={qtyField.onBlur}
                                  ref={qtyField.ref}
                                  name={qtyField.name}
                                  disabled={qtyField.disabled}
                                  onChange={(e) =>
                                    handleItemQtyChange(index, e.target.value)
                                  }
                                  className='text-right'
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>{item.unitOfMeasure}</TableCell>
                          <TableCell>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className='h-4 w-4 text-destructive' />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Secțiunea Articole DISPONIBILE */}
            <Card>
              <CardHeader>
                <CardTitle>Articole Disponibile pentru Adăugare</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produs</TableHead>
                      <TableHead className='w-[100px] text-right'>
                        Rămas
                      </TableHead>
                      {/* Coloana Nouă */}
                      <TableHead className='w-[120px]'>
                        Adaugă Cantitate
                      </TableHead>
                      <TableHead className='w-[50px]'>Adaugă</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableItemsToAdd.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className='text-center'>
                          Niciun articol disponibil.
                        </TableCell>
                      </TableRow>
                    )}
                    {availableItemsToAdd.map((item) => {
                      // Calculăm rămasul specific pentru acest item
                      const remainingBase =
                        item.quantityOrdered -
                        item.quantityAlreadyShipped -
                        item.quantityAlreadyPlanned
                      const factor =
                        item.packagingOptions?.find(
                          (opt) => opt.unitName === item.unitOfMeasure
                        )?.baseUnitEquivalent || 1
                      const remainingSelected = remainingBase / factor
                      const remainingRounded = parseFloat(
                        remainingSelected.toFixed(2)
                      )

                      // Handler local pentru inputul cantității
                      const handleQtyToAddChange = (
                        e: React.ChangeEvent<HTMLInputElement>
                      ) => {
                        const value = parseFloat(e.target.value) || 0
                        if (value < 0) {
                          setQuantitiesToAdd((prev) => ({
                            ...prev,
                            [item.id]: 0,
                          }))
                        } else if (value > remainingRounded) {
                          setQuantitiesToAdd((prev) => ({
                            ...prev,
                            [item.id]: remainingRounded,
                          }))
                          toast.warning(
                            'Nu poți adăuga mai mult decât cantitatea rămasă.'
                          )
                        } else {
                          setQuantitiesToAdd((prev) => ({
                            ...prev,
                            [item.id]: value,
                          }))
                        }
                      }

                      const currentQtyToAdd = quantitiesToAdd[item.id] || 0

                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className='text-right'>
                            {remainingRounded.toFixed(2)} {item.unitOfMeasure}
                          </TableCell>

                          <TableCell>
                            <Input
                              type='number'
                              step='any'
                              min='0'
                              max={remainingRounded.toFixed(2)}
                              value={currentQtyToAdd}
                              onChange={handleQtyToAddChange}
                              className='text-right'
                              disabled={remainingRounded <= 0}
                            />
                          </TableCell>

                          <TableCell>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() =>
                                handleAddItem(item, currentQtyToAdd)
                              }
                              disabled={
                                currentQtyToAdd <= 0 || remainingRounded <= 0
                              }
                            >
                              <PlusCircle className='h-4 w-4 text-primary' />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </form>
        </FormProvider>

        <DialogFooter>
          <DialogClose asChild>
            <Button type='button' variant='outline'>
              Anulează
            </Button>
          </DialogClose>
          <Button
            type='submit'
            onClick={handleSubmit(onSave)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Save className='mr-2 h-4 w-4' />
            )}
            Salvează Modificările
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
