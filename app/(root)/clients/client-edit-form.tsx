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
import { ClientUpdateSchema } from '@/lib/db/modules/client/validator'
import type {
  IClientUpdate,
  IClientDoc,
  IAddress,
} from '@/lib/db/modules/client/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Pencil, X } from 'lucide-react'
import { ROMANIAN_BANKS } from '@/lib/constants'
import { formatMinutes } from '@/lib/db/modules/client/client.utils'
import { Switch } from '@/components/ui/switch'
import { CountryCombobox } from './CountryCombobox'
import { getCompanyDataByCui } from '@/lib/db/modules/setting/efactura/anaf-company-info'

interface Props {
  initialValues: IClientDoc
}

export default function ClientEditForm({ initialValues }: Props) {
  const router = useRouter()

  // Stare pentru ciornă
  const [currentDeliveryAddress, setCurrentDeliveryAddress] = useState<
    Partial<IAddress>
  >({
    tara: 'RO',
    persoanaContact: '',
    telefonContact: '',
    isActive: true,
    alteDetalii: '',
  })

  // Stare pentru editare (indexul din array-ul local)
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(
    null
  )
  const [isCalculating, setIsCalculating] = useState(false)
  const [isSearchingAnaf, setIsSearchingAnaf] = useState(false)

  const form = useForm<IClientUpdate>({
    resolver: zodResolver(ClientUpdateSchema),
    defaultValues: {
      _id: initialValues._id,
      clientType: initialValues.clientType,
      name: initialValues.name,
      cnp: initialValues.cnp ?? '',
      vatId: initialValues.vatId ?? '',
      nrRegComert: initialValues.nrRegComert ?? '',
      contractNumber: initialValues.contractNumber ?? '',
      contractDate: initialValues.contractDate ?? undefined,
      isVatPayer: initialValues.isVatPayer,
      email: initialValues.email,
      phone: initialValues.phone,
      address: {
        ...initialValues.address,
        tara: initialValues.address.tara || 'RO',
        persoanaContact: initialValues.address.persoanaContact || '',
        telefonContact: initialValues.address.telefonContact || '',
        alteDetalii: initialValues.address.alteDetalii || '',
        isActive: initialValues.address.isActive ?? true,
      },
      deliveryAddresses: initialValues.deliveryAddresses,
      bankAccountLei: initialValues.bankAccountLei ?? undefined,
      bankAccountEuro: initialValues.bankAccountEuro ?? undefined,
      mentions: initialValues.mentions ?? '',
      paymentTerm: initialValues.paymentTerm ?? 0,
      defaultMarkups: initialValues.defaultMarkups ?? {
        directDeliveryPrice: 0,
        fullTruckPrice: 0,
        smallDeliveryBusinessPrice: 0,
        retailPrice: 0,
      },
    },
  })

  const clientType = form.watch('clientType')
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    getValues, // Folosit la CopyBillingAddress
    setValue,
  } = form

  // 1. Funcția de Salvare Adresă (Adăugare sau Update)
  const handleSaveDeliveryAddress = async (
    field: ControllerRenderProps<IClientUpdate, 'deliveryAddresses'>
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
        // MOD EDITARE: Actualizăm elementul de la index
        currentList[editingAddressIndex] = newAddress
        field.onChange(currentList)
        toast.success('Adresa a fost actualizată.')
      } else {
        // MOD ADĂUGARE
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

  // 2. Funcția de Încărcare pentru Editare
  const handleEditAddress = (index: number, address: IAddress) => {
    setCurrentDeliveryAddress({
      ...address,
      tara: address.tara || 'RO',
      persoanaContact: address.persoanaContact || '',
      telefonContact: address.telefonContact || '',
      alteDetalii: address.alteDetalii || '',
      isActive: address.isActive ?? true,
    })
    setEditingAddressIndex(index)
  }

  // 3. Funcția de Anulare Editare
  const handleCancelEditAddress = () => {
    setCurrentDeliveryAddress({
      tara: 'RO',
      persoanaContact: '',
      telefonContact: '',
      isActive: true,
      alteDetalii: '',
    })
    setEditingAddressIndex(null)
  }

  // 4. Funcția de Toggle (Activ/Inactiv)
  const handleToggleAddressStatus = (
    index: number,
    currentStatus: boolean,
    field: ControllerRenderProps<IClientUpdate, 'deliveryAddresses'>
  ) => {
    const currentList = [...(field.value || [])]
    if (currentList[index]) {
      // Inversăm statusul
      currentList[index].isActive = !currentStatus
      field.onChange(currentList)
      toast.success(
        `Adresa a fost ${!currentStatus ? 'activată' : 'dezactivată'} (Salvează formularul pentru a aplica).`
      )
    }
  }

  const handleCopyBillingAddress = () => {
    const billingAddress = getValues('address')
    if (!billingAddress.judet) {
      toast.error('Completează mai întâi adresa fiscală.')
      return
    }
    setCurrentDeliveryAddress({
      ...billingAddress,
      isActive: true,
      // Ne asigurăm că avem valorile default pentru câmpurile noi
      tara: billingAddress.tara || 'RO',
      persoanaContact: billingAddress.persoanaContact || '',
      telefonContact: billingAddress.telefonContact || '',
      alteDetalii: billingAddress.alteDetalii || '',
    })
    toast.success('Adresa fiscală a fost copiată.')
  }

  const onSubmit: SubmitHandler<IClientUpdate> = async (values) => {
    try {
      const res = await fetch(`/api/clients/${values._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.message && json.message.includes('duplicate key')) {
          toast.error('Un client cu acest CUI/CNP există deja în baza de date.')
        } else {
          throw new Error(json.message || 'A apărut o eroare la server.')
        }
      } else {
        toast.success('Client actualizat cu succes.')
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

  const handleAnafSearch = async () => {
    const cui = getValues('vatId')
    if (!cui || cui.length < 2) {
      toast.error('Introdu un CUI valid!')
      return
    }

    setIsSearchingAnaf(true)
    try {
      const result = await getCompanyDataByCui(cui)

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Nu s-au putut prelua datele.')
      }

      const { data } = result

      // Populăm datele
      setValue('name', data.name || '')
      setValue('nrRegComert', data.nrRegCom || '')
      setValue('isVatPayer', data.isVatPayer)

      // Populăm adresa
      setValue('address.judet', data.address.judet || '')
      setValue('address.localitate', data.address.localitate || '')
      setValue('address.strada', data.address.strada || '')
      setValue('address.numar', data.address.numar || '')
      setValue('address.codPostal', data.address.codPostal || '')
      setValue('address.alteDetalii', data.address.alteDetalii || '')
      setValue('address.tara', data.address.tara || 'RO')

      toast.success('Datele firmei au fost actualizate!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSearchingAnaf(false)
    }
  }

  if (isSubmitting) return <LoadingPage />

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-3'>
        {/* ... Secțiunile Standard (Nume, CUI, Contract) ... */}
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
                    <SelectContent className='bg-white dark:bg-muted'>
                      <SelectItem value='Persoana fizica'>
                        Persoana fizica
                      </SelectItem>
                      <SelectItem value='Persoana juridica'>
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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='isVatPayer'
            render={({ field }) => (
              <FormItem className='flex items-center mt-5 space-x-2 '>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Este Plătitor de TVA?</FormLabel>
              </FormItem>
            )}
          />
        </div>

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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {clientType === 'Persoana juridica' && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* 👇 AM MODIFICAT ACEST DIV PENTRU A INCLUDE BUTONUL */}
            <div className='flex items-end gap-2'>
              <FormField
                control={control}
                name='vatId'
                render={({ field }) => (
                  <FormItem className='flex-1'>
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
              <Button
                type='button'
                variant='secondary'
                onClick={handleAnafSearch}
                disabled={isSearchingAnaf}
              >
                {isSearchingAnaf ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  'Caută ANAF'
                )}
              </Button>
            </div>

            <FormField
              control={control}
              name='nrRegComert'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nr. Reg. Comerț<span className='text-red-500'>*</span>
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

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg'>
          <FormField
            control={control}
            name='contractNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Număr Contract</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Input type='email' {...field} />
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
                  <Input {...field} />
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

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg'>
          <div className='space-y-2'>
            <FormLabel>Cont Bancar LEI</FormLabel>
            <FormField
              control={control}
              name='bankAccountLei.iban'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder='IBAN' {...field} />
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
                    <SelectContent className='bg-white dark:bg-muted'>
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
                    <Input placeholder='IBAN' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='bankAccountEuro.bankName'
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Selectează banca' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className='bg-white dark:bg-muted'>
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
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
            <FormField
              control={control}
              name='address.persoanaContact'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persoană Contact</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='address.telefonContact'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon Contact</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Adrese de Livrare (MODIFICAT: EDIT + SWITCH) */}
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

              {/* Formular Adăugare/Editare */}
              <div className='p-4 bg-muted/50 rounded-lg '>
                <div className='mb-2 font-medium text-sm text-primary'>
                  {editingAddressIndex !== null
                    ? 'Modifică adresa selectată'
                    : 'Adaugă adresă nouă'}
                </div>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <FormItem>
                    <FormLabel>Județ</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.judet || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress({
                            ...currentDeliveryAddress,
                            judet: e.target.value,
                          })
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
                          setCurrentDeliveryAddress({
                            ...currentDeliveryAddress,
                            localitate: e.target.value,
                          })
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
                          setCurrentDeliveryAddress({
                            ...currentDeliveryAddress,
                            strada: e.target.value,
                          })
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
                          setCurrentDeliveryAddress({
                            ...currentDeliveryAddress,
                            numar: e.target.value,
                          })
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
                          setCurrentDeliveryAddress({
                            ...currentDeliveryAddress,
                            alteDetalii: e.target.value,
                          })
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
                          setCurrentDeliveryAddress({
                            ...currentDeliveryAddress,
                            codPostal: e.target.value,
                          })
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
                          setCurrentDeliveryAddress({
                            ...currentDeliveryAddress,
                            tara: value,
                          })
                        }
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Persoană Contact</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.persoanaContact || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress({
                            ...currentDeliveryAddress,
                            persoanaContact: e.target.value,
                          })
                        }
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Telefon Contact</FormLabel>
                    <FormControl>
                      <Input
                        value={currentDeliveryAddress.telefonContact || ''}
                        onChange={(e) =>
                          setCurrentDeliveryAddress({
                            ...currentDeliveryAddress,
                            telefonContact: e.target.value,
                          })
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
                      <X className='mr-2 h-4 w-4' /> Anulează
                    </Button>
                  )}
                </div>
              </div>

              {/* Lista Adrese */}
              <div className='space-y-2'>
                {(field.value || []).map((addr, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-3 rounded-md border transition-colors ${
                      editingAddressIndex === index
                        ? 'border-primary bg-primary/5'
                        : addr.isActive
                          ? 'bg-secondary border-transparent'
                          : 'bg-muted/40 border-transparent text-muted-foreground'
                    }`}
                  >
                    <div className='flex-1'>
                      <p
                        className={`font-medium text-sm ${!addr.isActive && 'line-through'}`}
                      >
                        {`Str. ${addr.strada}, Nr. ${addr.numar}, ${addr.alteDetalii}, ${addr.localitate}, ${addr.judet}, ${addr.tara}`}
                      </p>
                      <div className='flex gap-4 text-xs text-muted-foreground mt-1'>
                        <span>
                          Pers. Contact: {addr.persoanaContact} - {''}
                          {addr.telefonContact}
                        </span>
                        <span>•</span>
                        <span>Dus-întors: ~{addr.distanceInKm} km</span>
                        <span>•</span>
                        <span>
                          Timp: ~{formatMinutes(addr.travelTimeInMinutes || 0)}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => handleEditAddress(index, addr)}
                      >
                        <Pencil className='h-4 w-4 ' />
                      </Button>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs w-10 text-right'>
                          {addr.isActive ? 'Activ' : 'Inactiv'}
                        </span>
                        <Switch
                          checked={!!addr.isActive}
                          onCheckedChange={() =>
                            handleToggleAddressStatus(
                              index,
                              !!addr.isActive,
                              field
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {(field.value || []).length === 0 && (
                  <p className='text-sm text-muted-foreground text-center py-2'>
                    Nu au fost adăugate adrese.
                  </p>
                )}
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
        </div>

        <Button type='submit' className='w-full' disabled={isSubmitting}>
          Salvează Modificările
        </Button>
      </form>
    </Form>
  )
}
