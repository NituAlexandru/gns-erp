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
import { IDriverDoc } from '@/lib/db/modules/fleet/drivers/types'
import { toSlug } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DRIVER_STATUSES } from '@/lib/db/modules/fleet/drivers/validator'

interface Props {
  initialDrivers: IDriverDoc[]
}

export default function DriversList({ initialDrivers }: Props) {
  const router = useRouter()
  const [drivers, setDrivers] = useState(initialDrivers)

  const [deleteTarget, setDeleteTarget] = useState<IDriverDoc | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      const response = await fetch(
        `/api/admin/management/fleet/drivers/${deleteTarget._id}`,
        {
          method: 'DELETE',
        }
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message)
      }

      toast.success(result.message)
      setDrivers(drivers.filter((d) => d._id !== deleteTarget._id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'A apărut o eroare.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleStatusChange = async (
    driverId: string,
    newStatus: (typeof DRIVER_STATUSES)[number]
  ) => {
    const originalDrivers = [...drivers]

    setDrivers(
      drivers.map((d) =>
        d._id === driverId ? ({ ...d, status: newStatus } as IDriverDoc) : d
      )
    )

    try {
      const response = await fetch(
        `/api/admin/management/fleet/drivers/${driverId}/status`,
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

      toast.success(`Statusul pentru șofer a fost schimbat în "${newStatus}".`)
    } catch (err) {
      setDrivers(originalDrivers)
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
          <h2 className='text-xl font-semibold'>Listă Șoferi</h2>
          <Button asChild>
            <Link href='/admin/management/fleet/drivers/new'>Adaugă Șofer</Link>
          </Button>
        </div>

        <div className='border rounded-md'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Categorii Permis</TableHead>
                <TableHead className='w-16 text-right'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver._id}>
                  <TableCell className='font-medium'>
                    <Link
                      href={`/admin/management/fleet/drivers/${driver._id}/${toSlug(driver.name)}`}
                      className='hover:underline'
                    >
                      {driver.name}
                    </Link>
                  </TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell>
                    <Select
                      value={driver.status}
                      onValueChange={(
                        newStatus: (typeof DRIVER_STATUSES)[number]
                      ) => handleStatusChange(driver._id, newStatus)}
                    >
                      <SelectTrigger
                        className={`w-32 h-8 ${driver.status === 'Activ' ? '' : 'text-muted-foreground'}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DRIVER_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{driver.drivingLicenses.join(', ')}</TableCell>
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
                              `/admin/management/fleet/drivers/${driver._id}/${toSlug(driver.name)}`
                            )
                          }
                        >
                          Vizualizează
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onClick={() =>
                            router.push(
                              `/admin/management/fleet/drivers/${driver._id}`
                            )
                          }
                        >
                          Editează
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-red-500 cursor-pointer'
                          onSelect={() => setDeleteTarget(driver)}
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
              Această acțiune este ireversibilă și va șterge definitiv șoferul
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
