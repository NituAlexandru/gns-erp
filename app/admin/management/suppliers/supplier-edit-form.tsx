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
import { SupplierUpdateSchema } from '@/lib/db/modules/suppliers/validator'
import type {
  ISupplierUpdate,
  ISupplierDoc,
  IAddress,
} from '@/lib/db/modules/suppliers/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROMANIAN_BANKS } from '@/lib/constants'
import { Loader2 } from 'lucide-react'
import { formatMinutes } from '@/lib/db/modules/client/client.utils'

interface Props {
  initialValues: ISupplierDoc
}

export default function SupplierEditForm({ initialValues }: Props) {
  const router = useRouter()

  const [currentLoadingAddress, setCurrentLoadingAddress] = useState<
    Partial<IAddress>
  >({})
  const [currentBrand, setCurrentBrand] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)

  const form = useForm<ISupplierUpdate>({
    resolver: zodResolver(SupplierUpdateSchema),
    defaultValues: {
      _id: initialValues._id,
      name: initialValues.name,
      contactName: initialValues.contactName ?? '',
      email: initialValues.email,
      phone: initialValues.phone,
      address: initialValues.address,
      fiscalCode: initialValues.fiscalCode,
      regComNumber: initialValues.regComNumber,
      bankAccountLei: initialValues.bankAccountLei ?? {
        iban: '',
        bankName: '',
      },
      bankAccountEuro: initialValues.bankAccountEuro ?? {
        iban: '',
        bankName: '',
      },
      externalTransport: initialValues.externalTransport,
      isVatPayer: initialValues.isVatPayer,
      loadingAddresses: initialValues.loadingAddresses,
      externalTransportCosts: initialValues.externalTransportCosts ?? 0,
      internalTransportCosts: initialValues.internalTransportCosts ?? 0,
      brand: initialValues.brand,
      mentions: initialValues.mentions ?? '',
      paymentTerm: initialValues.paymentTerm ?? 0,
      contractNumber: initialValues.contractNumber ?? '',
      contractDate: initialValues.contractDate ?? undefined,
    },
  })

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    getValues,
  } = form

  const handleAddBrand = (
    field: ControllerRenderProps<ISupplierUpdate, 'brand'>
  ) => {
    const b = currentBrand.trim()
    if (b && !field.value?.includes(b)) {
      field.onChange([...(field.value || []), b])
      setCurrentBrand('')
    }
  }

  const handleAddLoadingAddress = async (
    field: ControllerRenderProps<ISupplierUpdate, 'loadingAddresses'>
  ) => {
    const addr = currentLoadingAddress
    if (
      !addr.judet ||
      !addr.localitate ||
      !addr.strada ||
      !addr.numar ||
      !addr.codPostal
    ) {
      toast.error('Toate câmpurile adresei de încărcare sunt obligatorii.')
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
      } as IAddress

      field.onChange([...(field.value || []), newAddress])
      setCurrentLoadingAddress({})
      toast.success('Adresa de încărcare a fost adăugată.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'A apărut o eroare.')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleCopyBillingAddress = () => {
    const billingAddress = getValues('address')
    if (!billingAddress.judet) {
      toast.error('Completează mai întâi adresa fiscală.')
      return
    }
    setCurrentLoadingAddress(billingAddress)
    toast.success('Adresa fiscală a fost copiată.')
  }

  const onSubmit: SubmitHandler<ISupplierUpdate> = async (values) => {
    try {
      const res = await fetch(`/api/admin/management/suppliers/${values._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      toast.success('Furnizor actualizat cu succes.')
      router.push('/admin/management/suppliers')
      router.refresh()
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('duplicate key')) {
          toast.error('Un furnizor cu acest Cod Fiscal există deja.')
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error('A apărut o eroare necunoscută.')
      }
    }
  }

  if (isSubmitting) return <LoadingPage />

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
  

        {/* Nume și Contact */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
          <FormField
            control={control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nume furnizor <span className='text-red-500'>*</span>
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
            name='contactName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nume contact</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email <span className='text-red-500'>*</span>
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
                  Telefon <span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input type='tel' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date Fiscale și Contract */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
          <FormField
            control={control}
            name='fiscalCode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Cod Fiscal (CUI) <span className='text-red-500'>*</span>
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
            name='regComNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nr. Reg. Comerț <span className='text-red-500'>*</span>
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

        {/* Adresa Fiscală Structurată */}
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
              name='address.alteDetalii'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alte detalii</FormLabel>
                  <FormControl>
                    <Input placeholder='Bloc, Scara, etc.' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

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
        </div>

        {/* Adrese de Încărcare Structurate */}
        <FormField
          control={control}
          name='loadingAddresses'
          render={({ field }) => (
            <div className='space-y-4 p-4 border rounded-lg'>
              <div className='flex justify-between items-center'>
                <FormLabel className='text-base font-semibold'>
                  Adrese de încărcare
                </FormLabel>
                <Button
                  type='button'
                  variant='link'
                  className='p-0 h-auto text-sm'
                  onClick={handleCopyBillingAddress}
                >
                  Copiază adresa fiscală
                </Button>
              </div>
              <div className='p-4 bg-muted/50 rounded-lg'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <FormItem>
                    <FormLabel>Județ</FormLabel>
                    <FormControl>
                      <Input
                        value={currentLoadingAddress.judet || ''}
                        onChange={(e) =>
                          setCurrentLoadingAddress({
                            ...currentLoadingAddress,
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
                        value={currentLoadingAddress.localitate || ''}
                        onChange={(e) =>
                          setCurrentLoadingAddress({
                            ...currentLoadingAddress,
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
                        value={currentLoadingAddress.strada || ''}
                        onChange={(e) =>
                          setCurrentLoadingAddress({
                            ...currentLoadingAddress,
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
                        value={currentLoadingAddress.numar || ''}
                        onChange={(e) =>
                          setCurrentLoadingAddress({
                            ...currentLoadingAddress,
                            numar: e.target.value,
                          })
                        }
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Cod Poștal</FormLabel>
                    <FormControl>
                      <Input
                        value={currentLoadingAddress.codPostal || ''}
                        onChange={(e) =>
                          setCurrentLoadingAddress({
                            ...currentLoadingAddress,
                            codPostal: e.target.value,
                          })
                        }
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Alte detalii</FormLabel>
                    <FormControl>
                      <Input
                        value={currentLoadingAddress.alteDetalii || ''}
                        onChange={(e) =>
                          setCurrentLoadingAddress({
                            ...currentLoadingAddress,
                            alteDetalii: e.target.value,
                          })
                        }
                      />
                    </FormControl>
                  </FormItem>
                </div>
                <Button
                  type='button'
                  className='mt-4'
                  onClick={() => handleAddLoadingAddress(field)}
                  disabled={isCalculating}
                >
                  {isCalculating && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  Adaugă Adresă
                </Button>
              </div>
              <div className='space-y-2'>
                {(field.value || []).map((addr, index) => (
                  <div
                    key={index}
                    className='flex justify-between items-center p-2 bg-secondary rounded-md'
                  >
                    <div>
                      <p className='font-medium text-sm'>{`${addr.strada}, Nr. ${addr.numar}, ${addr.localitate}, ${addr.judet}`}</p>
                      <p className='text-xs text-muted-foreground'>
                        {`Dus-întors: ~${addr.distanceInKm} km | Timp: ~${formatMinutes(addr.travelTimeInMinutes)}`}
                      </p>
                    </div>{' '}
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      onClick={() => {
                        const newAddresses = (field.value || []).filter(
                          (_, i) => i !== index
                        )
                        field.onChange(newAddresses)
                      }}
                    >
                      X
                    </Button>
                  </div>
                ))}
              </div>
              <FormMessage />
            </div>
          )}
        />

        {/* Alte Setări */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
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
          <FormField
            control={control}
            name='isVatPayer'
            render={({ field }) => (
              <FormItem className='flex items-center space-x-2 pt-6'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Este plătitor TVA?</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='externalTransport'
            render={({ field }) => (
              <FormItem className='flex items-center space-x-2 pt-6'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Transport asigurat de furnizor</FormLabel>
              </FormItem>
            )}
          />
        </div>

        {/* Costuri Transport */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <FormField
            control={control}
            name='externalTransportCosts'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost transport furnizor (LEI)</FormLabel>
                <FormControl>
                  <Input type='number' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='internalTransportCosts'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost transport intern (LEI)</FormLabel>
                <FormControl>
                  <Input type='number' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Branduri */}
        <FormField
          control={control}
          name='brand'
          render={({ field }) => (
            <div className='space-y-2 p-4 border rounded-lg'>
              <FormLabel>Branduri</FormLabel>
              <div className='flex items-center gap-2'>
                <Input
                  placeholder='Adaugă un brand nou'
                  value={currentBrand}
                  onChange={(e) => setCurrentBrand(e.target.value)}
                />
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => handleAddBrand(field)}
                >
                  Adaugă
                </Button>
              </div>
              <div className='space-y-1 pt-2'>
                {field.value?.map((b, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between gap-2 pl-2 bg-secondary rounded-md text-sm'
                  >
                    <span>{b}</span>
                    <Button
                      type='button'
                      size='sm'
                      onClick={() => {
                        const newBrands = field.value?.filter(
                          (_, idx) => idx !== i
                        )
                        field.onChange(newBrands)
                      }}
                    >
                      X
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        />

        <FormField
          control={control}
          name='mentions'
          render={({ field }) => (
            <FormItem>
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

        <p className='text-sm text-muted-foreground pt-4'>
          Câmpurile marcate cu <span className='text-red-500'>*</span> sunt
          obligatorii.
        </p>
        <Button type='submit' className='w-full' disabled={isSubmitting}>
          {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          Salvează modificările
        </Button>
      </form>
    </Form>
  )
}
