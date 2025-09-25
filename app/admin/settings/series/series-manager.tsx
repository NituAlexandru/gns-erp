'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SeriesDTO } from '@/lib/db/modules/numbering/types'
import {
  createSeries,
  updateSeries,
  deleteSeries,
  toggleSeriesActiveState,
} from '@/lib/db/modules/numbering/series.actions'
import { z } from 'zod'
import { SeriesSchema } from '@/lib/db/modules/numbering/validator'
import { SeriesForm } from './series-form'

type SeriesFormData = z.infer<typeof SeriesSchema>

interface SeriesManagerProps {
  initialSeries: SeriesDTO[]
}

export function SeriesManager({ initialSeries }: SeriesManagerProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingSeries, setEditingSeries] = useState<SeriesDTO | null>(null)
  const [series, setSeries] = useState<SeriesDTO[]>(initialSeries)
  const [isConfirmToggleOpen, setIsConfirmToggleOpen] = useState(false)
  const [seriesToToggle, setSeriesToToggle] = useState<SeriesDTO | null>(null)

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [seriesToDelete, setSeriesToDelete] = useState<SeriesDTO | null>(null)

  // Sortam seriile dupa tipul de document pentru a le afisa grupate
  const sortedSeries = [...series].sort((a, b) =>
    a.documentType.localeCompare(b.documentType)
  )

  const handleSave = async (data: SeriesFormData, seriesId?: string) => {
    setIsSaving(true)

     if (seriesId) {
      const result = await updateSeries({ ...data, _id: seriesId })
      if (result.success) {
        toast.success(result.message)
        
        setSeries((currentSeries) =>
          currentSeries.map((s) => (s._id === seriesId ? { ...s, ...data } : s))
        )
        setIsOpen(false)
        setEditingSeries(null)
      } else {
        toast.error(result.message)
      }
    }
  
    else {
      const result = await createSeries(data)
      if (result.success && result.data) {
        toast.success(result.message)
        // Actualizam starea locala adaugand noua serie la inceputul listei
        setSeries((currentSeries) => [result.data, ...currentSeries])
        setIsOpen(false)
        setEditingSeries(null)
      } else {
        toast.error(result.message)
      }
    }

    setIsSaving(false)
     router.refresh()
  }

  const handleToggleState = async () => {
    if (!seriesToToggle) return

    setSeries((currentSeries) =>
      currentSeries.map((s) =>
        s._id === seriesToToggle._id ? { ...s, isActive: !s.isActive } : s
      )
    )

    const result = await toggleSeriesActiveState(seriesToToggle._id)

    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
      setSeries(initialSeries)
    }
    setIsConfirmToggleOpen(false)
    setSeriesToToggle(null)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!seriesToDelete) return

    setSeries((currentSeries) =>
      currentSeries.filter((s) => s._id !== seriesToDelete._id)
    )

    const result = await deleteSeries(seriesToDelete._id)

    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
      setSeries(initialSeries)
    }

    setIsConfirmDeleteOpen(false)
    setSeriesToDelete(null)
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle>Management Serii Documente</CardTitle>
          <Button
            onClick={() => {
              setEditingSeries(null)
              setIsOpen(true)
            }}
          >
            Adaugă Serie Nouă
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Tip Document</TableHead>
                <TableHead>Ultimul Nr. Alocat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSeries.map((serie) => (
                <TableRow key={serie._id}>
                  <TableCell className='font-medium'>{serie.name}</TableCell>
                  <TableCell>{serie.documentType}</TableCell>
                  <TableCell>{serie.currentNumber || 0}</TableCell>
                  <TableCell>
                    <Badge variant={serie.isActive ? 'default' : 'outline'}>
                      {serie.isActive ? 'Activ' : 'Inactiv'}
                    </Badge>
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
                          onClick={() => {
                            setEditingSeries(serie)
                            setIsOpen(true)
                          }}
                        >
                          Modifică
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onClick={() => {
                            setSeriesToToggle(serie)
                            setIsConfirmToggleOpen(true)
                          }}
                        >
                          {serie.isActive ? 'Dezactivează' : 'Activează'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='text-red-600 cursor-pointer'
                          onClick={() => {
                            setSeriesToDelete(serie)
                            setIsConfirmDeleteOpen(true)
                          }}
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
        </CardContent>
      </Card>

      {/* Dialog pentru Adaugare / Editare */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) setEditingSeries(null)
          setIsOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSeries ? 'Modifică Serie' : 'Adaugă Serie Nouă'}
            </DialogTitle>
          </DialogHeader>
          <SeriesForm
            onSave={handleSave}
            isSaving={isSaving}
            onClose={() => setIsOpen(false)}
            initialData={editingSeries}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmare Activare / Dezactivare */}
      <AlertDialog
        open={isConfirmToggleOpen}
        onOpenChange={setIsConfirmToggleOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare Schimbare Status</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să{' '}
              {seriesToToggle?.isActive ? 'dezactivezi' : 'activezi'} seria{' '}
              {seriesToToggle?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleState}>
              Confirmă
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Confirmare Stergere */}
      <AlertDialog
        open={isConfirmDeleteOpen}
        onOpenChange={setIsConfirmDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare Ștergere</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi seria {seriesToDelete?.name}?
              Acțiunea este ireversibilă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              className='bg-red-600 hover:bg-red-700'
              onClick={handleDelete}
            >
              Da, șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
