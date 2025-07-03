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
import type {
  ISupplierDoc,
  ISupplierInput,
} from '@/lib/db/modules/suppliers/types'
import { SupplierUpdateSchema } from '@/lib/db/modules/suppliers/validator'
import LoadingPage from '@/app/loading'

interface Props {
  initialValues: ISupplierDoc
}

type FormValues = ISupplierInput & { _id: string }

export default function SupplierEditForm({ initialValues }: Props) {
  const router = useRouter()

  const [brands, setBrands] = useState<string[]>([...initialValues.brand])
  const [currentBrand, setCurrentBrand] = useState('')
  const [loadingAddrs, setLoadingAddrs] = useState<string[]>(
    Array.isArray(initialValues.loadingAddress)
      ? [...initialValues.loadingAddress]
      : []
  )
  const [currentLoadingAddr, setCurrentLoadingAddr] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(SupplierUpdateSchema),
    defaultValues: {
      _id: initialValues._id,
      name: initialValues.name,
      contactName: initialValues.contactName ?? '',
      email: initialValues.email ?? '',
      phone: initialValues.phone ?? '',
      address: initialValues.address,
      fiscalCode: initialValues.fiscalCode ?? '',
      regComNumber: initialValues.regComNumber ?? '',
      bankAccountLei: initialValues.bankAccountLei ?? '',
      bankAccountEuro: initialValues.bankAccountEuro ?? '',
      externalTransport: initialValues.externalTransport,
      externalTransportCosts: initialValues.externalTransportCosts ?? 0,
      internalTransportCosts: initialValues.internalTransportCosts ?? 0,
      brand: [...initialValues.brand],
      loadingAddress: loadingAddrs,
      mentions: initialValues.mentions ?? '',
      isVatPayer: initialValues.isVatPayer,
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

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      const payload: FormValues = {
        ...values,
        brand: brands,
        loadingAddress: loadingAddrs,
      }
      const res = await fetch(`/api/admin/management/suppliers/${values._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      toast.success('Furnizor actualizat.')
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
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
          {/* 1. Nume */}
          <FormField
            control={control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nume furnizor<span className='text-red-500'>*</span>
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
                <FormLabel>Nume Persoană de contact</FormLabel>
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
                  Email furnizor <span className='text-red-500'>*</span>
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
                  <Input type='tel' {...field} />
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
                  Număr Registru Comerț<span className='text-red-500'>*</span>
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
            name='bankAccountLei'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Cont Bancar LEI<span className='text-red-500'>*</span>
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
            name='bankAccountEuro'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cont Bancar EURO</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name='address'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Adresă fiscală (facturare)
                <span className='text-red-500'>*</span>
              </FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='space-y-2 p-4 border rounded-lg'>
          <FormLabel>
            Adrese de încărcare marfă<span className='text-red-500'>*</span>
          </FormLabel>
          <div className='flex gap-2'>
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
          <div className='space-y-2 pt-2'>
            {loadingAddrs.map((addr, i) => (
              <div
                key={i}
                className='flex justify-between items-center pl-2 bg-secondary rounded'
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

        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
          <FormField
            control={control}
            name='isVatPayer'
            render={({ field }) => (
              <FormItem className='flex items-center space-x-2'>
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
              <FormItem className='flex items-center space-x-2'>
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
                <FormLabel>Cost transport furnizor</FormLabel>
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
                <FormLabel>Cost transport intern</FormLabel>
                <FormControl>
                  <Input type='number' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='space-y-2 p-4 border rounded-lg'>
          <FormLabel>Branduri furnizor</FormLabel>
          <div className='flex gap-2'>
            <Input
              placeholder='Adaugă un brand'
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
                className='flex justify-between items-center pl-2 bg-secondary rounded'
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

        <FormField
          control={control}
          name='mentions'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mențiuni</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className='text-sm text-muted-foreground mb-2'>
          Câmpurile marcate cu <span className='text-red-500'>*</span> sunt
          obligatorii.
        </p>
        <Button type='submit' disabled={isSubmitting} className='w-full'>
          Salvează modificările
        </Button>
      </form>
    </Form>
  )
}
