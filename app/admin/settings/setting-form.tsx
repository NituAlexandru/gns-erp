'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { SettingInputSchema, updateSetting } from '@/lib/db/modules/setting'
import type { ISettingInput } from '@/lib/db/modules/setting'
// import useSetting from '@/hooks/use-setting-store'
import SiteInfoForm from './site-info-form'
import CommonForm from './common-form'
import PaymentMethodForm from './payment-method-form'
import DeliveryDateForm from './delivery-date-form'

const SettingForm = ({ setting }: { setting: ISettingInput }) => {
  // const { setSetting } = useSetting()
  const { toast } = useToast()

  const form = useForm<ISettingInput>({
    resolver: zodResolver(SettingInputSchema),
    defaultValues: setting,
  })
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form

  const onSubmit = async (values: ISettingInput) => {
    const res = await updateSetting(values)
    if (!res.success) {
      toast({
        description: res.message,
      })
    } else {
      toast({ description: res.message })
      // setSetting(values)
    }
  }

  return (
    // this provides context for all <FormField> children
    <Form {...form}>
      {/* this is the actual HTML form */}
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4' noValidate>
        <SiteInfoForm id='setting-site-info' form={form} />
        <CommonForm id='setting-common' form={form} />
        <PaymentMethodForm id='setting-payment-methods' form={form} />
        <DeliveryDateForm id='setting-delivery-dates' form={form} />

        <div>
          <Button
            type='submit'
            size='lg'
            disabled={isSubmitting}
            className='w-full mb-24'
          >
            {isSubmitting ? 'Submitting...' : 'Save Setting'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default SettingForm
