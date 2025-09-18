'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ITrailerDoc } from '@/lib/db/modules/fleet/trailers/types'
import { toSlug } from '@/lib/utils'

interface Props {
  initialTrailers: ITrailerDoc[]
}

export default function TrailersList({ initialTrailers }: Props) {
  const router = useRouter()
  const [trailers, setTrailers] = useState(initialTrailers)
  const [deleteTarget, setDeleteTarget] = useState<ITrailerDoc | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      const response = await fetch(
        `/api/admin/management/fleet/trailers/${deleteTarget._id}`,
        {
          method: 'DELETE',
        }
      )
      const result = await response.json()

      if (!response.ok) throw new Error(result.message)

      toast.success(result.message)
      setTrailers(trailers.filter((t) => t._id !== deleteTarget._id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'A apărut o eroare.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <div className='space-y-4'>
        <div className='flex justify-between items-center'>
          <h2 className='text-xl font-semibold'>Listă Remorci</h2>
          <Button asChild>
            <Link href='/admin/management/fleet/trailers/new'>
              Adaugă Remorcă
            </Link>
          </Button>
        </div>

        <div className='border rounded-md'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume / Denumire</TableHead>
                <TableHead>Tip Remorcă</TableHead>
                <TableHead>Nr. Înmatriculare</TableHead>
                <TableHead className='w-16 text-right'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trailers.map((trailer) => (
                <TableRow key={trailer._id}>
                  <TableCell className='font-medium'>
                    <Link
                      href={`/admin/management/fleet/trailers/${trailer._id}/${toSlug(trailer.name)}`}
                      className='hover:underline'
                    >
                      {trailer.name}
                    </Link>
                  </TableCell>
                  <TableCell>{trailer.type}</TableCell>
                  <TableCell>{trailer.licensePlate}</TableCell>
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='outline'>Acțiuni</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onClick={() =>
                            router.push(
                              `/admin/management/fleet/trailers/${trailer._id}/${toSlug(trailer.name)}`
                            )
                          }
                        >
                          Vizualizează
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onClick={() =>
                            router.push(
                              `/admin/management/fleet/trailers/${trailer._id}`
                            )
                          }
                        >
                          Editează
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-red-500 cursor-pointer'
                          onSelect={() => setDeleteTarget(trailer)}
                        >
                          Șterge
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare Ștergere</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune este ireversibilă și va șterge definitiv remorca
              {deleteTarget?.name}. Ești sigur?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant='destructive' onClick={handleDeleteConfirm}>
                Da, șterge
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
