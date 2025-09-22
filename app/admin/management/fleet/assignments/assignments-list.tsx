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
import { IAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { toSlug } from '@/lib/utils'
import { ASSIGNMENT_STATUSES } from '@/lib/db/modules/fleet/assignments/validator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  initialAssignments: IAssignmentDoc[]
}

export default function AssignmentsList({ initialAssignments }: Props) {
  const router = useRouter()
  const [assignments, setAssignments] = useState(initialAssignments)
  const [deleteTarget, setDeleteTarget] = useState<IAssignmentDoc | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      const response = await fetch(
        `/api/admin/management/fleet/assignments/${deleteTarget._id}`,
        {
          method: 'DELETE',
        }
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message)
      }

      toast.success(result.message)
      setAssignments(assignments.filter((a) => a._id !== deleteTarget._id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'A apărut o eroare.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const getPopulatedName = (
    field: string | { name?: string } | null | undefined
  ): string => {
    if (typeof field === 'object' && field !== null && field.name) {
      return field.name
    }
    return 'N/A'
  }

  const handleStatusChange = async (
    assignmentId: string,
    newStatus: (typeof ASSIGNMENT_STATUSES)[number]
  ) => {
    const originalAssignments = [...assignments]
    setAssignments(
      assignments.map((a) =>
        a._id === assignmentId
          ? ({ ...a, status: newStatus } as IAssignmentDoc)
          : a
      )
    )

    try {
      const response = await fetch(
        `/api/admin/management/fleet/assignments/${assignmentId}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      )

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message)
      }
      toast.success(`Statusul a fost schimbat în "${newStatus}".`)
    } catch (err) {
      setAssignments(originalAssignments)
      toast.error(
        err instanceof Error
          ? err.message
          : 'Eroare la actualizarea statusului.'
      )
    }
  }

  return (
    <>
      <div className='space-y-4'>
        <div className='flex justify-between items-center'>
          <h2 className='text-xl font-semibold'>Listă Ansambluri</h2>
          <Button asChild>
            <Link href='/admin/management/fleet/assignments/new'>
              Adaugă Ansamblu
            </Link>
          </Button>
        </div>

        <div className='border rounded-md'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume Ansamblu</TableHead>
                <TableHead>Șofer</TableHead>
                <TableHead>Vehicul</TableHead>
                <TableHead>Remorcă</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='w-16 text-right'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((item) => (
                <TableRow key={item._id}>
                  <TableCell className='font-medium'>
                    <Link
                      href={`/admin/management/fleet/assignments/${item._id}/${toSlug(item.name)}`}
                      className='hover:underline'
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell>{getPopulatedName(item.driverId)}</TableCell>
                  <TableCell>
                    {(typeof item.vehicleId === 'object' &&
                      item.vehicleId?.carNumber) ||
                      'N/A'}
                  </TableCell>
                  <TableCell>
                    {(typeof item.trailerId === 'object' &&
                      item.trailerId?.licensePlate) ||
                      'Fără'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.status}
                      onValueChange={(
                        newStatus: (typeof ASSIGNMENT_STATUSES)[number]
                      ) => handleStatusChange(item._id, newStatus)}
                    >
                      <SelectTrigger
                        className={`w-32 h-8 ${item.status === 'Activ' ? '' : 'text-muted-foreground'}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNMENT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='outline'>
                          <span className='sr-only'>Deschide meniu</span>
                          Acțiuni
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onClick={() =>
                            router.push(
                              `/admin/management/fleet/assignments/${item._id}/${toSlug(item.name)}`
                            )
                          }
                        >
                          Vizualizează
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onClick={() =>
                            router.push(
                              `/admin/management/fleet/assignments/${item._id}`
                            )
                          }
                        >
                          Editează
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-red-500 cursor-pointer'
                          onSelect={() => setDeleteTarget(item)}
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
              Această acțiune este ireversibilă și va șterge definitiv ansamblul
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
