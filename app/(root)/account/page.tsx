import { Card, CardContent } from '@/components/ui/card'
import { PackageCheckIcon, User } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const PAGE_TITLE = 'Contul tău'

export default function AccountPage() {
  return (
    <div>
      <h1 className='h1-bold py-4'>{PAGE_TITLE}</h1>
      <div className='grid md:grid-cols-3 gap-4 items-stretch'>
        <Card>
          <Link href='/account/orders'>
            <CardContent className='flex items-start gap-4 p-6'>
              <div>
                <PackageCheckIcon className='w-12 h-12' />
              </div>
              <div>
                <h2 className='text-xl font-bold'>Comenzi</h2>
                <p className='text-muted-foreground'>
                  Urmărește, modifică, anulează o comandă, descarcă factura sau
                  cumpără din nou
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card>
          <Link href='/account/manage'>
            <CardContent className='flex items-start gap-4 p-6'>
              <div>
                <User className='w-12 h-12' />
              </div>
              <div>
                <h2 className='text-xl font-bold'>
                  Autentificare și Securitate
                </h2>
                <p className='text-muted-foreground'>
                  Gestionează parola, email-ul și numărul de telefon
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* <Card>
          <Link href='/account/addresses'>
            <CardContent className='flex items-start gap-4 p-6'>
              <div>
                <Home className='w-12 h-12' />
              </div>
              <div>
                <h2 className='text-xl font-bold'>Adrese</h2>
                <p className='text-muted-foreground'>
                  Editează, șterge sau setează adresa implicită
                </p>
              </div>
            </CardContent>
          </Link>
        </Card> */}
      </div>
    </div>
  )
}
