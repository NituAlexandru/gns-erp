import { getDefaultVatHistory } from '@/lib/db/modules/setting/vat-rate/vatRate.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, formatDistanceStrict } from 'date-fns'
import { ro } from 'date-fns/locale'
import { PopulatedDefaultVatHistory } from '@/lib/db/modules/setting/vat-rate/types'

export async function DefaultVatHistory() {
  const historyResult = await getDefaultVatHistory()

  if (
    !historyResult.success ||
    !historyResult.data ||
    historyResult.data.length === 0
  ) {
    return null
  }

  const historyEntries =
    historyResult.data as unknown as PopulatedDefaultVatHistory[]

  return (
    <div className='mt-4'>
      <Card>
        <CardHeader>
          <CardTitle>Istoric Cote Implicite</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='relative max-h-[300px] overflow-y-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cota TVA</TableHead>
                  <TableHead>Perioada de Valabilitate</TableHead>
                  <TableHead>Durata</TableHead>
                  <TableHead>Setat de</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyEntries.map((entry, index) => {
                  const startDate = new Date(entry.setAsDefaultAt)
                  const endDate =
                    index < historyEntries.length - 1
                      ? new Date(historyEntries[index + 1].setAsDefaultAt)
                      : new Date()

                  const duration = formatDistanceStrict(endDate, startDate, {
                    locale: ro,
                  })

                  const rateName = entry.vatRateId?.name || 'Cota ștearsă'
                  const userName = entry.setByUserId?.name || 'Utilizator șters'

                  return (
                    <TableRow key={entry._id.toString()}>
                      <TableCell>
                        <span className='font-medium'>{rateName}</span> (
                        {entry.rateValue}%)
                      </TableCell>
                      <TableCell>
                        {format(startDate, 'dd MMM yyyy, HH:mm', {
                          locale: ro,
                        })}{' '}
                        -{' '}
                        {index === 0
                          ? 'Prezent'
                          : format(endDate, 'dd MMM yyyy, HH:mm', {
                              locale: ro,
                            })}
                      </TableCell>
                      <TableCell>{duration}</TableCell>
                      <TableCell>{userName}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
