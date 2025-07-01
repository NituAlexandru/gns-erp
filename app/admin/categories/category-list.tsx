'use client'

import React, { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DeleteDialog from '@/components/shared/delete-dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatError, formatId } from '@/lib/utils'
import { ICategoryDoc } from '@/lib/db/modules/category'
import { toast } from '@/hooks/use-toast'
import LoadingPage from '@/app/loading'

type CategoryListData = {
  data: ICategoryDoc[]
  totalPages: number
  total: number
  from: number
  to: number
}

export default function CategoryList() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CategoryListData>()
  const [isPending, startTransition] = useTransition()

  const fetchPage = (newPage = 1) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/categories?page=${newPage}`)
        if (!response.ok) {
          throw new Error('Nu s-au putut încărca datele.')
        }
        const res = await response.json()
        setData(res)
      } catch (error) {
        toast({
          description: formatError(error),
        })
      }
    })
  }

  useEffect(() => {
    fetchPage(1)
  }, [])

  const handlePageChange = (dir: 'next' | 'prev') => {
    const newPage = dir === 'next' ? page + 1 : page - 1
    if (newPage > 0 && newPage <= (data?.totalPages ?? 0)) {
      setPage(newPage)
      fetchPage(newPage)
    }
  }

  const handleDeleteAction = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok) {
        return { success: false, message: result.message }
      }
      toast({ description: 'Categoria a fost ștearsă.' })
      return { success: true, message: 'Categoria a fost ștearsă.' }
    } catch (error) {
      return { success: false, message: formatError(error) }
    }
  }

  return (
    <div className='space-y-2'>
      <div className='flex justify-between items-center'>
        <h1 className='text-xl font-bold'>Categorii Produse</h1>
        <Button asChild variant='default'>
          <Link href='/admin/categories/new'>+ Adaugă categorie</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[80px]'>ID</TableHead>
            <TableHead>Nume</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Categorie Principala</TableHead>
            <TableHead className='w-[140px]'>Acțiuni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.data.map((cat) => (
            <TableRow key={cat._id}>
              <TableCell>{formatId(cat._id)}</TableCell>
              <TableCell>{cat.name}</TableCell>
              <TableCell>{cat.slug}</TableCell>
              <TableCell>
                {typeof cat.mainCategory === 'object' &&
                cat.mainCategory !== null ? (
                  cat.mainCategory.name
                ) : (
                  <span className='font-bold text-green-500'>DA</span>
                )}
              </TableCell>
              <TableCell className='flex gap-2'>
                <Button asChild variant='outline' size='sm'>
                  <Link href={`/admin/categories/${cat._id}`}>Editează</Link>
                </Button>
                <DeleteDialog
                  id={cat._id}
                  action={handleDeleteAction}
                  callbackAction={() => fetchPage(page)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {(data?.totalPages ?? 0) > 1 && (
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            onClick={() => handlePageChange('prev')}
            disabled={page <= 1}
          >
            <ChevronLeft /> Anterior
          </Button>
          Pagină {page} din {data?.totalPages ?? 0}
          <Button
            variant='outline'
            onClick={() => handlePageChange('next')}
            disabled={page >= (data?.totalPages ?? 0)}
          >
            Următor <ChevronRight />
          </Button>
        </div>
      )}

      {isPending && <LoadingPage />}
    </div>
  )
}
