'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { ProductStockDetails } from '@/lib/db/modules/inventory/types'
import { LOCATION_NAMES_MAP } from '@/lib/db/modules/inventory/constants' // 👈 Importăm mapa de locații

type Locations = ProductStockDetails['locations']
type PackagingOptions = ProductStockDetails['packagingOptions']

interface BatchListTableProps {
  baseUnit: string
  locations: Locations
  packagingOptions: PackagingOptions
}

export function BatchListTable({
  baseUnit,
  locations,
  packagingOptions,
}: BatchListTableProps) {
  const allUnits = [
    { unitName: baseUnit, baseUnitEquivalent: 1 },
    ...packagingOptions,
  ]

  const [selectedUnit, setSelectedUnit] = useState(baseUnit)

  const selectedConversion = allUnits.find((u) => u.unitName === selectedUnit)
  const conversionFactor = selectedConversion?.baseUnitEquivalent ?? 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalii Loturi pe Locații</CardTitle>
        <div className='flex items-center space-x-4 pt-4'>
          <Label>Afișează cantitățile în:</Label>
          <RadioGroup
            defaultValue={baseUnit}
            onValueChange={setSelectedUnit}
            className='flex'
          >
            {allUnits.map((unit) => (
              <div key={unit.unitName} className='flex items-center space-x-2'>
                <RadioGroupItem value={unit.unitName} id={unit.unitName} />
                <Label htmlFor={unit.unitName}>{unit.unitName}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Locație</TableHead>
              <TableHead className='text-right'>Cantitate</TableHead>
              <TableHead className='text-right'>{`Cost Unitar (pe ${selectedUnit})`}</TableHead>
              <TableHead>Data Intrării</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className='h-24 text-center'>
                  Acest produs nu are stoc în nicio locație.
                </TableCell>
              </TableRow>
            ) : (
              locations.flatMap((location) =>
                location.batches.map((batch) => {
                  const convertedQuantity = batch.quantity / conversionFactor

                  const convertedUnitCost = batch.unitCost * conversionFactor

                  return (
                    <TableRow key={batch.movementId}>
                      <TableCell className='font-medium'>
                        {LOCATION_NAMES_MAP[location.location] ||
                          location.location}
                      </TableCell>
                      <TableCell className='text-right font-bold'>
                        {`${convertedQuantity.toFixed(2)} ${selectedUnit}`}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(convertedUnitCost)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(batch.entryDate), 'dd/MM/yyyy HH:mm', {
                          locale: ro,
                        })}
                      </TableCell>
                    </TableRow>
                  )
                })
              )
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
