'use client'

import React, { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'
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
import { toast } from 'sonner'
import LoadingPage from '@/app/loading'
import { Input } from '@/components/ui/input'

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
  const [jumpInputValue, setJumpInputValue] = useState(page.toString())

  useEffect(() => {
    setJumpInputValue(page.toString())
  }, [page])

  const handleJump = () => {
    const pageNum = parseInt(jumpInputValue, 10)
    const totalPages = data?.totalPages ?? 0
    if (
      !isNaN(pageNum) &&
      pageNum >= 1 &&
      pageNum <= totalPages &&
      pageNum !== page
    ) {
      handlePageChange(pageNum)
    } else {
      setJumpInputValue(page.toString())
    }
  }
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
        toast.error(formatError(error))
      }
    })
  }

  useEffect(() => {
    fetchPage(1)
  }, [])

  const handlePageChange = (newPage: number) => {
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
      toast.success('Categoria a fost ștearsă.')
      return { success: true, message: 'Categoria a fost ștearsă.' }
    } catch (error) {
      return { success: false, message: formatError(error) }
    }
  }

  return (
    <div className='flex flex-col gap-2 flex-1 min-h-[calc(100vh-15rem)] w-full'>
      <div className='flex justify-between items-center'>
        <h1 className='text-xl font-bold'>Categorii Produse</h1>
        <Button asChild variant='default'>
          <Link href='/admin/categories/new'>+ Adaugă categorie</Link>
        </Button>
      </div>
      <div className='flex-1 border rounded-lg overflow-x-auto bg-card'>
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
      </div>
      {(data?.totalPages ?? 0) > 1 && (
        <div className='flex items-center justify-center gap-2 py-1 mt-auto border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => handlePageChange(1)}
            disabled={page <= 1 || isPending}
            title='Prima pagină'
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isPending}
          >
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin mr-1' />
            ) : (
              <ChevronLeft className='h-4 w-4 mr-1' />
            )}
            Anterior
          </Button>
          <div className='flex items-center gap-2 text-sm text-muted-foreground mx-2'>
            <span>Pagina</span>
            <Input
              value={jumpInputValue}
              onChange={(e) => setJumpInputValue(e.target.value)}
              onBlur={handleJump}
              onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              className='w-10 h-8 text-center px-1'
              disabled={isPending}
            />
            <span>din {data?.totalPages ?? 0}</span>
          </div>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= (data?.totalPages ?? 0) || isPending}
          >
            Următor
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin ml-1' />
            ) : (
              <ChevronRight className='h-4 w-4 ml-1' />
            )}
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => handlePageChange(data?.totalPages ?? 0)}
            disabled={page >= (data?.totalPages ?? 0) || isPending}
            title='Ultima pagină'
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </div>
      )}

      {isPending && <LoadingPage />}
    </div>
  )
}
