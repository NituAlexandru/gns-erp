import { auth } from '@/auth'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { ArrowLeft, Printer, FileText, User, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ReceiptStatusBadge } from '../components/ReceiptStatusBadge'
import { getReceiptById } from '@/lib/db/modules/financial/receipts/receipt.actions'
import { formatCurrency } from '@/lib/utils'
import { formatAddress } from '@/lib/db/modules/financial/receipts/receipt.utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReceiptDetailsPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect('/')

  const { id } = await params
  const result = await getReceiptById(id)

  if (!result.success || !result.data) {
    return notFound()
  }

  const receipt = result.data

  return (
    <div className='px-2 space-y-2'>
      {/* --- HEADER NAVIGARE --- */}
      <div className='flex items-center justify-between print:hidden'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' asChild>
            <Link href='/financial/receipts'>
              <ArrowLeft className='mr-2 h-4 w-4' /> Înapoi la Listă
            </Link>
          </Button>
          <div className='flex items-center gap-2 ml-4'>
            <h1 className='text-2xl font-bold tracking-tight'>
              Chitanța seria {receipt.series} nr. {receipt.number}
            </h1>
            <ReceiptStatusBadge status={receipt.status} />
          </div>
        </div>

        <div className='flex gap-2'>
          {/* Buton placeholder pentru viitor */}
          <Button variant='secondary' disabled>
            <Printer className='mr-2 h-4 w-4' /> Printează
          </Button>
        </div>
      </div>

      {/* --- DOCUMENTUL PROPRIU-ZIS --- */}
      <Card className='shadow-lg border-muted'>
        <CardHeader className='bg-muted/10 pb-0 border-b'>
          <div className='flex justify-between items-start'>
            <div>
              <p className='text-sm font-semibold text-muted-foreground uppercase '>
                Document Fiscal
              </p>
              <CardTitle className='text-3xl mt-1'>CHITANȚĂ</CardTitle>
              <p className='text-sm mt-1'>
                Seria{' '}
                <span className='font-mono font-bold text-foreground'>
                  {' '}
                  {receipt.series} nr. {receipt.number}
                </span>
              </p>
              <p className='text-sm text-muted-foreground'>
                Data:{' '}
                <span className='font-medium '>
                  {format(new Date(receipt.date), 'dd MMMM yyyy', {
                    locale: ro,
                  })}
                </span>
              </p>
            </div>
            <div className='text-right flex gap-4 justify-center align-middle'>
              <p className='text-xs text-muted-foreground mt-2'>
                Total Încasat
              </p>{' '}
              <Badge
                variant='outline'
                className='text-lg px-4 py-1 border-primary/20 bg-primary/5 text-primary'
              >
                {formatCurrency(receipt.amount)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className='pt-0 space-y-8'>
          {/* SECȚIUNEA 1: PĂRȚI */}
          <div className='grid md:grid-cols-2 gap-8'>
            {/* EMITENT (NOI) */}
            <div className='space-y-1 p-4 rounded-lg border bg-muted/5'>
              <div className='flex items-center gap-2 mb-2'>
                <Building2 className='h-4 w-4 text-muted-foreground' />
                <h3 className='font-semibold text-sm uppercase text-muted-foreground'>
                  Unitate Emitentă
                </h3>
              </div>
              <div>
                <p className='font-bold text-lg'>
                  {receipt.companySnapshot.name}
                </p>
                <div className='text-sm space-y-1 text-muted-foreground mt-2'>
                  <p>
                    CUI:{' '}
                    <span className='font-mono text-foreground'>
                      {receipt.companySnapshot.cui}
                    </span>
                  </p>
                  <p>Reg. Com: {receipt.companySnapshot.regCom || '-'}</p>
                  <p>{formatAddress(receipt.companySnapshot.address)}</p>
                </div>
              </div>
            </div>

            {/* CLIENT (EI) */}
            <div className='space-y-1 p-4 rounded-lg border bg-muted/5'>
              <div className='flex items-center gap-2 mb-2'>
                <User className='h-4 w-4 text-muted-foreground' />
                <h3 className='font-semibold text-sm uppercase text-muted-foreground'>
                  Client (Depunător)
                </h3>
              </div>
              <div>
                <p className='font-bold text-lg'>
                  {receipt.clientSnapshot.name}
                </p>
                <div className='text-sm space-y-1 text-muted-foreground mt-2'>
                  <p>
                    CUI / CNP:{' '}
                    <span className='font-mono text-foreground'>
                      {receipt.clientSnapshot.cui || '-'}
                    </span>
                  </p>
                  <p>{formatAddress(receipt.clientSnapshot.address)}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* SECȚIUNEA 2: DETALII PLATĂ */}
          <div className='space-y-2'>
            <div>
              <label className='text-xs font-semibold text-muted-foreground uppercase'>
                Am primit de la
              </label>
              <p className='text-lg font-medium border-b border-dotted border-muted-foreground/30 pb-1'>
                {receipt.representative}
              </p>
            </div>

            <div className='flex gap-4'>
              <div>
                <label className='text-xs font-semibold text-muted-foreground uppercase'>
                  Suma de (în cifre)
                </label>
                <p className='text-lg font-medium '>
                  {formatCurrency(receipt.amount)}
                </p>
              </div>

              <div>
                <label className='text-xs font-semibold text-muted-foreground uppercase'>
                  Adică (în litere)
                </label>
                <p className='text-lg font-medium italic  text-primary'>
                  {receipt.amountInWords}
                </p>
              </div>
            </div>

            <div>
              <label className='text-xs font-semibold text-muted-foreground uppercase'>
                Reprezentând
              </label>
              <p className='text-lg font-medium border-b border-dotted border-muted-foreground/30 pb-1'>
                {receipt.explanation}
              </p>
            </div>
          </div>

          <Separator />

          {/* SECȚIUNEA 3: SUBSOL (CASIER) */}
          <div className='grid grid-cols-2 pt-0'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>
                Casier:
              </p>
              <p className='font-bold'>{receipt.cashier.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
