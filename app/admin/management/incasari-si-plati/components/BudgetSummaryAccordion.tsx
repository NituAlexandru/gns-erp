'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { formatCurrency } from '@/lib/utils'
import { BudgetPaymentSummaryItem } from '@/lib/db/modules/financial/treasury/summary/summary.types'

interface BudgetSummaryAccordionProps {
  data: BudgetPaymentSummaryItem[]
  isLoading: boolean
}

export function BudgetSummaryAccordion({
  data,
  isLoading,
}: BudgetSummaryAccordionProps) {
  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-40'>
        <p className='text-muted-foreground'>Se încarcă datele...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center h-40'>
        <p className='text-muted-foreground'>
          Nu există plăți bugetate de afișat pentru perioada selectată.
        </p>
      </div>
    )
  }

  return (
    <div className='max-h-[400px] overflow-y-auto pr-3'>
      <Accordion type='single' collapsible className='w-full'>
        {data.map((mainCategory) => (
          <AccordionItem value={mainCategory._id} key={mainCategory._id}>
            {/* Categoria Principală */}
            <AccordionTrigger className='hover:no-underline'>
              <div className='flex justify-between w-full '>
                <span className='font-bold text-base'>{mainCategory._id}</span>
                <span className='font-bold text-base'>
                  {formatCurrency(mainCategory.mainTotal)}
                </span>
              </div>
            </AccordionTrigger>

            {/* Subcategoriile */}
            <AccordionContent>
              <div className='pl-4 pr-2 space-y-2'>
                {mainCategory.subcategories.map((subCategory, index) => (
                  <div key={index} className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>
                      {subCategory.name}
                    </span>
                    <span className='font-medium'>
                      {formatCurrency(subCategory.total)}
                    </span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
