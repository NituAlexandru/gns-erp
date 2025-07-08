'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, SubmitHandler } from 'react-hook-form'
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
import type { IClientCreate } from '@/lib/db/modules/client/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ClientForm() {
  const router = useRouter()
  // Starea pentru input-ul adresei curente este corectă și necesară.
  const [currentLoadingAddr, setCurrentLoadingAddr] = useState('')

  const form = useForm<IClientCreate>({
    resolver: zodResolver(ClientCreateSchema),
    defaultValues: {
      clientType: 'Persoana fizica',
      name: '',
      cnp: '',
      vatId: '',
      nrRegComert: '',
      isVatPayer: false,
      email: '',
      phone: '',
      address: '',
      deliveryAddresses: [], // Valoarea este gestionată de react-hook-form
      bankAccountLei: '',
      bankAccountEuro: '',
      mentions: '',
    },
  })

  const clientType = form.watch('clientType')
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = form

  // Funcțiile `handleAddLoadingAddr` și `handleRemoveLoadingAddr` au fost eliminate
  // deoarece logica lor este deja implementată corect și mai simplu în JSX,
  // folosind `field.onChange` de la react-hook-form.

  const onSubmit: SubmitHandler<IClientCreate> = async (values) => {
    console.log('📤 onSubmit payload:', values)
    try {
      // Obiectul `values` conține deja toate datele din formular,
      // inclusiv `deliveryAddresses`, gestionat de react-hook-form.
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      toast.success('Client creat cu succes.')
      router.push('/clients')
      //eslint-disable-next-line
    } catch (err: any) {
      toast.error(err.message)
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
        {/* Contact */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
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
        </div>
        {/* IBAN */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <FormField
            control={control}
            name='bankAccountLei'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cont Bancar LEI</FormLabel>
                <FormControl>
                  <Input placeholder='RO29BACX0000002238640000' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='bankAccountEuro'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cont Bancar Euro</FormLabel>
                <FormControl>
                  <Input placeholder='RO29BACX0000002238640000' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Adresă fiscală */}
        <div className='space-y-2 p-4 border rounded-lg'>
          <FormField
            control={control}
            name='address'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Adresă fiscală (facturare){' '}
                  <span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='Județ, Oraș, Str. Principală, Nr. 1'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />{' '}
          {/* Adrese de livrare marfă */}
          <FormField
            control={control}
            name='deliveryAddresses'
            render={({ field }) => (
              <FormItem className='space-y-2 p-4 border rounded-lg'>
                <FormLabel>
                  Adrese de livrare <span className='text-red-500'>*</span>
                </FormLabel>
                <div className='flex items-center space-x-2'>
                  <FormControl>
                    <Input
                      placeholder='Județ, Oraș, Str. Principală, Nr. 1'
                      value={currentLoadingAddr}
                      onChange={(e) => setCurrentLoadingAddr(e.target.value)}
                    />
                  </FormControl>
                  <Button
                    variant='outline'
                    type='button'
                    onClick={() => {
                      const addr = currentLoadingAddr.trim()
                      if (!addr) {
                        toast.error('Completează câmpul înainte de a adăuga.')
                        return
                      }
                      // Adaugă noua adresă la array-ul existent din formular
                      field.onChange([...field.value, addr])
                      setCurrentLoadingAddr('')
                    }}
                  >
                    Adaugă Adresa
                  </Button>
                </div>

                {/* Afișează lista de adrese direct din starea formularului (`field.value`) */}
                <ul className='mt-2 space-y-1'>
                  {field.value.map((addr, i) => (
                    <li
                      key={i}
                      className='flex items-center justify-between gap-2 pl-2 bg-secondary rounded-md text-sm'
                    >
                      <span>{addr}</span>
                      <Button
                        size='sm'
                        type='button'
                        onClick={() => {
                          // Elimină adresa selectată și actualizează starea formularului
                          field.onChange(
                            field.value.filter((_, idx) => idx !== i)
                          )
                        }}
                      >
                        X
                      </Button>
                    </li>
                  ))}
                </ul>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
        <Button type='submit' className='w-full'>
          Adaugă client
        </Button>
      </form>
    </Form>
  )
}
