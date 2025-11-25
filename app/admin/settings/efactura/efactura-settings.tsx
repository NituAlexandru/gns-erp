'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, RefreshCw, Key } from 'lucide-react'
import {
  generateAnafLoginUrl,
  exchangeCodeForToken,
} from '@/lib/db/modules/setting/efactura/anaf.actions'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'

interface EFacturaSettingsProps {
  initialStatus: {
    connected: boolean
    expiresAt?: Date
    lastLogin?: Date
  }
}

export function EFacturaSettings({ initialStatus }: EFacturaSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(initialStatus)
  const searchParams = useSearchParams()
  const router = useRouter()

  // --- 1. Gestionare Callback ANAF (Code Exchange) ---
  useEffect(() => {
    const code = searchParams.get('code')

    if (code) {
      const handleAuth = async () => {
        setLoading(true)
        toast.info('Se procesează conectarea la ANAF...')

        try {
          const result = await exchangeCodeForToken(code)

          if (result.success) {
            toast.success('Conectare reușită la ANAF SPV!')

            // FIX: Folosim "prev" pentru a evita dependința de "status" în array-ul useEffect
            setStatus((prev) => ({
              ...prev,
              connected: true,
              lastLogin: new Date(),
            }))

            // Curățăm URL-ul de codul folosit
            router.replace('/admin/settings')
          } else {
            toast.error(result.error || 'Eșec la conectare')
          }
        } catch (err) {
          // FIX: Folosim variabila err pentru logging
          console.error('Eroare la procesarea codului ANAF:', err)
          toast.error('Eroare neașteptată la procesarea codului.')
        } finally {
          setLoading(false)
        }
      }

      handleAuth()
    }
  }, [searchParams, router]) 

  // --- 2. Inițiere Login ---
  const handleConnect = async () => {
    try {
      setLoading(true)
      const url = await generateAnafLoginUrl()
      // Redirecționăm userul către ANAF
      window.location.href = url
    } catch (error) {
      // FIX: Folosim variabila error
      console.error('Eroare la generarea URL-ului:', error)
      toast.error('Nu s-a putut genera link-ul de conectare.')
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Key className='h-6 w-6 text-primary' />
            Integrare ANAF e-Factura
          </CardTitle>
          <CardDescription>
            Conectează contul SPV folosind certificatul digital (semnătură
            electronică). Această acțiune este necesară o dată la 90 de zile.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Status Display */}
          <div className='flex items-center justify-between p-4 border rounded-lg '>
            <div className='space-y-1'>
              <p className='text-sm font-medium text-muted-foreground'>
                Stare Conexiune
              </p>
              <div className='flex items-center gap-2'>
                {status.connected ? (
                  <>
                    <CheckCircle2 className='h-5 w-5 text-green-600' />
                    <span className='font-bold text-green-600'>CONECTAT</span>
                  </>
                ) : (
                  <>
                    <XCircle className='h-5 w-5 text-red-600' />
                    <span className='font-bold text-red-600'>DECONECTAT</span>
                  </>
                )}
              </div>
            </div>

            {status.connected && status.expiresAt && (
              <div className='text-right'>
                <p className='text-xs text-muted-foreground'>Expiră la:</p>
                <p className='text-sm font-mono'>
                  {new Date(status.expiresAt).toLocaleDateString('ro-RO')}
                </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className='flex justify-end'>
            {!status.connected ? (
              <Button
                onClick={handleConnect}
                disabled={loading}
                size='lg'
                className='bg-primary hover:bg-primary/80'
              >
                {loading ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : null}
                Conectare cu Certificat Digital
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                variant='outline'
                disabled={loading}
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                Reînnoiește Token (Stick USB)
              </Button>
            )}
          </div>

          <div className='bg-yellow-50 p-4 rounded-md border border-yellow-200 text-sm text-yellow-800'>
            <strong>Notă pentru Admin:</strong> Pentru conectare, trebuie să
            aveți stick-ul USB cu semnătura digitală introdus în calculator și
            driverele instalate. Veți fi redirecționat către site-ul ANAF.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
