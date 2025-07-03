'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import DeleteDialog from '@/components/shared/delete-dialog'
import { chunkString, formatError, formatId, toSlug } from '@/lib/utils'
import { toast } from 'sonner'
import { ISupplierDoc } from '@/lib/db/modules/suppliers'
import LoadingPage from '@/app/loading'
import { FullScreenScanner } from '@/components/barcode/full-screen-scanner'

interface Props {
  initialData: {
    data: ISupplierDoc[]
    totalPages: number
    total: number
    from: number
    to: number
  }
  currentPage: number
}

export default function SupplierList({ initialData, currentPage }: Props) {
  const [page, setPage] = useState(currentPage)
  const [isPending, startTransition] = useTransition()
  const [scanning, setScanning] = useState(false)
  const router = useRouter()

  const fetchPage = (newPage = 1) => {
    startTransition(() => {
      router.replace(`/admin/management/suppliers?page=${newPage}`)
      setPage(newPage)
    })
  }

  const handleDeleteAction = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/management/suppliers/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) {
        return { success: false, message: json.message }
      }
      toast.success('Furnizor șters cu succes.')
      return { success: true, message: 'Furnizor șters cu succes.' }
    } catch (err) {
      return { success: false, message: formatError(err) }
    }
  }

  const handleDecode = (code: string) => {
    setScanning(false)
    // navigate to that supplier’s page
    router.push(`/admin/management/suppliers/${code}/${toSlug(code)}`)
  }

  return (
    <div className='p-6 space-y-4 mx-auto'>
      {/* Header-ul rămâne mereu vizibil */}
      <div className='flex justify-between items-center'>
        <h1 className='text-xl font-bold'>Furnizori</h1>
        <div className='flex items-center gap-2'>
          {/* scan button */}
          <Button variant='outline' onClick={() => setScanning((v) => !v)}>
            {scanning ? 'Anulează căutarea' : 'Caută furnizor'}
          </Button>

          {/* existing “Adaugă” button */}
          <Button asChild variant='default'>
            <Link href='/admin/management/suppliers/new'>Adaugă furnizor</Link>
          </Button>
        </div>
      </div>

      {scanning && (
        <FullScreenScanner
          onDecode={handleDecode}
          onClose={() => setScanning(false)}
        />
      )}

      {/* Conținutul principal: loader sau tabel + paginare */}
      {isPending ? (
        <LoadingPage />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nume</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Cod Fiscal</TableHead>
                <TableHead>Nr. Reg. Com.</TableHead>
                <TableHead>Platitor de TVA</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead className='w-48'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.data.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>{formatId(s._id)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/management/suppliers/${s._id}`}
                      className='hover:underline'
                    >
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>{s.fiscalCode}</TableCell>
                  <TableCell>{s.regComNumber}</TableCell>
                  <TableCell>
                    {s.isVatPayer ? (
                      <span className='text-green-600 font-semibold'>DA</span>
                    ) : (
                      <span className='text-red-600 font-semibold'>NU</span>
                    )}
                  </TableCell>
                  <TableCell>{chunkString(s.bankAccountLei, 4)}</TableCell>
                  <TableCell className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        startTransition(() => {
                          router.push(
                            `/admin/management/suppliers/${s._id}/${toSlug(s.name)}`
                          )
                        })
                      }
                    >
                      Vizualizează
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        startTransition(() => {
                          router.push(`/admin/management/suppliers/${s._id}`)
                        })
                      }
                    >
                      Editează
                    </Button>
                    {/* 4. Ștergere */}
                    <DeleteDialog
                      id={s._id}
                      action={handleDeleteAction}
                      callbackAction={() => fetchPage(page)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {initialData.totalPages > 1 && (
            <div className='flex justify-center items-center gap-2'>
              <Button
                variant='outline'
                onClick={() => page > 1 && fetchPage(page - 1)}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <span>
                Pag. {page} / {initialData.totalPages}
              </span>
              <Button
                variant='outline'
                onClick={() =>
                  page < initialData.totalPages && fetchPage(page + 1)
                }
                disabled={page >= initialData.totalPages}
              >
                Următor
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
