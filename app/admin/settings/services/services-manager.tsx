'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  ServiceDTO,
  ServiceInput,
} from '@/lib/db/modules/setting/services/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { ServiceForm } from './service-form'
import {
  createService,
  updateService,
  toggleServiceActiveState,
} from '@/lib/db/modules/setting/services/service.actions'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface ServicesManagerProps {
  initialServices: ServiceDTO[]
  vatRates: VatRateDTO[]
  userId: string
}

export const ServicesManager = ({
  initialServices,
  vatRates,
}: ServicesManagerProps) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingService, setEditingService] = useState<ServiceDTO | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [serviceToToggle, setServiceToToggle] = useState<ServiceDTO | null>(
    null
  )

  const [searchTerm, setSearchTerm] = useState('')

  // PASUL 2: Filtrăm serviciile folosind useMemo pentru performanță
  const filteredServices = useMemo(() => {
    if (!searchTerm) {
      return initialServices // Dacă nu se caută nimic, returnăm lista completă
    }
    const lowercasedTerm = searchTerm.toLowerCase()
    return initialServices.filter(
      (service) =>
        service.name.toLowerCase().includes(lowercasedTerm) ||
        service.code.toLowerCase().includes(lowercasedTerm)
    )
  }, [initialServices, searchTerm])

  const handleSaveService = async (data: ServiceInput, serviceId?: string) => {
    setIsSaving(true)

    const result = serviceId
      ? await updateService({ ...data, _id: serviceId })
      : await createService(data)

    if (result.success) {
      toast.success(result.message)
      setIsOpen(false)
      setEditingService(null)
      router.refresh()
    } else {
      toast.error(result.message)
    }
    setIsSaving(false)
  }

  const handleToggleState = async () => {
    if (!serviceToToggle) return
    setIsSaving(true)
    const result = await toggleServiceActiveState(serviceToToggle._id)
    if (result.success) {
      toast.success(result.message)
      setIsConfirmDialogOpen(false)
      setServiceToToggle(null)
      router.refresh()
    } else {
      toast.error(result.message)
    }
    setIsSaving(false)
  }

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle>Management Servicii</CardTitle>
          <div className='flex items-center gap-2'>
            <Input
              placeholder='Caută după nume sau cod...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full sm:w-[250px]'
            />
            <Button
              onClick={() => {
                setEditingService(null)
                setIsOpen(true)
              }}
            >
              Adaugă Serviciu Nou
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cod</TableHead>
                <TableHead>Preț</TableHead>
                <TableHead>Cotă TVA</TableHead>
                <TableHead className='text-right'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => (
                <TableRow key={service._id}>
                  <TableCell>{service.name}</TableCell>
                  <TableCell>
                    <Badge variant={service.isActive ? 'default' : 'outline'}>
                      {service.isActive ? 'Activ' : 'Inactiv'}
                    </Badge>
                  </TableCell>
                  <TableCell>{service.code}</TableCell>
                  <TableCell>{service.price.toFixed(2)} lei</TableCell>
                  <TableCell>{service.vatRate?.name}</TableCell>
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
                          onClick={() => {
                            setEditingService(service)
                            setIsOpen(true)
                          }}
                        >
                          Modifică
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={
                            service.isActive ? 'text-red-500' : 'text-green-500'
                          }
                          onClick={() => {
                            setServiceToToggle(service)
                            setIsConfirmDialogOpen(true)
                          }}
                        >
                          {service.isActive ? 'Dezactivează' : 'Activează'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setEditingService(null)
        }}
      >
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Modifică Serviciu' : 'Adaugă Serviciu Nou'}
            </DialogTitle>
            <DialogDescription>
              Completează detaliile pentru a adăuga sau modifica un serviciu.
            </DialogDescription>
          </DialogHeader>
          <ServiceForm
            vatRates={vatRates}
            onSave={handleSaveService}
            isSaving={isSaving}
            onClose={() => setIsOpen(false)}
            initialData={editingService}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare Schimbare Status</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să{' '}
              {serviceToToggle?.isActive ? 'dezactivezi' : 'activezi'} serviciul{' '}
              <span className='font-bold'>
                &quot;{serviceToToggle?.name}&quot;
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleState} disabled={isSaving}>
              {isSaving
                ? 'Se procesează...'
                : `Da, ${
                    serviceToToggle?.isActive ? 'dezactivează' : 'activează'
                  }`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
