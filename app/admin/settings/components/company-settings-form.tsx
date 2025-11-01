'use client'

import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ISettingInput } from '@/lib/db/modules/setting/types'
import { SettingInputSchema } from '@/lib/db/modules/setting/validator'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { updateSetting } from '@/lib/db/modules/setting/setting.actions'
import { useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { PlusCircle, Trash2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ROMANIAN_BANKS } from '@/lib/constants'

const clientSideDefaults: ISettingInput = {
  name: '',
  cui: '',
  regCom: '',
  web: '',
  address: {
    judet: '',
    localitate: '',
    strada: '',
    numar: '',
    tara: 'RO',
    codPostal: '',
    alteDetalii: '',
  },
  bankAccounts: [
    { bankName: ROMANIAN_BANKS[0], iban: '', currency: 'RON', isDefault: true },
  ],
  emails: [{ address: '', isDefault: true }],
  phones: [{ number: '', isDefault: true }],
}

interface CompanySettingsFormProps {
  initialData: ISettingInput | null
}

export function CompanySettingsForm({ initialData }: CompanySettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ISettingInput>({
    resolver: zodResolver(SettingInputSchema),
    defaultValues: initialData || clientSideDefaults,
  })

  // ... (useFieldArray hooks - neschimbate)
  const {
    fields: phoneFields,
    append: appendPhone,
    remove: removePhone,
  } = useFieldArray({ control: form.control, name: 'phones' })

  const {
    fields: emailFields,
    append: appendEmail,
    remove: removeEmail,
  } = useFieldArray({ control: form.control, name: 'emails' })

  const {
    fields: bankFields,
    append: appendBank,
    remove: removeBank,
  } = useFieldArray({ control: form.control, name: 'bankAccounts' })

  // ... (funcțiile setDefault - neschimbate)
  const setDefaultBank = (index: number) => {
    const currentValues = form.getValues('bankAccounts')
    const newValues = currentValues.map((item, idx) => ({
      ...item,
      isDefault: idx === index,
    }))
    form.setValue('bankAccounts', newValues, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const setDefaultEmail = (index: number) => {
    const currentValues = form.getValues('emails')
    const newValues = currentValues.map((item, idx) => ({
      ...item,
      isDefault: idx === index,
    }))
    form.setValue('emails', newValues, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const setDefaultPhone = (index: number) => {
    const currentValues = form.getValues('phones')
    const newValues = currentValues.map((item, idx) => ({
      ...item,
      isDefault: idx === index,
    }))
    form.setValue('phones', newValues, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  async function onSubmit(values: ISettingInput) {
    setIsSaving(true)
    // Folosim un ID pentru toast ca să-l putem închide manual
    const toastId = 'saving-settings'
    toast.loading('Se salvează modificările...', { id: toastId })

    try {
      const result = await updateSetting(values)

      if (result.success) {
        // Închidem toast-ul de loading și afișăm succes
        toast.success('Setările companiei au fost salvate!', { id: toastId })
        if (result.data) {
          form.reset(result.data)
        }
      } else {
        // Închidem toast-ul de loading și afișăm eroarea
        toast.error('Eroare la salvare:', {
          id: toastId,
          description: result.message,
        })
      }
    } catch (err) {
      // Asta prinde erorile neașteptate (de rețea, etc.)
      console.error('Eroare neașteptată la onSubmit:', err)
      toast.error('Eroare necunoscută', {
        id: toastId,
        description:
          err instanceof Error ? err.message : 'Te rugăm să încerci din nou.',
      })
    } finally {
      // Acest bloc rulează întotdeauna și deblochează butonul
      setIsSaving(false)
    }
  }

  return (
    <Card>
      {/* 1. <Form> wrapper-ul trebuie să fie aici, sus */}
      <Form {...form}>
        {/* 2. <form> tag-ul trebuie să înconjoare <CardHeader> și <CardContent> */}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Datele Companiei</CardTitle>
            {/* 3. <FormDescription> este acum ÎNĂUNTRUL contextului <Form> */}
            <FormDescription>
              Informațiile legale și de contact ale companiei tale. Aceste date
              vor fi folosite la generarea documentelor.
            </FormDescription>
          </CardHeader>
          {/* 4. Am mutat 'space-y-8' de pe <form> aici */}
          <CardContent className='space-y-8'>
            {/* Secțiunea Date Fiscale */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium'>Date Fiscale</h3>
              {/* ... (câmpurile neschimbate) ... */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume Companie</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='cui'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CUI</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='regCom'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nr. Registrul Comerțului</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='web'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='https://companie.ro'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Secțiunea Sediu Social */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium'>Sediu Social</h3>
              {/* ... (câmpurile neschimbate) ... */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
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
                  control={form.control}
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
              </div>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <FormField
                  control={form.control}
                  name='address.strada'
                  render={({ field }) => (
                    <FormItem className='md:col-span-2'>
                      <FormLabel>Strada</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='address.numar'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Număr</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name='address.tara'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Țara (Cod)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Secțiunea Conturi Bancare */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium'>Conturi Bancare</h3>
              <RadioGroup
                onValueChange={(value) => setDefaultBank(parseInt(value))}
                defaultValue={bankFields
                  .findIndex((f) => f.isDefault)
                  .toString()}
              >
                {bankFields.map((field, index) => (
                  <div
                    key={field.id}
                    className='flex gap-4 items-start p-4 border rounded-md'
                  >
                    <FormControl>
                      <RadioGroupItem
                        value={index.toString()}
                        id={`bank-default-${index}`}
                      />
                    </FormControl>
                    {/* 🔽 --- MODIFICAT: grid-cols-3 --- 🔽 */}
                    <div className='flex-1 grid grid-cols-1 md:grid-cols-3 gap-4'>
                      <FormField
                        control={form.control}
                        name={`bankAccounts.${index}.bankName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bancă</FormLabel>
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
                      <FormField
                        control={form.control}
                        name={`bankAccounts.${index}.iban`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IBAN</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* 🔽 --- NOU: Câmp pentru Monedă --- 🔽 */}
                      <FormField
                        control={form.control}
                        name={`bankAccounts.${index}.currency`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monedă</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => removeBank(index)}
                      disabled={bankFields.length <= 1}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  appendBank({
                    bankName: ROMANIAN_BANKS[0],
                    iban: '',
                    currency: 'RON',
                    isDefault: false,
                  })
                }
              >
                <PlusCircle className='h-4 w-4 mr-2' /> Adaugă Cont
              </Button>
            </div>

            <Separator />

            {/* Secțiunea Email-uri */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium'>Adrese de Email</h3>
              {/* ... (codul pentru emailuri neschimbat) ... */}
              <RadioGroup
                onValueChange={(value) => setDefaultEmail(parseInt(value))}
                defaultValue={emailFields
                  .findIndex((f) => f.isDefault)
                  .toString()}
              >
                {emailFields.map((field, index) => (
                  <div
                    key={field.id}
                    className='flex gap-4 items-center p-4 border rounded-md'
                  >
                    <FormControl>
                      <RadioGroupItem
                        value={index.toString()}
                        id={`email-default-${index}`}
                      />
                    </FormControl>
                    <FormField
                      control={form.control}
                      name={`emails.${index}.address`}
                      render={({ field }) => (
                        <FormItem className='flex-1'>
                          <FormLabel className='sr-only'>Email</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder='adresa@email.ro' />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => removeEmail(index)}
                      disabled={emailFields.length <= 1}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => appendEmail({ address: '', isDefault: false })}
              >
                <PlusCircle className='h-4 w-4 mr-2' /> Adaugă Email
              </Button>
            </div>

            <Separator />

            {/* Secțiunea Telefoane */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium'>Numere de Telefon</h3>
              {/* ... (codul pentru telefoane neschimbat) ... */}
              <RadioGroup
                onValueChange={(value) => setDefaultPhone(parseInt(value))}
                defaultValue={phoneFields
                  .findIndex((f) => f.isDefault)
                  .toString()}
              >
                {phoneFields.map((field, index) => (
                  <div
                    key={field.id}
                    className='flex gap-4 items-center p-4 border rounded-md'
                  >
                    <FormControl>
                      <RadioGroupItem
                        value={index.toString()}
                        id={`phone-default-${index}`}
                      />
                    </FormControl>
                    <FormField
                      control={form.control}
                      name={`phones.${index}.number`}
                      render={({ field }) => (
                        <FormItem className='flex-1'>
                          <FormLabel className='sr-only'>Telefon</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder='0700 000 000' />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => removePhone(index)}
                      disabled={phoneFields.length <= 1}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => appendPhone({ number: '', isDefault: false })}
              >
                <PlusCircle className='h-4 w-4 mr-2' /> Adaugă Telefon
              </Button>
            </div>

            <Button type='submit' disabled={isSaving}>
              {isSaving ? 'Se salvează...' : 'Salvează Modificările'}
            </Button>
          </CardContent>
        </form>
      </Form>
    </Card>
  )
}
