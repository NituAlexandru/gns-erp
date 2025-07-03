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
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SupplierCreateSchema } from '@/lib/db/modules/suppliers/validator'
import type { ISupplierInput } from '@/lib/db/modules/suppliers/types'
import LoadingPage from '@/app/loading'

export default function SupplierForm() {
  const router = useRouter()
  const [currentBrand, setCurrentBrand] = useState('')
  const [brands, setBrands] = useState<string[]>([])
  const [currentLoadingAddr, setCurrentLoadingAddr] = useState('')
  const [loadingAddrs, setLoadingAddrs] = useState<string[]>([])

  const form = useForm<ISupplierInput>({
    resolver: zodResolver(SupplierCreateSchema),
    defaultValues: {
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      fiscalCode: '',
      regComNumber: '',
      bankAccountLei: '',
      bankAccountEuro: '',
      externalTransport: false,
      isVatPayer: false,
      loadingAddress: [],
      externalTransportCosts: 0,
      internalTransportCosts: 0,
      brand: [],
      mentions: '',
    },
  })

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = form

  const handleAddBrand = () => {
    const b = currentBrand.trim()
    if (b && !brands.includes(b)) {
      setBrands((prev) => [...prev, b])
      setCurrentBrand('')
    }
  }
  const handleRemoveBrand = (idx: number) =>
    setBrands((prev) => prev.filter((_, i) => i !== idx))

  const handleAddLoadingAddr = () => {
    const a = currentLoadingAddr.trim()
    if (a && !loadingAddrs.includes(a)) {
      setLoadingAddrs((prev) => [...prev, a])
      setCurrentLoadingAddr('')
    }
  }
  const handleRemoveLoadingAddr = (idx: number) =>
    setLoadingAddrs((prev) => prev.filter((_, i) => i !== idx))

  const onSubmit: SubmitHandler<ISupplierInput> = async (values) => {
    try {
      const payload: ISupplierInput = {
        ...values,
        brand: brands,
        loadingAddress: loadingAddrs,
      }
      const res = await fetch('/api/admin/management/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      toast.success('Furnizor creat.')
      router.push('/admin/management/suppliers')
      router.refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    }
  }

  if (isSubmitting) {
    return <LoadingPage />
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-2'>
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
                  <Input placeholder='Ex: SC Furnizări SRL' {...field} />
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
                <FormLabel>Nume persoană de contact</FormLabel>
                <FormControl>
                  <Input placeholder='Popescu Ion' {...field} />
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
                  Email furnizor<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type='email'
                    placeholder='contact@furnizor.ro'
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
                  <Input type='tel' placeholder='07xx xxx xxx' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='fiscalCode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Cod Fiscal<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder='RO123456' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />{' '}
          <FormField
            control={control}
            name='regComNumber'
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
          <FormField
            control={control}
            name='bankAccountLei'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Cont Bancar LEI<span className='text-red-500'>*</span>
                </FormLabel>
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
                <FormLabel>Cont Bancar EURO</FormLabel>
                <FormControl>
                  <Input placeholder='RO29BACX0000002238640000' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='space-y-2 p-4 border rounded-lg md:col-span-2'>
          <FormField
            control={control}
            name='address'
            render={({ field }) => (
              <FormItem className='md:col-span-2'>
                <FormLabel>
                  Adresă fiscală (facturare)
                  <span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Str. Principală, Nr. 1, Oraș, Județ'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='space-y-2 p-4 border rounded-lg md:col-span-2'>
            <FormLabel>
              Adrese de încărcare marfă<span className='text-red-500'>*</span>
            </FormLabel>
            <div className='flex items-center gap-2'>
              <Input
                placeholder='Adaugă o adresă'
                value={currentLoadingAddr}
                onChange={(e) => setCurrentLoadingAddr(e.target.value)}
              />
              <Button
                type='button'
                variant='outline'
                onClick={handleAddLoadingAddr}
              >
                Adaugă
              </Button>
            </div>
            <div className='space-y-1'>
              {loadingAddrs.map((addr, i) => (
                <div
                  key={i}
                  className='flex items-center justify-between gap-1 pl-1 bg-secondary rounded-md'
                >
                  <span>{addr}</span>
                  <Button
                    type='button'
                    size='sm'
                    onClick={() => handleRemoveLoadingAddr(i)}
                  >
                    X
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center'>
            <FormField
              control={control}
              name='isVatPayer'
              render={({ field }) => (
                <FormItem className='flex items-center space-x-2 pt-6'>
                  <FormControl>
                    <Checkbox
                      className='cursor-pointer'
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
                      className='cursor-pointer'
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Transport asigurat de furnizor</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='externalTransportCosts'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costuri transport furnizor</FormLabel>
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
                  <FormLabel>Costuri transport Genesis</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>{' '}
        </div>
        <div className='space-y-2 p-4 pb-2 border rounded-lg md:col-span-2'>
          <FormLabel>Brandurile furnizorului</FormLabel>
          <div className='flex items-center gap-2'>
            <Input
              placeholder='Adaugă un brand nou'
              value={currentBrand}
              onChange={(e) => setCurrentBrand(e.target.value)}
            />
            <Button type='button' variant='outline' onClick={handleAddBrand}>
              Adaugă
            </Button>
          </div>
          <div className='space-y-2 pt-2'>
            {brands.map((b, i) => (
              <div
                key={i}
                className='flex items-center justify-between gap-2 pl-1 bg-secondary rounded-md'
              >
                <span>{b}</span>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => handleRemoveBrand(i)}
                >
                  X
                </Button>
              </div>
            ))}
          </div>
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
        <Button type='submit' disabled={isSubmitting} className='w-full bg-red-500'>
          Adaugă furnizor
        </Button>
      </form>
    </Form>
  )
}
