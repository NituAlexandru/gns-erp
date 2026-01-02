'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, round2 } from '@/lib/utils' // <-- Am scos formatDate de aici
import { Loader2 } from 'lucide-react'
import { ReceiptAllocationItem } from '@/lib/db/modules/financial/receipts/receipt.types'
import { format } from 'date-fns' // <-- IMPORT NOU
import { ro } from 'date-fns/locale' // <-- IMPORT NOU
import { getPayableInvoicesForReceipt } from '@/lib/db/modules/financial/receipts/receipt.actions'

interface InvoicePaymentSelectorProps {
  clientId: string
  onSelectionChange: (
    totalAmount: number,
    allocations: ReceiptAllocationItem[]
  ) => void
}

interface UnpaidInvoiceUI {
  _id: string
  seriesName: string
  invoiceNumber: string
  dueDate: string
  remainingAmount: number
  totals: { grandTotal: number }

  // State local pentru UI
  isSelected: boolean
  amountToPay: number
}

export function InvoicePaymentSelector({
  clientId,
  onSelectionChange,
}: InvoicePaymentSelectorProps) {
  const [loading, setLoading] = useState(false)
  const [invoices, setInvoices] = useState<UnpaidInvoiceUI[]>([])
  const [error, setError] = useState('')

  // 1. Încărcăm facturile când se schimbă clientul
  useEffect(() => {
    if (!clientId) {
      setInvoices([])
      return
    }

    const fetchInvoices = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await getPayableInvoicesForReceipt(clientId)
        if (result.success && result.data) {
          // Mapăm datele și adăugăm câmpurile de UI
          const mapped = result.data.map((inv: any) => ({
            ...inv,
            isSelected: false,
            amountToPay: inv.remainingAmount, // Implicit plătim tot restul
          }))
          setInvoices(mapped)
        } else {
          setError(result.message || 'Eroare la încărcarea facturilor.')
        }
      } catch (err) {
        setError('Eroare de conexiune.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [clientId])

  // 2. Funcție care trimite datele către părinte (Formular)
  const notifyParent = (updatedInvoices: UnpaidInvoiceUI[]) => {
    const selected = updatedInvoices.filter((inv) => inv.isSelected)

    const rawTotal = selected.reduce(
      (sum, inv) => sum + (inv.amountToPay || 0),
      0
    )
    const totalAmount = round2(rawTotal)

    const allocations: ReceiptAllocationItem[] = selected.map((inv) => ({
      invoiceId: inv._id,
      invoiceSeries: inv.seriesName,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.dueDate,
      totalAmount: inv.totals.grandTotal,
      remainingAmount: inv.remainingAmount,
      amountToPay: round2(inv.amountToPay || 0),
    }))

    onSelectionChange(totalAmount, allocations)
  }

  // 3. Handler pentru checkbox
  const toggleInvoice = (index: number) => {
    const newInvoices = [...invoices]
    newInvoices[index].isSelected = !newInvoices[index].isSelected

    // Dacă o deselectăm, resetăm suma de plată la maxim (pentru data viitoare)
    if (!newInvoices[index].isSelected) {
      newInvoices[index].amountToPay = newInvoices[index].remainingAmount
    }

    setInvoices(newInvoices)
    notifyParent(newInvoices)
  }

  // 4. Handler pentru modificarea sumei (plată parțială)
  const changeAmount = (index: number, newValue: string) => {
    const val = parseFloat(newValue)
    const newInvoices = [...invoices]

    // Validare simplă
    if (!isNaN(val)) {
      newInvoices[index].amountToPay = val
      // Dacă modifică suma, bifăm automat factura
      if (!newInvoices[index].isSelected) {
        newInvoices[index].isSelected = true
      }
    } else {
      newInvoices[index].amountToPay = 0
    }

    setInvoices(newInvoices)
    notifyParent(newInvoices)
  }

  if (!clientId) return null

  return (
    <div className='border rounded-md p-4 bg-muted/5 mt-4'>
      <h3 className='font-medium mb-3'>Facturi Neachitate</h3>

      {loading && (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='h-4 w-4 animate-spin' /> Se încarcă facturile...
        </div>
      )}

      {error && <p className='text-sm text-destructive'>{error}</p>}

      {!loading && !error && invoices.length === 0 && (
        <p className='text-sm text-muted-foreground'>
          Acest client nu are facturi restante.
        </p>
      )}

      {!loading && invoices.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[50px]'></TableHead>
              <TableHead>Factura</TableHead>
              <TableHead>Scadența</TableHead>
              <TableHead className='text-right'>Rest de Plată</TableHead>
              <TableHead className='w-[150px] text-right text-primary font-bold'>
                Achită Acum (RON)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv, index) => (
              <TableRow
                key={inv._id}
                data-state={inv.isSelected ? 'selected' : undefined}
              >
                <TableCell>
                  <Checkbox
                    checked={inv.isSelected}
                    onCheckedChange={() => toggleInvoice(index)}
                  />
                </TableCell>
                <TableCell>
                  <div className='font-medium'>
                    {inv.seriesName} {inv.invoiceNumber}
                  </div>
                </TableCell>
                {/* AICI AM CORECTAT FORMATDATE */}
                <TableCell>
                  {format(new Date(inv.dueDate), 'dd.MM.yyyy', { locale: ro })}
                </TableCell>
                <TableCell className='text-right'>
                  {formatCurrency(inv.remainingAmount)}
                </TableCell>
                <TableCell>
                  <Input
                    type='number'
                    className='text-right h-8'
                    value={inv.amountToPay}
                    onChange={(e) => changeAmount(index, e.target.value)}
                    max={inv.remainingAmount}
                    min={0}
                    step={0.01}
                    disabled={!inv.isSelected}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
