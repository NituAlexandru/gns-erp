import { DeliveryNoteDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Box, Hash, ScanBarcode } from 'lucide-react'
import { getSmartDescription } from './DeliveryNoteDetails.helpers'
import { Barcode } from '@/components/barcode/barcode-image'

interface DeliveryNoteItemsTableProps {
  items: DeliveryNoteDTO['items']
}

export function DeliveryNoteItemsTable({ items }: DeliveryNoteItemsTableProps) {
  // Calculăm totalurile grupate pe UM
  const totalsByUM = items.reduce(
    (acc, item) => {
      const um = item.unitOfMeasure.toLowerCase()
      acc[um] = (acc[um] || 0) + item.quantity
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <Card className='py-2 gap-0'>
      <CardHeader className='pl-1'>
        <CardTitle className='text-base font-semibold flex items-center gap-2'>
          <Box className='h-4 w-4' /> Produse Livrate
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <Table>
          <TableHeader className='bg-muted/50'>
            {/* Rândul 1: Titluri */}
            <TableRow>
              <TableHead className='w-[40px]'>#</TableHead>{' '}
              <TableHead>Cod Produs</TableHead>
              <TableHead>Cod Bare</TableHead>
              <TableHead>Descriere Produs</TableHead>
              <TableHead className='w-[80px] text-center'>UM</TableHead>
              <TableHead className='text-right'>Cantitate</TableHead>
            </TableRow>
            {/* Rândul 2: Numerotare (0-5) */}
            <TableRow className='h-6 hover:bg-transparent border-t-0'>
              <TableHead className='h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                0
              </TableHead>
              <TableHead className='h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                1
              </TableHead>
              <TableHead className='h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                2
              </TableHead>
              <TableHead className='h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                3
              </TableHead>
              <TableHead className='h-6 py-0 text-[10px] font-normal text-muted-foreground text-center'>
                4
              </TableHead>
              <TableHead className='text-right h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                5
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((item, index) => {
              const smartDesc = getSmartDescription(item)

              return (
                <TableRow key={index}>
                  <TableCell className='text-xs text-muted-foreground font-mono py-0'>
                    {index + 1}
                  </TableCell>
                  <TableCell className='py-0'>
                    {item.productCode && item.productCode !== 'N/A' ? (
                      <div className='text-muted-foreground flex items-center gap-1 text-sm'>
                        <Hash className='h-3 w-3' /> {item.productCode}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className='py-1'>
                    {item.productBarcode ? (
                      <div className='py-0'>
                        <Barcode
                          text={item.productBarcode}
                          width={250} 
                          height={70}
                          type='code128'
                        />
                      </div>
                    ) : (
                      <div
                        className='flex items-center gap-2 opacity-20 select-none'
                        title='Fără cod de bare'
                      ></div>
                    )}
                  </TableCell>
                  <TableCell className='py-0'>
                    <div className='font-medium'>{item.productName}</div>
                    {smartDesc && (
                      <div className='text-[11px] text-muted-foreground font-medium'>
                        {smartDesc}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className='text-sm py-0 lowercase text-muted-foreground text-center'>
                    {item.unitOfMeasure}
                  </TableCell>
                  <TableCell className='text-right py-0 font-bold text-base'>
                    {item.quantity}
                  </TableCell>
                </TableRow>
              )
            })}

            {/* Rândul de TOTALURI */}
            <TableRow className='bg-muted/30 border-t-2 p-0'>
              <TableCell
                colSpan={4}
                className='text-right align-top py-1 font-semibold text-muted-foreground'
              >
                Total Cantitate:
              </TableCell>
              <TableCell colSpan={2} className='text-right align-top '>
                <div className='flex flex-col gap-0 items-end'>
                  {Object.entries(totalsByUM).map(([um, qty]) => (
                    <div key={um} className='flex gap-1 text-sm'>
                      <span className='font-bold'>{qty}</span>
                      <span className=' lowercase'>{um}</span>
                    </div>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
