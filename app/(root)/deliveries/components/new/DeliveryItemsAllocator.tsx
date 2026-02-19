'use client'

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlannerItem } from '@/lib/db/modules/deliveries/types'
import { cn, formatCurrency3 } from '@/lib/utils'

interface DeliveryItemsAllocatorProps {
  itemsToAllocate: PlannerItem[]
  onAllocationChange: (itemId: string, updates: Partial<PlannerItem>) => void
}

export function DeliveryItemsAllocator({
  itemsToAllocate,
  onAllocationChange,
}: DeliveryItemsAllocatorProps) {
  const itemsWithUnits = useMemo(() => {
    return itemsToAllocate.map((item) => {
      const allUnitsRaw = [
        { unitName: item.baseUnit, baseUnitEquivalent: 1 },
        ...(item.packagingOptions || []),
      ]
      const allUnits = Array.from(
        new Map(allUnitsRaw.map((u) => [u.unitName, u])).values(),
      )
      const selectedUnitInfo = allUnits.find(
        (u) => u.unitName === item.unitOfMeasure,
      ) || { baseUnitEquivalent: 1 }
      const currentConversionFactor = selectedUnitInfo.baseUnitEquivalent

      const remainingInBaseUnit =
        item.quantityOrdered -
        item.quantityAlreadyShipped -
        item.quantityAlreadyPlanned

      // Calculăm rămasul în unitatea selectată (poate fi negativ acum)
      const remainingInSelectedUnit =
        currentConversionFactor > 0
          ? remainingInBaseUnit / currentConversionFactor
          : 0

      return {
        ...item,
        allUnits,
        remainingInSelectedUnit,
        currentConversionFactor,
      }
    })
  }, [itemsToAllocate])

  const handleQuantityChange = (item: PlannerItem, newQuantityStr: string) => {
    if (newQuantityStr === '') {
      onAllocationChange(item.id, { quantityToAllocate: 0 })
      return
    }
    const newQuantity = parseFloat(newQuantityStr)
    if (!isNaN(newQuantity)) {
      onAllocationChange(item.id, { quantityToAllocate: newQuantity })
    }
  }
  const handleQuantityBlur = (item: PlannerItem, remaining: number) => {
    let val = item.quantityToAllocate
    if (val < 0) val = 0

    const remainingRoundedForCheck = Math.max(
      0,
      parseFloat(remaining.toFixed(2)),
    )

    if (val > remainingRoundedForCheck) {
      val = remainingRoundedForCheck
      if (remaining >= 0) {
        toast.warning('Cantitatea de alocat nu poate depăși cantitatea rămasă.')
      }
    }

    const roundedVal = parseFloat(val.toFixed(2))
    if (item.quantityToAllocate !== roundedVal) {
      onAllocationChange(item.id, { quantityToAllocate: roundedVal })
    }
  }

  const itemsToDisplay = useMemo(
    () =>
      itemsWithUnits.filter((item) => {
        const remainingForFilter = parseFloat(
          item.remainingInSelectedUnit.toFixed(5),
        )

        return remainingForFilter !== 0 || item.quantityToAllocate > 0
      }),
    [itemsWithUnits],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Articole de Alocat din Comandă</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produs/Serviciu</TableHead>
              <TableHead className='w-[150px] text-right'>
                Rămas (Comandă)
              </TableHead>
              <TableHead className='w-[120px] text-right'>Preț</TableHead>
              <TableHead className='w-[130px]'>Selectează UM</TableHead>
              <TableHead className='w-[150px] text-right'>
                Cantitate de Alocat Acum
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsToDisplay.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className='h-24 text-center text-muted-foreground'
                >
                  Toate articolele din comandă au fost planificate.
                </TableCell>
              </TableRow>
            ) : (
              itemsToDisplay.map((item) => {
                const remainingRounded = parseFloat(
                  item.remainingInSelectedUnit.toFixed(2),
                )
                const isOverPlanned = remainingRounded < 0

                return (
                  <TableRow
                    key={item.id}
                    className={cn(isOverPlanned && 'bg-destructive/10')}
                  >
                    <TableCell>{item.productName}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        isOverPlanned && 'text-destructive font-bold',
                      )}
                    >
                      {remainingRounded.toFixed(2)}
                      {isOverPlanned && (
                        <span
                          title='Cantitate supra-planificată!'
                          className='ml-1'
                        >
                          ⚠️
                        </span>
                      )}
                    </TableCell>
                    <TableCell className='text-right font-bold  whitespace-nowrap'>
                      {formatCurrency3(item.priceAtTimeOfOrder)}
                    </TableCell>
                    <TableCell className='text-center font-medium'>
                      {item.unitOfMeasure}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Input
                        type='number'
                        step='any'
                        className='text-right'
                        value={item.quantityToAllocate}
                        onChange={(e) =>
                          handleQuantityChange(
                            itemsToAllocate.find((i) => i.id === item.id)!,
                            e.target.value,
                          )
                        }
                        onBlur={() =>
                          handleQuantityBlur(
                            itemsToAllocate.find((i) => i.id === item.id)!,
                            item.remainingInSelectedUnit,
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {itemsToDisplay.some(
          (item) => parseFloat(item.remainingInSelectedUnit.toFixed(2)) < 0,
        ) && (
          <p className='mt-4 text-sm text-destructive font-semibold text-center'>
            ⚠️ Există articole supra-planificate (Rămas negativ). Ajustează
            cantitățile din Livrările Planificate.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
