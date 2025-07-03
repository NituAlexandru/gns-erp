'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import useIsMounted from '@/hooks/use-is-mounted'
import Link from 'next/link'
import useCartStore from '@/hooks/use-cart-store'
import ProductPrice from '@/components/shared/product/product-price'
import { APP_NAME } from '@/lib/constants'
import { createOrder } from '@/lib/db/modules/order/order.actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { OrderItem, ShippingAddress } from '@/lib/db/modules/order/types'
import { ShippingAddressSchema } from '@/lib/db/modules/order/validator'

const shippingAddressDefaultValues =
  process.env.NODE_ENV === 'development'
    ? {
        fullName: 'Alexandru',
        street: 'Nitu Vasile 68',
        city: 'Bucuresti',
        province: 'Sector 4',
        phone: '0721285807',
        postalCode: '400001',
        country: 'Romania',
      }
    : {
        fullName: '',
        street: '',
        city: '',
        province: '',
        phone: '',
        postalCode: '',
        country: '',
      }

const OrderForm = () => {
  const router = useRouter()
  const isMounted = useIsMounted()

  const { cart, setShippingAddress, clearCart, removeItem, updateItem } =
    useCartStore()

  const {
    items,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    shippingAddress: cartShippingAddress, // Redenumit pentru a evita conflict cu variabila locală din form
    deliveryDateIndex,
    paymentMethod,
  } = cart

  const [, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const shippingAddressForm = useForm<ShippingAddress>({
    resolver: zodResolver(ShippingAddressSchema),
    defaultValues: cartShippingAddress || shippingAddressDefaultValues,
  })
  const onSubmitShippingAddress: SubmitHandler<ShippingAddress> = async (
    values
  ) => {
    // console.log('Submitting address:', values)
    try {
      await setShippingAddress(values)
      toast.success('Adresa s-a salvat cu succes.')
      setIsAddressSelected(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('livrarea în județul')) {
        toast.error(
          <div className='flex flex-col items-start'>
            <span className='font-bold'>{msg}</span>
            <Link
              href='/page/oferta-personalizata'
              className='mt-2 underline font-semibold'
            >
              Cere ofertă personalizată →
            </Link>
          </div>,
          { duration: 5000 }
        )

        // redirecționăm clientul spre pagina de ofertă personalizată
        setTimeout(() => {
          router.push('/page/oferta-personalizata')
        }, 5000)
        return
      } else {
        // orice altă eroare o afișăm ca eroare critică
        console.error('Unexpected error in setShippingAddress:', err)
        toast.error(msg || 'A apărut o eroare neașteptată.')
        setIsAddressSelected(false)
      }
    }
  }

  useEffect(() => {
    if (!isMounted || !cartShippingAddress) return
    shippingAddressForm.setValue('adressName', cartShippingAddress.adressName)
    shippingAddressForm.setValue('street', cartShippingAddress.street)
    shippingAddressForm.setValue('city', cartShippingAddress.city)
    shippingAddressForm.setValue('country', cartShippingAddress.country)
    shippingAddressForm.setValue('postalCode', cartShippingAddress.postalCode)
    shippingAddressForm.setValue('province', cartShippingAddress.province)
    shippingAddressForm.setValue('phone', cartShippingAddress.phone)
  }, [cartShippingAddress, isMounted, shippingAddressForm])

  const [isAddressSelected, setIsAddressSelected] = useState<boolean>(false)
  const [isPaymentMethodSelected, setIsPaymentMethodSelected] =
    useState<boolean>(false)
  const [isDeliveryDateSelected, setIsDeliveryDateSelected] =
    useState<boolean>(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false)

  const handlePlaceOrder = async () => {
    // console.log('[Checkout] placing order with cart:', cart)
    // în loc de a trimite întreg `cart`, construim un payload care conține și Date-ul
    setIsPlacingOrder(true)

    const orderPayload = {
      ...cart,
    }
    console.log('[Checkout] placing order with payload:', orderPayload)
    const res = await createOrder(cart)

    if (!res.success) {
      toast.error(res.message)
    } else {
      toast.success(res.message)
      clearCart()
      router.push(`/checkout/${res.data?.orderId}`)
      setIsPlacingOrder(false)
    }
  }

  const CheckoutSummary = () => (
    <Card>
      <CardContent className='p-4'>
        <div>
          <div className='text-lg font-bold'>Sumar Comandă</div>
          <div className='space-y-2'>
            <div className='flex justify-between'>
              <span>Articole:</span>
              <span>
                <ProductPrice price={itemsPrice} plain /> {/* Din store */}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Transport:</span>
              <span>
                {shippingPrice === undefined ? (
                  '--'
                ) : shippingPrice === 0 ? (
                  'GRATUIT'
                ) : (
                  <ProductPrice price={shippingPrice} plain /> /* Din store */
                )}
              </span>
            </div>
            <div className='flex justify-between text-muted-foreground'>
              <span>TVA:</span>
              <span>
                {taxPrice === undefined ? (
                  '--'
                ) : (
                  <ProductPrice price={taxPrice} plain /> /* Din store */
                )}
              </span>
            </div>
            <div className='flex justify-between pt-4 font-bold text-lg'>
              <span>Total:</span>
              <span>
                <ProductPrice price={totalPrice} plain /> {/* Din store */}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <main className='max-w-6xl mx-auto highlight-link'>
      <div className='grid md:grid-cols-4 gap-6'>
        <div className='md:col-span-3'>
          {/* shipping address */}
          <div>
            {isAddressSelected && cartShippingAddress ? (
              <div className='grid grid-cols-1 md:grid-cols-12    my-3  pb-3'>
                <div className='col-span-5 flex text-lg font-bold '>
                  <span className='w-8'>1 </span>
                  <span>Adresa de livrare</span>
                </div>
                <div className='col-span-5 '>
                  <p>
                    {cartShippingAddress.adressName} <br />
                    {cartShippingAddress.street} <br />
                    {`${cartShippingAddress.city}, ${cartShippingAddress.province}, ${cartShippingAddress.postalCode}, ${cartShippingAddress.country}`}
                  </p>
                </div>
                <div className='col-span-2'>
                  <Button
                    variant={'outline'}
                    onClick={() => {
                      setIsAddressSelected(false)
                      setIsPaymentMethodSelected(true)
                      setIsDeliveryDateSelected(true)
                    }}
                  >
                    Modifică
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className='flex text-primary text-lg font-bold my-2'>
                  <span className='w-8'>1 </span>
                  <span>Introdu adresa de livrare</span>
                </div>
                <Form {...shippingAddressForm}>
                  <form
                    method='post'
                    onSubmit={shippingAddressForm.handleSubmit(
                      onSubmitShippingAddress
                    )}
                    className='space-y-4'
                  >
                    <Card className='md:ml-8 my-4'>
                      <CardContent className='p-4 space-y-2'>
                        <div className='text-lg font-bold mb-2'>Adresa ta</div>

                        <div className='flex flex-col gap-5 md:flex-row'>
                          <FormField
                            control={shippingAddressForm.control}
                            name='adressName'
                            render={({ field }) => (
                              <FormItem className='w-full'>
                                <FormLabel>Nume complet</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder='Nume complet'
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div>
                          <FormField
                            control={shippingAddressForm.control}
                            name='street'
                            render={({ field }) => (
                              <FormItem className='w-full'>
                                <FormLabel>Adresă</FormLabel>
                                <FormControl>
                                  <Input placeholder='Adresă' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className='flex flex-col gap-5 md:flex-row'>
                          <FormField
                            control={shippingAddressForm.control}
                            name='city'
                            render={({ field }) => (
                              <FormItem className='w-full'>
                                <FormLabel>Oraș</FormLabel>
                                <FormControl>
                                  <Input placeholder='Oraș' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shippingAddressForm.control}
                            name='province'
                            render={({ field }) => (
                              <FormItem className='w-full'>
                                <FormLabel>Județ / Sector</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder='Județ / Sector'
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shippingAddressForm.control}
                            name='country'
                            render={({ field }) => (
                              <FormItem className='w-full'>
                                <FormLabel>Țară</FormLabel>
                                <FormControl>
                                  <Input placeholder='Țară' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className='flex flex-col gap-5 md:flex-row'>
                          <FormField
                            control={shippingAddressForm.control}
                            name='postalCode'
                            render={({ field }) => (
                              <FormItem className='w-full'>
                                <FormLabel>Cod poștal</FormLabel>
                                <FormControl>
                                  <Input placeholder='Cod poștal' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shippingAddressForm.control}
                            name='phone'
                            render={({ field }) => (
                              <FormItem className='w-full'>
                                <FormLabel>Număr de telefon</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder='Număr de telefon'
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className='  p-4'>
                        <Button
                          type='submit'
                          className='rounded-full font-bold'
                        >
                          Expediază la această adresă
                        </Button>
                      </CardFooter>
                    </Card>
                  </form>
                </Form>
              </>
            )}
          </div>
          {/* payment method */}
          <div className='border-y'>
            {isPaymentMethodSelected && paymentMethod ? (
              <div className='grid  grid-cols-1 md:grid-cols-12  my-3 pb-3'>
                <div className='flex text-lg font-bold  col-span-5'>
                  <span className='w-8'>2 </span>
                  <span>Metodă de plată</span>
                </div>
                <div className='col-span-5 '>
                  <p>{paymentMethod}</p>
                </div>
                <div className='col-span-2'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setIsPaymentMethodSelected(false)
                      if (paymentMethod) setIsDeliveryDateSelected(true)
                    }}
                  >
                    Modifică
                  </Button>
                </div>
              </div>
            ) : isAddressSelected ? (
              <>
                <div className='flex text-primary text-lg font-bold my-2'>
                  <span className='w-8'>2 </span>
                  <span>Alege o metodă de plată</span>
                </div>
              </>
            ) : (
              <div className='flex text-muted-foreground text-lg font-bold my-4 py-3'>
                <span className='w-8'>2 </span>
                <span>Alege o metodă de plată</span>
              </div>
            )}
          </div>
          {/* items and delivery date */}
          <div>
            {isDeliveryDateSelected && deliveryDateIndex != undefined ? (
              <div className='grid  grid-cols-1 md:grid-cols-12  my-3 pb-3'>
                <div className='flex text-lg font-bold  col-span-5'>
                  <span className='w-8'>3 </span>
                  <span>Articole și livrare</span>
                </div>

                <div className='col-span-2'>
                  <Button
                    variant={'outline'}
                    onClick={() => {
                      setIsPaymentMethodSelected(true)
                      setIsDeliveryDateSelected(false)
                    }}
                  >
                    Modifică
                  </Button>
                </div>
              </div>
            ) : isPaymentMethodSelected && isAddressSelected ? (
              <>
                <div className='flex text-primary  text-lg font-bold my-2'>
                  <span className='w-8'>3 </span>
                  <span>Verifică articolele și livrarea</span>
                </div>
                <Card className='md:ml-8'>
                  <CardContent className='p-4'>
                    <div className='grid md:grid-cols-2 gap-6'>
                      <div>
                        {items.map((item: OrderItem, _index: number) => (
                          <div key={_index} className='flex gap-4 py-2'>
                            <div className='relative w-16 h-16'>
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes='20vw'
                                style={{ objectFit: 'contain' }}
                              />
                            </div>

                            <div className='flex-1'>
                              <p className='font-semibold'>
                                {item.name}
                                {item.color && `, ${item.color}`}
                                {item.size && `, ${item.size}`}
                              </p>
                              <p className='font-bold'>
                                <ProductPrice price={item.price} plain />
                              </p>

                              {/* aici aplicăm logica pentru palet */}
                              {!item.isPalletItem ? (
                                <Select
                                  value={item.quantity.toString()}
                                  onValueChange={(value) => {
                                    if (value === '0') removeItem(item)
                                    else updateItem(item, Number(value))
                                  }}
                                >
                                  <SelectTrigger className='w-24'>
                                    <SelectValue>
                                      Nr: {item.quantity}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent position='popper'>
                                    {Array.from({
                                      length: item.countInStock,
                                    }).map((_, i) => (
                                      <SelectItem
                                        key={i + 1}
                                        value={`${i + 1}`}
                                      >
                                        {i + 1}
                                      </SelectItem>
                                    ))}
                                    <SelectItem key='delete' value='0'>
                                      Șterge
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Select
                                  disabled
                                  value={item.quantity.toString()}
                                >
                                  <SelectTrigger className='w-24'>
                                    <SelectValue>
                                      Nr: {item.quantity}
                                    </SelectValue>
                                  </SelectTrigger>
                                </Select>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/*  */}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className='flex text-muted-foreground text-lg font-bold my-4 py-3'>
                <span className='w-8'>3 </span>
                <span>Articole și livrare</span>
              </div>
            )}
          </div>
          {isPaymentMethodSelected && isAddressSelected && (
            <div className='mt-6'>
              <div className='block md:hidden'>
                <CheckoutSummary />
              </div>
              <Card className='hidden md:block '>
                <CardContent className='p-4 flex flex-col md:flex-row justify-between items-center gap-3'>
                  <Button
                    onClick={handlePlaceOrder}
                    className='rounded-full'
                    disabled={isPlacingOrder} // Dezactivăm butonul în timpul încărcării
                  >
                    {isPlacingOrder ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Se plasează comanda...
                      </>
                    ) : (
                      'Plasează comanda'
                    )}
                  </Button>
                  <div className='flex-1'>
                    <p className='font-bold text-lg'>
                      Total comandă: <ProductPrice price={totalPrice} plain />{' '}
                      <span className='text-gray-500'>TVA inclus</span>
                    </p>
                    <p className='text-xs'>
                      {' '}
                      Prin plasarea comenzii, ești de acord cu{' '}
                      <Link href='/page/politica-de-confidentialitate'>
                        politica de confidențialitate
                      </Link>{' '}
                      și cu{' '}
                      <Link href='/page/termeni-si-conditii'>
                        termenii și condițiile de utilizare
                      </Link>{' '}
                      ale {APP_NAME}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        <div className='hidden md:block'>
          <CheckoutSummary />
        </div>
      </div>
    </main>
  )
}
export default OrderForm
