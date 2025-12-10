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
import {
  ProductStockDetails,
  PopulatedBatch,
  StockLocationEntry,
} from '@/lib/db/modules/inventory/types'
import { LOCATION_NAMES_MAP } from '@/lib/db/modules/inventory/constants'
import { Button } from '@/components/ui/button'
import { Eye, FileText } from 'lucide-react'
import { BatchEditDialog } from './batch-edit-dialog'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card'
import { BatchActionsMenu } from '@/app/admin/management/inventory/stock/batch-actions-menu'

type Locations = ProductStockDetails['locations']
type PackagingOptions = ProductStockDetails['packagingOptions']

interface BatchListTableProps {
  baseUnit: string
  locations: Locations
  packagingOptions: PackagingOptions
  stockableItemName: string
}

export function BatchListTable({
  baseUnit,
  locations,
  packagingOptions,
  stockableItemName,
}: BatchListTableProps) {
  const allUnits = [
    { unitName: baseUnit, baseUnitEquivalent: 1 },
    ...packagingOptions,
  ]

  const [selectedUnit, setSelectedUnit] = useState(baseUnit)

  const [editingBatch, setEditingBatch] = useState<{
    batch: PopulatedBatch
    inventoryItemId: string
  } | null>(null)

  const selectedConversion = allUnits.find((u) => u.unitName === selectedUnit)
  const conversionFactor = selectedConversion?.baseUnitEquivalent ?? 1

  return (
    <>
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
                <div
                  key={unit.unitName}
                  className='flex items-center space-x-2'
                >
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
                <TableHead>Furnizor</TableHead>
                <TableHead className='text-right'>Cantitate</TableHead>
                <TableHead className='text-right'>{`Cost Unitar (pe ${selectedUnit})`}</TableHead>
                <TableHead>Data Intrării</TableHead>
                <TableHead>Declaratie Conformitate</TableHead>
                <TableHead className='text-center'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center'>
                    Acest produs nu are stoc în nicio locație.
                  </TableCell>
                </TableRow>
              ) : (
                locations.flatMap((location: StockLocationEntry) =>
                  location.batches.map((batch: PopulatedBatch) => {
                    const convertedQuantity = batch.quantity / conversionFactor
                    const convertedUnitCost = batch.unitCost * conversionFactor
                    const q = batch.qualityDetails
                    const hasNotes =
                      q &&
                      ((q.lotNumbers && q.lotNumbers.length > 0) ||
                        (q.certificateNumbers &&
                          q.certificateNumbers.length > 0) ||
                        (q.testReports && q.testReports.length > 0) ||
                        (q.additionalNotes &&
                          q.additionalNotes.trim().length > 0))
                    return (
                      <TableRow
                        key={
                          batch._id?.toString() ||
                          `${location.location}-${batch.movementId}`
                        }
                      >
                        <TableCell className='font-medium'>
                          {LOCATION_NAMES_MAP[location.location] ||
                            location.location}
                        </TableCell>

                        <TableCell>{batch.supplierId?.name || '-'}</TableCell>
                        <TableCell className='text-right font-bold'>
                          {`${convertedQuantity.toFixed(2)} ${selectedUnit}`}
                        </TableCell>

                        <TableCell className='text-right'>
                          {formatCurrency(convertedUnitCost)}
                        </TableCell>

                        <TableCell>
                          {format(
                            new Date(batch.entryDate),
                            'dd/MM/yyyy HH:mm',
                            {
                              locale: ro,
                            }
                          )}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            {hasNotes ? (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-8'
                                  >
                                    <Eye className='h-4 w-4' />
                                  </Button>
                                </HoverCardTrigger>

                                <HoverCardContent
                                  className='w-[500px] bg-accent p-4 shadow-2xl border-border z-50 text-left text-popover-foreground'
                                  align='end'
                                >
                                  <div className='space-y-4'>
                                    <h4 className='text-sm font-semibold tracking-tight mb-2'>
                                      Detalii Note Calitate Lot
                                    </h4>

                                    <div className='grid grid-cols-2 gap-3'>
                                      <div className='rounded-md border bg-muted/30 p-3 flex flex-col gap-2 min-h-[80px]'>
                                        <span className='text-xs font-medium text-muted-foreground'>
                                          Certificate Conformitate / Calitate:
                                        </span>
                                        {q?.certificateNumbers &&
                                        q.certificateNumbers.length > 0 ? (
                                          <div className='flex flex-wrap gap-1.5'>
                                            {q.certificateNumbers.map(
                                              (num: string, i: number) => (
                                                <span
                                                  key={i}
                                                  className='text-xs'
                                                >
                                                  {num}
                                                </span>
                                              )
                                            )}
                                          </div>
                                        ) : (
                                          <span className='text-xs text-muted-foreground/50 italic'>
                                            -
                                          </span>
                                        )}
                                      </div>

                                      <div className='rounded-md border bg-muted/30 p-3 flex flex-col gap-2 min-h-[80px]'>
                                        <span className='text-xs font-medium text-muted-foreground'>
                                          Șarje / Loturi Producție:
                                        </span>
                                        {q?.lotNumbers &&
                                        q.lotNumbers.length > 0 ? (
                                          <div className='flex flex-wrap gap-1.5'>
                                            {q.lotNumbers.map(
                                              (num: string, i: number) => (
                                                <span
                                                  key={i}
                                                  className='text-xs'
                                                >
                                                  {num}
                                                </span>
                                              )
                                            )}
                                          </div>
                                        ) : (
                                          <span className='text-xs text-muted-foreground/50 italic'>
                                            -
                                          </span>
                                        )}
                                      </div>

                                      <div className='rounded-md border bg-muted/30 p-3 flex flex-col gap-2 min-h-[80px]'>
                                        <span className='text-xs font-medium text-muted-foreground'>
                                          Declaratii / Rapoarte Încercări:
                                        </span>
                                        {q?.testReports &&
                                        q.testReports.length > 0 ? (
                                          <div className='flex flex-wrap gap-1.5'>
                                            {q.testReports.map(
                                              (rep: string, i: number) => (
                                                <span
                                                  key={i}
                                                  className='text-xs'
                                                >
                                                  {rep}
                                                </span>
                                              )
                                            )}
                                          </div>
                                        ) : (
                                          <span className='text-xs text-muted-foreground/50 italic'>
                                            -
                                          </span>
                                        )}
                                      </div>

                                      <div className='rounded-md border bg-muted/30 p-3 flex flex-col gap-2 min-h-[80px]'>
                                        <span className='text-xs font-medium text-muted-foreground'>
                                          Note Adiționale:
                                        </span>
                                        {q?.additionalNotes ? (
                                          <div className='text-xs  whitespace-pre-wrap'>
                                            {q.additionalNotes}
                                          </div>
                                        ) : (
                                          <span className='text-xs text-muted-foreground/50 italic'>
                                            -
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            ) : (
                              <span className='text-muted-foreground opacity-20'>
                                -
                              </span>
                            )}
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-muted-foreground hover:text-primary'
                              title='Adaugă/Editează Note'
                              onClick={() => {
                                setEditingBatch({
                                  batch: batch,
                                  inventoryItemId: location._id,
                                })
                              }}
                            >
                              <FileText className='h-4 w-4' />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className='text-center'>
                          <BatchActionsMenu
                            inventoryItemId={location._id}
                            batch={batch}
                            stockableItemName={stockableItemName}
                            unit={baseUnit}
                            locationName={location.location}
                          />
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

      {editingBatch && (
        <BatchEditDialog
          open={!!editingBatch}
          onOpenChange={(open) => !open && setEditingBatch(null)}
          batch={editingBatch.batch}
          inventoryItemId={editingBatch.inventoryItemId}
        />
      )}
    </>
  )
}
