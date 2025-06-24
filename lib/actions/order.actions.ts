'use server'
import { formatError, round2 } from '../utils'
import { AVAILABLE_DELIVERY_DATES, PAGE_SIZE, VAT_RATE } from '../constants'
import { connectToDatabase } from '../db'
import { auth } from '@/auth'
import { OrderInputSchema } from '../validator'

// import {
//   sendAskReviewOrderItems,
//   sendOrderDeliveredNotification,
//   sendPurchaseReceipt,
// } from '@/emails'
import { revalidatePath } from 'next/cache'
import { Cart, IOrderList, OrderItem, ShippingAddress } from '@/types'
import { DateRange } from 'react-day-picker'
import Product from '../db/models/product.model'

import mongoose from 'mongoose'

import User from '../db/models/user.model'
import { addBusinessDays } from '../deliveryDates'
import Order, { IOrder } from '../db/models/order.model'

export async function updateOrderToPaid(orderId: string) {
  try {
    // console.log('[DEBUG] updateOrderToPaid() called for orderId=', orderId)

    await connectToDatabase()
    const order = await Order.findById(orderId).populate<{
      user: { email: string; name: string }
    }>('user', 'name email')
    if (!order) throw new Error('Order not found')

    // console.log('[DEBUG] fetched order, user.email=', order.user?.email)

    if (order.isPaid) throw new Error('Order is already paid')
    order.isPaid = true
    order.paidAt = new Date()
    await order.save()

    // console.log('[DEBUG] order saved, now trying to sendPurchaseReceipt…')

    if (!process.env.MONGODB_ERP_URI?.startsWith('mongodb://localhost'))
      await updateProductStock(order._id)

    // if (order.user.email) {
    //   try {
    //     await sendPurchaseReceipt({ order })
    //     // console.log('[DEBUG] sendPurchaseReceipt succeeded')
    //   } catch (emailErr) {
    //     console.error('[DEBUG] sendPurchaseReceipt FAILED:', emailErr)
    //   }
    // } else {
    //   console.warn('[DEBUG] no order.user.email — skipping sendPurchaseReceipt')
    // }

    revalidatePath(`/account/orders/${orderId}`)
    // console.log('[DEBUG] revalidated path, returning success')

    return { success: true, message: 'Comandă plătită cu succes' }
  } catch (err) {
    return { success: false, message: formatError(err) }
  }
}
const updateProductStock = async (orderId: string) => {
  const session = await mongoose.connection.startSession()

  try {
    session.startTransaction()
    const opts = { session }

    const order = await Order.findOneAndUpdate(
      { _id: orderId },
      { isPaid: true, paidAt: new Date() },
      opts
    )
    if (!order) throw new Error('Order not found')

    for (const item of order.items) {
      const product = await Product.findById(item.product).session(session)
      if (!product) throw new Error('Product not found')

      product.countInStock -= item.quantity
      await Product.updateOne(
        { _id: product._id },
        { countInStock: product.countInStock },
        opts
      )
    }
    await session.commitTransaction()
    session.endSession()
    return true
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
}
export async function deliverOrder(orderId: string) {
  try {
    await connectToDatabase()
    const order = await Order.findById(orderId).populate<{
      user: { email: string; name: string }
    }>('user', 'name email')
    if (!order) throw new Error('Order not found')
    if (!order.isPaid) throw new Error('Order is not paid')
    order.isDelivered = true
    order.deliveredAt = new Date()
    await order.save()
    // if (order.user.email) {
    //   await sendOrderDeliveredNotification({ order })
    // }
    // if (order.user.email) await sendAskReviewOrderItems({ order })
    revalidatePath(`/account/orders/${orderId}`)
    return { success: true, message: 'Comanda a fost livrată cu succes' }
  } catch (err) {
    return { success: false, message: formatError(err) }
  }
}
// DELETE
export async function deleteOrder(id: string) {
  try {
    await connectToDatabase()
    const res = await Order.findByIdAndDelete(id)
    if (!res) throw new Error('Order not found')
    revalidatePath('/admin/orders')
    return {
      success: true,
      message: 'Order deleted successfully',
    }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}
// GET ALL ORDERS
export async function getAllOrders({
  limit,
  page,
}: {
  limit?: number
  page: number
}) {
  limit = limit || PAGE_SIZE
  await connectToDatabase()
  const skipAmount = (Number(page) - 1) * limit
  const orders = await Order.find()
    .populate('user', 'name')
    .sort({ createdAt: 'desc' })
    .skip(skipAmount)
    .limit(limit)
  const ordersCount = await Order.countDocuments()
  return {
    data: JSON.parse(JSON.stringify(orders)) as IOrderList[],
    totalPages: Math.ceil(ordersCount / limit),
  }
}
// GET ORDERS
export async function getOrderSummary(date: DateRange) {
  await connectToDatabase()

  const ordersCount = await Order.countDocuments({
    createdAt: {
      $gte: date.from,
      $lte: date.to,
    },
  })
  const productsCount = await Product.countDocuments({
    createdAt: {
      $gte: date.from,
      $lte: date.to,
    },
  })
  const usersCount = await User.countDocuments({
    createdAt: {
      $gte: date.from,
      $lte: date.to,
    },
  })

  // === Aici încep agregările pentru totalCost și totalShipping ===
  const totalAggregate = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: date.from,
          $lte: date.to,
        },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: null,
        sales: { $sum: '$totalPrice' },
        cost: { $sum: { $multiply: ['$items.entryPrice', '$items.quantity'] } },
        shipping: { $sum: '$shippingPrice' },
      },
    },
    {
      $project: {
        _id: 0,
        totalSales: { $ifNull: ['$sales', 0] },
        totalCost: { $ifNull: ['$cost', 0] },
        totalShipping: { $ifNull: ['$shipping', 0] },
      },
    },
  ])
  const {
    totalSales = 0,
    totalCost = 0,
    totalShipping = 0,
  } = totalAggregate[0] || {}

  const today = new Date()
  const sixMonthEarlierDate = new Date(
    today.getFullYear(),
    today.getMonth() - 5,
    1
  )
  const monthlySales = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: sixMonthEarlierDate,
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        totalSales: { $sum: '$totalPrice' },
      },
    },
    {
      $project: {
        _id: 0,
        label: '$_id',
        value: '$totalSales',
      },
    },
    { $sort: { label: -1 } },
  ])

  const monthlyCostRaw = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: sixMonthEarlierDate,
        },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        totalCost: {
          $sum: { $multiply: ['$items.entryPrice', '$items.quantity'] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        label: '$_id',
        cost: '$totalCost',
      },
    },
    { $sort: { label: -1 } },
  ])

  const monthlyShippingRaw = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: sixMonthEarlierDate,
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        totalShipping: { $sum: '$shippingPrice' },
      },
    },
    {
      $project: {
        _id: 0,
        label: '$_id',
        shipping: '$totalShipping',
      },
    },
    { $sort: { label: -1 } },
  ])

  // Transformăm cele două array-uri raw în obiecte { [label]: valoare }
  const monthlyCost: Record<string, number> = {}
  monthlyCostRaw.forEach((x) => {
    monthlyCost[x.label] = x.cost
  })

  const monthlyShipping: Record<string, number> = {}
  monthlyShippingRaw.forEach((x) => {
    monthlyShipping[x.label] = x.shipping
  })
  // === Sfârșit agregări noi pentru lună ===

  const topSalesCategories = await getTopSalesCategories(date)
  const topSalesProducts = await getTopSalesProducts(date)
  const topSalesCategoriesBySum = await getTopSalesCategoriesBySum(
    date as { from: Date; to: Date }
  )

  const latestOrders = await Order.find()
    .populate('user', 'name')
    .sort({ createdAt: 'desc' })
    .limit(PAGE_SIZE)

  return {
    ordersCount,
    productsCount,
    usersCount,
    totalSales,
    totalCost,
    totalShipping,
    monthlySales: JSON.parse(JSON.stringify(monthlySales)),
    monthlyCost: JSON.parse(JSON.stringify(monthlyCost)),
    monthlyShipping: JSON.parse(JSON.stringify(monthlyShipping)),
    salesChartData: JSON.parse(JSON.stringify(await getSalesChartData(date))),
    topSalesCategories: JSON.parse(JSON.stringify(topSalesCategories)),
    topSalesProducts: JSON.parse(JSON.stringify(topSalesProducts)),
    topSalesCategoriesBySum: JSON.parse(
      JSON.stringify(topSalesCategoriesBySum)
    ),
    latestOrders: JSON.parse(JSON.stringify(latestOrders)) as IOrderList[],
  }
}
async function getSalesChartData(date: DateRange) {
  const result = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: date.from,
          $lte: date.to,
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        totalSales: { $sum: '$totalPrice' },
      },
    },
    {
      $project: {
        _id: 0,
        date: {
          $concat: [
            { $toString: '$_id.year' },
            '/',
            { $toString: '$_id.month' },
            '/',
            { $toString: '$_id.day' },
          ],
        },
        totalSales: 1,
      },
    },
    { $sort: { date: 1 } },
  ])

  return result
}
async function getTopSalesProducts(date: DateRange) {
  const result = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: date.from,
          $lte: date.to,
        },
      },
    },
    { $unwind: '$items' },

    // Group by productId to calculate total sales per product
    {
      $group: {
        _id: {
          name: '$items.name',
          image: '$items.image',
          _id: '$items.product',
        },
        totalSales: {
          $sum: { $multiply: ['$items.quantity', '$items.price'] },
        },
      },
    },
    {
      $sort: {
        totalSales: -1,
      },
    },
    { $limit: 6 },

    // Replace productInfo array with product name and format the output
    {
      $project: {
        _id: 0,
        id: '$_id._id',
        label: '$_id.name',
        image: '$_id.image',
        value: '$totalSales',
      },
    },

    // Sort by totalSales in descending order
    { $sort: { _id: 1 } },
  ])

  return result
}
async function getTopSalesCategoriesBySum(
  date: { from: Date; to: Date },
  limit = 5
) {
  const result = await Order.aggregate([
    // Filtrăm comenzile din intervalul dat:
    {
      $match: {
        createdAt: {
          $gte: date.from,
          $lte: date.to,
        },
      },
    },
    // „Despachetăm” fiecare element din array-ul items:
    { $unwind: '$items' },
    // Grupăm după categoria fiecărui item, dar acumulăm sumă = quantity * price:
    {
      $group: {
        _id: '$items.category',
        totalSales: {
          $sum: { $multiply: ['$items.quantity', '$items.price'] },
        },
      },
    },
    // Sortăm descrescător după totalSales:
    { $sort: { totalSales: -1 } },
    // Limităm la primele `limit` categorii:
    { $limit: limit },
    // Putem (opțional) să proiectăm câmpurile, dacă vrem exact { _id, totalSales }:
    {
      $project: {
        _id: 1,
        totalSales: 1,
      },
    },
  ])

  return result // va fi ceva de genul [ { _id: 'Cărămizi', totalSales: 12345.67 }, … ]
}
async function getTopSalesCategories(date: DateRange, limit = 5) {
  const result = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: date.from,
          $lte: date.to,
        },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        totalSales: { $sum: '$items.quantity' },
      },
    },
    { $sort: { totalSales: -1 } },
    { $limit: limit },
  ])

  return result
}
// CREATE
export const createOrder = async (clientSideCart: Cart) => {
  // console.log('[ORDERS] createOrder() start', clientSideCart)

  try {
    await connectToDatabase()
    const session = await auth()
    if (!session) throw new Error('User not authenticated')
    // recalculate price and delivery date on the server
    const createdOrder = await createOrderFromCart(
      clientSideCart,
      session.user.id!
    )
    // console.log('[ORDERS] Order created with ID', createdOrder._id)

    // const orderWithUser = await Order.findById(createdOrder._id).populate<{
    //   user: { email: string; name: string }
    // }>('user', 'email name')

    // console.log('[ORDERS] populated user email =', orderWithUser?.user.email)

    // send the email
    // if (orderWithUser?.user.email) {
    //   try {
    //     console.log(
    //       '[EMAIL] about to sendPurchaseReceipt for',
    //       orderWithUser._id
    //     )
    //     await sendPurchaseReceipt({ order: orderWithUser })
    //     // console.log('[EMAIL] sendPurchaseReceipt succeeded')
    //   } catch (emailErr) {
    //     console.error('[EMAIL] sendPurchaseReceipt FAILED:', emailErr)
    //   }
    // } else {
    //   console.warn('[EMAIL] no user.email, skipping sendPurchaseReceipt')
    // }

    return {
      success: true,
      message: 'Comandă plasată cu succes',
      data: { orderId: createdOrder._id.toString() },
    }
  } catch (error) {
    console.error('[ORDERS] createOrder() threw:', error)
    return { success: false, message: formatError(error) }
  }
}
// se va sterge
export const createOrderFromCart = async (
  clientSideCart: Cart, // Folosim direct coșul primit de la client
  userId: string
): Promise<IOrder> => {
  // Construim obiectul cu TOATE datele necesare pentru validare, luate din clientSideCart
  const orderInputData = {
    user: userId,
    items: clientSideCart.items,
    shippingAddress: clientSideCart.shippingAddress,
    paymentMethod: clientSideCart.paymentMethod,
    itemsPrice: clientSideCart.itemsPrice,
    shippingPrice: clientSideCart.shippingPrice,
    taxPrice: clientSideCart.taxPrice,
    totalPrice: clientSideCart.totalPrice,
    expectedDeliveryDate: clientSideCart.expectedDeliveryDate,
    shippingDistance: clientSideCart.shippingDistance,
    vehicleAllocation: clientSideCart.vehicleAllocation,
  }

  // Validăm obiectul complet folosind schema Zod
  let validatedOrderData
  try {
    validatedOrderData = OrderInputSchema.parse(orderInputData)
    // console.log('[createOrderFromCart] Zod validation successful.')
  } catch (validationError) {
    console.error(
      '[createOrderFromCart] Zod validation failed:',
      validationError
    )
    throw validationError
  }

  // Creează comanda în baza de date folosind datele validate
  // console.log('[createOrderFromCart] Creating order in DB...')
  await connectToDatabase() // Asigură conexiunea
  const newOrder = await Order.create(validatedOrderData)
  // console.log('[createOrderFromCart] Order created in DB:', newOrder._id)

  return newOrder
}

export async function getOrderById(orderId: string): Promise<IOrder> {
  await connectToDatabase()
  const order = await Order.findById(orderId)
  return JSON.parse(JSON.stringify(order))
}
export const calcDeliveryDateAndPrice = async ({
  items,
  shippingAddress,
  deliveryDateIndex,
}: {
  deliveryDateIndex?: number
  items: OrderItem[]
  shippingAddress?: ShippingAddress
}) => {
  const itemsPrice = round2(
    items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  )

  const deliveryDate =
    AVAILABLE_DELIVERY_DATES[
      deliveryDateIndex === undefined
        ? AVAILABLE_DELIVERY_DATES.length - 1
        : deliveryDateIndex
    ]
  const shippingPrice =
    !shippingAddress || !deliveryDate
      ? undefined
      : deliveryDate.freeShippingMinPrice > 0 &&
        itemsPrice >= deliveryDate.freeShippingMinPrice
      ? 0
      : deliveryDate.shippingPrice

  // calculează data de livrare efectivă (fără weekend și fără sărbători)
  const expectedDeliveryDate = addBusinessDays(
    new Date(),
    deliveryDate.daysToDeliver
  )

  const taxPrice = !shippingAddress
    ? undefined
    : round2(itemsPrice - itemsPrice / VAT_RATE)

  const totalPrice = round2(itemsPrice + (shippingPrice ?? 0))

  return {
    AVAILABLE_DELIVERY_DATES,
    deliveryDateIndex:
      deliveryDateIndex === undefined
        ? AVAILABLE_DELIVERY_DATES.length - 1
        : deliveryDateIndex,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    expectedDeliveryDate,
  }
}
// GET
export async function getMyOrders({
  limit,
  page,
}: {
  limit?: number
  page: number
}) {
  limit = limit || PAGE_SIZE
  await connectToDatabase()
  const session = await auth()
  if (!session) {
    throw new Error('User is not authenticated')
  }
  const skipAmount = (Number(page) - 1) * limit
  const orders = await Order.find({
    user: session?.user?.id,
  })
    .sort({ createdAt: 'desc' })
    .skip(skipAmount)
    .limit(limit)
  const ordersCount = await Order.countDocuments({ user: session?.user?.id })

  return {
    data: JSON.parse(JSON.stringify(orders)),
    totalPages: Math.ceil(ordersCount / limit),
  }
}
