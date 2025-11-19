'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, SubmitHandler, ControllerRenderProps } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import LoadingPage from '@/app/loading'
import { ClientCreateSchema } from '@/lib/db/modules/client/validator'
import type { IAddress, IClientCreate } from '@/lib/db/modules/client/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Pencil } from 'lucide-react'
import { ROMANIAN_BANKS } from '@/lib/constants'
import { formatMinutes } from '@/lib/db/modules/client/client.utils'
import { CountryCombobox } from './CountryCombobox'

export default function ClientForm() {
  const router = useRouter()
  const [currentDeliveryAddress, setCurrentDeliveryAddress] = useState<
    Partial<IAddress>
  >({ tara: 'RO', persoanaContact: '', telefonContact: '', isActive: true })
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(
    null
  )
  const [isCalculating, setIsCalculating] = useState(false)

  const form = useForm<IClientCreate>({
    resolver: zodResolver(ClientCreateSchema),
    defaultValues: {
      clientType: 'Persoana fizica',
      name: '',
      cnp: '',
      vatId: '',
      nrRegComert: '',
      contractNumber: '',
      contractDate: undefined,
      isVatPayer: false,
      email: '',
      phone: '',
      address: {
        judet: '',
        localitate: '',
        strada: '',
        numar: '',
        codPostal: '',
        alteDetalii: '',
        tara: 'RO',
        persoanaContact: '',
        telefonContact: '',
      },
      deliveryAddresses: [],
      bankAccountLei: { iban: '', bankName: '' },
      bankAccountEuro: { iban: '', bankName: '' },
      mentions: '',
      paymentTerm: 0,
    },
  })

  const clientType = form.watch('clientType')
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    getValues,
  } = form

  const handleCopyBillingAddress = () => {
    const billingAddress = getValues('address')
    if (!billingAddress.judet) {
      toast.error('Completează mai întâi adresa de facturare.')
      return
    }
    setCurrentDeliveryAddress(billingAddress)
    toast.success('Adresa de facturare a fost copiată.')
  }

  // Logica pentru adăugarea unei adrese de livrare
  const handleSaveDeliveryAddress = async (
    field: ControllerRenderProps<IClientCreate, 'deliveryAddresses'>
  ) => {
    const addr = currentDeliveryAddress
    if (
      !addr.judet ||
      !addr.localitate ||
      !addr.strada ||
      !addr.numar ||
      !addr.codPostal ||
      !addr.tara ||
      !addr.persoanaContact ||
      !addr.telefonContact
    ) {
      toast.error(
        'Toate câmpurile adresei de livrare (fără "alte detalii") sunt obligatorii.'
      )
      return
    }

    setIsCalculating(true)
    try {
      const res = await fetch('/api/maps-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addr),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Eroare la calcularea distanței.')
      }

      const { distanceInKm, travelTimeInMinutes } = await res.json()

      const newAddress: IAddress = {
        ...addr,
        distanceInKm,
        travelTimeInMinutes,
        isActive: addr.isActive ?? true,
      } as IAddress

      const currentList = [...(field.value || [])]

      if (editingAddressIndex !== null) {
        currentList[editingAddressIndex] = newAddress
        field.onChange(currentList)
        toast.success('Adresa a fost actualizată.')
      } else {
        field.onChange([...currentList, newAddress])
        toast.success('Adresa de livrare a fost adăugată.')
      }

      handleCancelEditAddress()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'A apărut o eroare.')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleEditAddress = (index: number, address: IAddress) => {
    setCurrentDeliveryAddress(address)
    setEditingAddressIndex(index)
  }

  const handleCancelEditAddress = () => {
    setCurrentDeliveryAddress({
      tara: 'RO',
      persoanaContact: '',
      telefonContact: '',
      isActive: true,
    })
    setEditingAddressIndex(null)
  }

  const onSubmit: SubmitHandler<IClientCreate> = async (values) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) {
        // Prindem eroarea de unicitate de la server
        if (json.message.includes('duplicate key')) {
          toast.error('Un client cu acest CUI/CNP există deja în baza de date.')
        } else {
          throw new Error(json.message)
        }
      } else {
        toast.success('Client creat cu succes.')
        router.push('/clients')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message)
      } else {
        toast.error('A apărut o eroare necunoscută.')
      }
    }
  }

  if (isSubmitting) return <LoadingPage />

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onSubmit, (errors) =>
          console.log('🛑 Validation errors:', errors)
        )}
        className='space-y-3'
      >
        {/* Tip client & Nume */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <FormField
            control={control}
            name='clientType'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Tip client<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className='w-full cursor-pointer'>
                      <SelectValue placeholder='Alege tip client' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value='Persoana fizica'
                        className='cursor-pointer'
                      >
                        Persoana fizica
                      </SelectItem>
                      <SelectItem
                        value='Persoana juridica'
                        className='cursor-pointer'
                      >
                        Persoana juridica
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nume complet<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='Ex: SC Client SRL, Vasile Ion'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Plătitor TVA */}
          <FormField
            control={control}
            name='isVatPayer'
            render={({ field }) => (
              <FormItem className='flex items-center mt-5 space-x-2 '>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className='cursor-pointer'
                  />
                </FormControl>
                <FormLabel>Este Plătitor de TVA?</FormLabel>
              </FormItem>
            )}
          />
        </div>
        {/* CNP / VAT-RegCom */}
        {clientType === 'Persoana fizica' && (
          <FormField
            control={control}
            name='cnp'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  CNP<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder='1891003352712' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {clientType === 'Persoana juridica' && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <FormField
              control={control}
              name='vatId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Cod Fiscal (CUI)<span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder='RO42562324' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='nrRegComert'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Număr Registru Comerț<span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder='J23/2873/2022' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        {/* Contract */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg'>
          <FormField
            control={control}
            name='contractNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Număr Contract</FormLabel>
                <FormControl>
                  <Input placeholder='Ex: 123/2025' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='contractDate'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Contract</FormLabel>
                <FormControl>
                  {/* Afișăm valoarea în format YYYY-MM-DD pentru input */}
                  <Input
                    type='date'
                    {...field}
                    value={
                      field.value
                        ? new Date(field.value).toISOString().split('T')[0]
                        : ''
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Contact */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
          <FormField
            control={control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email client<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='contact@client.ro'
                    type='email'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='phone'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Număr de telefon<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder='07xx xxx xxx' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='paymentTerm'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Termen de plată (zile)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    placeholder='Ex: 15'
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* IBAN */}
        {/* Conturi Bancare Structurate */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg'>
          <div className='space-y-2'>
            <FormLabel>Cont Bancar LEI</FormLabel>
            <FormField
              control={control}
              name='bankAccountLei.iban'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder='IBAN (24 caractere)' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='bankAccountLei.bankName'
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Selectează banca' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROMANIAN_BANKS.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className='space-y-2'>
            <FormLabel>Cont Bancar Euro</FormLabel>
            <FormField
              control={control}
              name='bankAccountEuro.iban'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder='IBAN (24 caractere)' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='bankAccountEuro.bankName'
              render={({ field }) => {
                return (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Selectează banca' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROMANIAN_BANKS.map((bank) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          </div>
        </div>
        {/* Adresă fiscală */}
        <div className='space-y-4 p-4 border rounded-lg'>
          <FormLabel className='text-base font-semibold'>
            Adresă fiscală (facturare) <span className='text-red-500'>*</span>
          </FormLabel>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <FormField
              control={control}
              name='address.judet'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Județ</FormLabel>
                  <FormControl>
                    <Input placeholder='Ex: București' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='address.localitate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localitate</FormLabel>
                  <FormControl>
                    <Input placeholder='Ex: Sector 1' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='address.strada'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stradă</FormLabel>
                  <FormControl>
                    <Input placeholder='Ex: Calea Victoriei' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='address.numar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Număr</FormLabel>
                  <FormControl>
                    <Input placeholder='Ex: 100' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='address.codPostal'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cod Poștal</FormLabel>
                  <FormControl>
                    <Input placeholder='Ex: 010071' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='address.alteDetalii'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alte detalii</FormLabel>
                  <FormControl>
                    <Input placeholder='Bloc, Scara, Apartament' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='address.tara'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Țara</FormLabel>
                  <FormControl>
                    <CountryCombobox
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* --- MODIFICARE: Am adăugat Persoana Contact --- */}
            <FormField
              control={control}
              name='address.persoanaContact'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persoană Contact</FormLabel>
                  <FormControl>
                    <Input placeholder='Ex: Vasile Popescu' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* --- MODIFICARE: Am adăugat Telefon Contact --- */}
            <FormField
              control={control}
              name='address.telefonContact'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon Persoană Contact</FormLabel>
                  <FormControl>
                    <Input placeholder='Ex: 07xx xxx xxx' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        {/* Adrese de Livrare Structurate */}
        <FormField
          control={control}
          name='deliveryAddresses'
          render={({ field }) => (
            <div className='space-y-4 p-4 border rounded-lg'>
              <div className='flex justify-between items-center'>
                <FormLabel className='text-base font-semibold'>
                  Adrese de livrare <span className='text-red-500'>*</span>
                </FormLabel>
                <Button
                  type='button'
                  variant='link'
                  className='p-0 h-auto text-sm'
                  onClick={handleCopyBillingAddress}
                >
                  Copiază adresa de facturare
                </Button>
              </div>

              <div className='p-4 bg-muted/50 rounded-lg'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <FormItem>
                    <FormLabel>Județ</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.judet || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress((p) => ({
                            ...p,
                            judet: e.target.value,
                          }))
                        }
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Localitate</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.localitate || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress((p) => ({
                            ...p,
                            localitate: e.target.value,
                          }))
                        }
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Stradă</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.strada || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress((p) => ({
                            ...p,
                            strada: e.target.value,
                          }))
                        }
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Număr</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.numar || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress((p) => ({
                            ...p,
                            numar: e.target.value,
                          }))
                        }
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Cod Poștal</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.codPostal || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress((p) => ({
                            ...p,
                            codPostal: e.target.value,
                          }))
                        }
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Alte detalii</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.alteDetalii || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress((p) => ({
                            ...p,
                            alteDetalii: e.target.value,
                          }))
                        }
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Țara</FormLabel>
                    <FormControl>
                      <CountryCombobox
                        value={currentDeliveryAddress.tara || 'RO'}
                        onChange={(value) =>
                          setCurrentDeliveryAddress((p) => ({
                            ...p,
                            tara: value,
                          }))
                        }
                      />
                    </FormControl>
                  </FormItem>
                  {/* --- MODIFICARE: Am adăugat Persoana Contact --- */}
                  <FormItem>
                    <FormLabel>Persoană Contact</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.persoanaContact || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress((p) => ({
                            ...p,
                            persoanaContact: e.target.value,
                          }))
                        }
                      />
                    </FormControl>
                  </FormItem>
                  {/* --- MODIFICARE: Am adăugat Telefon Contact --- */}
                  <FormItem>
                    <FormLabel>Telefon Contact</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.telefonContact || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress((p) => ({
                            ...p,
                            telefonContact: e.target.value,
                          }))
                        }
                      />
                    </FormControl>
                  </FormItem>
                </div>
                <div className='flex gap-2 mt-4'>
                  <Button
                    type='button'
                    onClick={() => handleSaveDeliveryAddress(field)}
                    disabled={isCalculating}
                  >
                    {isCalculating && (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    {editingAddressIndex !== null
                      ? 'Salvează Modificările'
                      : 'Adaugă Adresa'}
                  </Button>

                  {editingAddressIndex !== null && (
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleCancelEditAddress}
                    >
                      Anulează
                    </Button>
                  )}
                </div>
              </div>

              <div className='space-y-2'>
                {field.value.map((addr, index) => (
                  <div
                    key={index}
                    className='flex text-sm justify-between items-center p-2 bg-secondary rounded-md'
                  >
                    <div>
                      <p className='font-medium'>{`Str. ${addr.strada}, Nr. ${addr.numar}, ${addr.alteDetalii}, ${addr.localitate}, ${addr.judet}, ${addr.tara}`}</p>
                      <p className='text-sm text-muted-foreground'>
                        {`Persoana Contact: ${addr.persoanaContact} - ${addr.telefonContact}`}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {`Distanță dus-întors: ~ ${addr.distanceInKm} km | Timp dus-întors: ~ ${formatMinutes(addr.travelTimeInMinutes || 0)}`}
                      </p>
                    </div>
                    <div className='flex items-center gap-3'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => handleEditAddress(index, addr)}
                      >
                        <Pencil className='mr-2 h-4 w-4' />
                      </Button>

                      <Button
                        type='button'
                        variant='destructive'
                        size='sm'
                        onClick={() => {
                          const newAddresses = field.value.filter(
                            (_, i) => i !== index
                          )
                          field.onChange(newAddresses)
                        }}
                      >
                        X
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <FormMessage />
            </div>
          )}
        />
        <div className='space-y-2 p-4 pb-2 border rounded-lg md:col-span-2'>
          <FormField
            control={control}
            name='mentions'
            render={({ field }) => (
              <FormItem className='md:col-span-2'>
                <FormLabel>Mențiuni</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Orice considerați necesar..'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>{' '}
        <p className='text-sm text-muted-foreground mb-2'>
          Câmpurile marcate cu <span className='text-red-500'>*</span> sunt
          obligatorii.
        </p>
        <Button type='submit' className='w-full' disabled={isSubmitting}>
          {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          Adaugă client
        </Button>
      </form>
    </Form>
  )
}
