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
import { toSlug } from '@/lib/utils'
import { IVehicleDoc } from '@/lib/db/modules/fleet/vehicle/types'

interface Props {
  initialVehicles: IVehicleDoc[]
}
export default function VehiclesList({ initialVehicles }: Props) {
  const router = useRouter()
  const [vehicles, setVehicles] = useState(initialVehicles)

  // Stare pentru a controla dialogul de ștergere
  const [deleteTarget, setDeleteTarget] = useState<IVehicleDoc | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      // ✅ Folosim FETCH către ruta API, NU import direct
      const response = await fetch(
        `/api/admin/management/fleet/vehicles/${deleteTarget._id}`,
        {
          method: 'DELETE',
        }
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message)
      }

      toast.success(result.message)
      setVehicles(vehicles.filter((v) => v._id !== deleteTarget._id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'A apărut o eroare.')
    } finally {
      setDeleteTarget(null) // Închide dialogul
    }
  }

  return (
    <>
      <div className='space-y-4'>
        <div className='flex justify-between items-center'>
          <h2 className='text-xl font-semibold'>Listă Vehicule</h2>
          <Button asChild>
            <Link href='/admin/management/fleet/vehicles/new'>
              Adaugă Vehicul
            </Link>
          </Button>
        </div>

        <div className='border rounded-md'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume / Denumire</TableHead>
                <TableHead>Tip Vehicul</TableHead>
                <TableHead>Nr. Înmatriculare</TableHead>
                <TableHead className='w-16 text-right'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle._id}>
                  <TableCell className='font-medium'>
                    <Link
                      href={`/admin/management/fleet/vehicles/${vehicle._id}/${toSlug(vehicle.name)}`}
                      className='hover:underline'
                    >
                      {vehicle.name}
                    </Link>
                  </TableCell>
                  <TableCell>{vehicle.carType}</TableCell>
                  <TableCell>{vehicle.carNumber}</TableCell>
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
                              `/admin/management/fleet/vehicles/${vehicle._id}/${toSlug(vehicle.name)}`
                            )
                          }
                        >
                          Vizualizează
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onClick={() =>
                            router.push(
                              `/admin/management/fleet/vehicles/${vehicle._id}/edit`
                            )
                          }
                        >
                          Editează
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-red-500 cursor-pointer'
                          onSelect={() => setDeleteTarget(vehicle)}
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
              Această acțiune este ireversibilă și va șterge definitiv vehiculul
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
