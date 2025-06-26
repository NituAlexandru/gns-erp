'use client'

import React from 'react'
import { getMonthName } from '@/lib/utils'
import ProductPrice from '@/components/shared/product/product-price'

interface MonthlyEarningsProps {
  monthlySales: { label: string; value: number }[]
  monthlyCost: Record<string, number>
  monthlyShipping: Record<string, number>
}

/**
 * MonthlyEarnings va itera peste monthlySales şi va
 * afişa pentru fiecare lună:
 *  • eticheta (ex: "June Ongoing" sau "June 2025")
 *  • o bară de progres cu două segmente (profit vs transport) care are
 *    lățime variabilă în funcție de valoarea totală de vânzări,
 *    dar cu punctul de plecare la 50%
 *  • valoarea totală (ms.value) în dreapta
 *  • sub bară, valorile absolute Profit și Transport
 *  • la hover nu se mai afișează nicio etichetă suplimentară
 */
export default function MonthlyEarnings({
  monthlySales,
  monthlyCost,
  monthlyShipping,
}: MonthlyEarningsProps) {
  const maxSalesValue = Math.max(...monthlySales.map((ms) => ms.value), 0)

  return (
    <div className='space-y-4'>
      {monthlySales.map((ms) => {
        const [year] = ms.label.split('-')
        const monthName = getMonthName(ms.label) // ex: 'June'
        const now = new Date()
        const currentMonthString = `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, '0')}`
        // dacă e luna curentă, afișăm „June Ongoing”, altfel „June 2025”
        const labelText =
          ms.label === currentMonthString
            ? `${monthName}`
            : `${monthName} ${year}`
        // Cost și transport din map-urile primite
        const costForThisMonth = monthlyCost[ms.label] ?? 0
        const shippingForThisMonth = monthlyShipping[ms.label] ?? 0
        // Calculăm profitul brut și îl rotunjim la 0 dacă e negativ
        const rawProfit = ms.value - (costForThisMonth + shippingForThisMonth)
        const profit = rawProfit > 0 ? rawProfit : 0

        // Bounding și procente pentru segmentele verzi și albastre
        const boundedProfit = Math.min(ms.value, profit)
        const boundedShipping = Math.min(ms.value, shippingForThisMonth)
        const profitPercent =
          ms.value > 0 ? (boundedProfit / ms.value) * 100 : 0
        const shippingPercent =
          ms.value > 0 ? (boundedShipping / ms.value) * 100 : 0

        // Normalizare dacă profitPercent + shippingPercent depășește 100%
        let finalProfit = profitPercent
        let finalShipping = shippingPercent
        if (finalProfit + finalShipping > 100) {
          const sum = finalProfit + finalShipping
          finalProfit = (finalProfit / sum) * 100
          finalShipping = (finalShipping / sum) * 100
        }

        // Calculăm procentul brut din 0–100 (ms.value față de maxSalesValue)
        const rawWidth =
          maxSalesValue > 0 ? (ms.value / maxSalesValue) * 100 : 0

        //  Ajustăm ca punctul de plecare să fie 50%:
        //    displayWidth = 50 + rawWidth/2, astfel:
        //    • dacă rawWidth =   0, displayWidth = 50
        //    • dacă rawWidth =  10, displayWidth = 50 + 10/2 = 55
        //    • dacă rawWidth = 100, displayWidth = 50 + 100/2 = 100
        const containerWidthPercent = 50 + rawWidth / 2

        return (
          <div key={ms.label} className='space-y-1'>
            <div className='grid grid-cols-[150px_1fr_100px] items-center gap-4'>
              <div className='text-sm font-medium'>{labelText}</div>
              <div
                className='relative h-4 bg-red-600 rounded-lg overflow-hidden transition-all duration-300'
                style={{ width: `${containerWidthPercent}%` }}
              >
                {/* ▮ PROFIT (verde) */}
                <div
                  className='absolute left-0 top-0 h-full bg-green-500'
                  style={{ width: `${finalProfit}%` }}
                >
                  {finalProfit > 5 && (
                    <span className='absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-semibold'>
                      {Math.round(finalProfit)}%
                    </span>
                  )}
                </div>

                {/* ▮ TRANSPORT (albastru) */}
                <div
                  className='absolute top-0 h-full bg-blue-500'
                  style={{
                    left: `${finalProfit}%`,
                    width: `${finalShipping}%`,
                  }}
                >
                  {finalShipping > 5 && (
                    <span className='absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-semibold'>
                      {Math.round(finalShipping)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Total vânzări în dreapta */}
              <div className='text-sm font-medium text-right'>
                <ProductPrice price={ms.value} plain />
              </div>
            </div>

            {/* Sub bară: valorile absolute Profit și Transport */}
            <div className='grid grid-cols-[150px_1fr_100px] items-center gap-4'>
              <div />
              <div className='flex gap-12 text-xs text-gray-300'>
                <span className='text-green-500 font-medium'>
                  <ProductPrice price={boundedProfit} plain />
                </span>
                <span className='text-blue-500 font-medium'>
                  <ProductPrice price={boundedShipping} plain />
                </span>
              </div>
              <div />
            </div>
          </div>
        )
      })}
    </div>
  )
}
