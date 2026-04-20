'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Settings2,
  Plus,
  Users,
  Clock,
  Percent,
  X,
  Check,
  ChevronsUpDown,
  Loader2,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getClientsForSelector } from '@/lib/db/modules/overview/sales-lists/sales-list.helpers'
import { PenaltyRuleDTO } from '@/lib/db/modules/financial/penalties/penalty.types'
import {
  getPenaltyRules,
  saveDefaultPenaltyRule,
  savePenaltyRule,
} from '@/lib/db/modules/financial/penalties/penalty.actions'
import { Switch } from '@/components/ui/switch'

interface SimpleEntity {
  _id: string
  name: string
}

export function PenaltyManagementModal() {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditingDefault, setIsEditingDefault] = useState(false)
  const [rules, setRules] = useState<PenaltyRuleDTO[]>([])
  const [isLoadingRules, setIsLoadingRules] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Stare pentru Regula Implicită (Default)
  const [defaultRule, setDefaultRule] = useState({
    percentage: '',
    autoBillDays: '',
    isAutoBillingEnabled: false,
  })
  const [hasDefaultInDB, setHasDefaultInDB] = useState(false)

  // State pentru clienții aduși din baza de date
  const [clients, setClients] = useState<SimpleEntity[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  // State formular listă nouă
  const [newRule, setNewRule] = useState<{
    name: string
    percentage: string
    autoBillDays: string
    clientIds: string[]
  }>({
    name: '',
    percentage: '',
    autoBillDays: '',
    clientIds: [],
  })

  // Încărcăm datele
  useEffect(() => {
    if (open) {
      loadRules()
      if (clients.length === 0) {
        loadClients()
      }
    }
  }, [open, clients.length])

  // Funcția care aduce regulile din MongoDB
  const loadRules = async () => {
    setIsLoadingRules(true)
    try {
      const res = await getPenaltyRules()
      if (res.success && res.data) {
        setRules(res.data)
        // Căutăm în DB dacă există regula marcată ca Default
        const defRule = res.data.find((r) => r.isDefault)
        if (defRule) {
          setHasDefaultInDB(true)
          setDefaultRule({
            percentage: defRule.percentagePerDay.toString(),
            autoBillDays: defRule.autoBillDays.toString(),
            isAutoBillingEnabled: defRule.isAutoBillingEnabled || false,
          })
        } else {
          // Dacă nu e în DB, starea rămâne GOLĂ
          setHasDefaultInDB(false)
          setDefaultRule({
            percentage: '',
            autoBillDays: '',
            isAutoBillingEnabled: false,
          })
        }
      }
    } catch (error) {
      console.error('Eroare la încărcare:', error)
    } finally {
      setIsLoadingRules(false)
    }
  }

  const loadClients = async () => {
    setIsLoadingClients(true)
    try {
      const clientsRes = await getClientsForSelector()
      if (clientsRes) {
        setClients(clientsRes)
      }
    } catch (error) {
      console.error('Eroare la aducerea clientilor:', error)
    } finally {
      setIsLoadingClients(false)
    }
  }

  // Toggle selecție clienți
  const toggleClientSelection = (clientId: string) => {
    setNewRule((prev) => {
      const exists = prev.clientIds.includes(clientId)
      if (exists) {
        return {
          ...prev,
          clientIds: prev.clientIds.filter((id) => id !== clientId),
        }
      } else {
        return { ...prev, clientIds: [...prev.clientIds, clientId] }
      }
    })
  }

  const handleSaveListRule = async () => {
    if (!newRule.name || !newRule.percentage || !newRule.autoBillDays) {
      toast.error('Completează toate câmpurile!')
      return
    }
    setIsSaving(true)

    try {
      const res = await savePenaltyRule({
        id: editingRuleId || undefined,
        name: newRule.name,
        percentagePerDay: Number(newRule.percentage),
        autoBillDays: Number(newRule.autoBillDays),
        clientIds: newRule.clientIds,
        isDefault: false,
      })

      if (res.success) {
        toast.success(res.message)
        setNewRule({
          name: '',
          percentage: '',
          autoBillDays: '',
          clientIds: [],
        })
        setEditingRuleId(null) // Resetăm ID-ul după salvare
        setIsCreating(false)
        await loadRules()
      } else {
        toast.error(res.message)
      }
    } catch (error) {
      toast.error('Eroare la salvare.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDefaultRule = async () => {
    if (!defaultRule.percentage || !defaultRule.autoBillDays) return
    setIsSaving(true)

    try {
      const res = await saveDefaultPenaltyRule({
        percentagePerDay: Number(defaultRule.percentage),
        autoBillDays: Number(defaultRule.autoBillDays),
        isAutoBillingEnabled: defaultRule.isAutoBillingEnabled,
      })

      if (res.success) {
        toast.success(res.message)
        setIsEditingDefault(false)
        await loadRules() // Reîncărcăm din DB
      } else {
        toast.error(res.message)
      }
    } catch (error) {
      toast.error('A apărut o eroare la salvarea setărilor globale.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditRule = (rule: PenaltyRuleDTO) => {
    setEditingRuleId(rule._id)
    setNewRule({
      name: rule.name,
      percentage: rule.percentagePerDay.toString(),
      autoBillDays: rule.autoBillDays.toString(),
      clientIds: rule.clientIds,
    })
    setIsCreating(true)
    setIsEditingDefault(false)
  }

  const customRules = rules.filter((r) => !r.isDefault)

  const unavailableClientIds = new Set<string>()
  rules.forEach((rule) => {
    if (rule._id !== editingRuleId) {
      rule.clientIds?.forEach((id) => unavailableClientIds.add(id))
    }
  })

  // Lista finală pe care o vom afișa în dropdown
  const availableClients = clients.filter(
    (c) => !unavailableClientIds.has(c._id),
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          className='gap-2 text-red-600 border-red-200 hover:bg-red-50 bg-background'
        >
          <Settings2 className='h-4 w-4' />
          Setări Penalități
        </Button>
      </DialogTrigger>

      <DialogContent className='max-w-[95vw] lg:max-w-5xl p-0 overflow-hidden '>
        <DialogHeader className='p-6 pb-4 border-b bg-muted/20 mt-5'>
          <div className='flex items-center justify-between'>
            <div>
              <DialogTitle className='text-xl'>
                Reguli și Liste Penalizări
              </DialogTitle>
              <DialogDescription className='mt-1'>
                Configurează cota de penalizare și termenul la care sistemul
                emite automat factura.
              </DialogDescription>
            </div>
            {!isCreating && !isEditingDefault && (
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  className='gap-2'
                  onClick={() => setIsEditingDefault(true)}
                >
                  <Globe className='h-4 w-4' />
                  Setări Implicite
                </Button>
                <Button
                  className='bg-red-600 hover:bg-red-700 gap-2'
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className='h-4 w-4' />
                  Creează Listă Nouă
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className='bg-background flex flex-col max-h-[75vh] overflow-y-auto'>
          {/* PANOU: EDITARE SETĂRI IMPLICITE */}
          {isEditingDefault && (
            <div className='p-6 border-b'>
              <div className='flex items-center justify-between mb-6'>
                <h3 className='font-semibold flex items-center gap-2 '>
                  <Globe className='h-4 w-4 ' />
                  Configurare Setări Implicite (Globale)
                </h3>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setIsEditingDefault(false)}
                  className='h-8 px-2'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>

              <div className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl'>
                  <div className='space-y-2'>
                    <Label>Cotă Penalizare / Zi (%)</Label>
                    <Input
                      type='number'
                      step='0.01'
                      placeholder='ex: 0.01'
                      value={defaultRule.percentage}
                      onChange={(e) =>
                        setDefaultRule({
                          ...defaultRule,
                          percentage: e.target.value,
                        })
                      }
                    />
                    <p className='text-xs text-muted-foreground'>
                      Se aplică tuturor clienților nealocați.
                    </p>
                  </div>
                  <div className='space-y-2'>
                    <Label>Emitere Automată (Zile Întârziere)</Label>
                    <Input
                      type='number'
                      placeholder='ex: 5'
                      value={defaultRule.autoBillDays}
                      onChange={(e) =>
                        setDefaultRule({
                          ...defaultRule,
                          autoBillDays: e.target.value,
                        })
                      }
                    />
                    <p className='text-xs text-muted-foreground'>
                      Zile scurse de la scadență până la facturare.
                    </p>
                  </div>
                </div>
                <div className='flex flex-row items-center justify-between rounded-lg border p-4 max-w-2xl'>
                  <div className='space-y-0.5'>
                    <Label className='text-base'>Facturare Automată</Label>
                    <p className='text-sm text-primary'>
                      Dacă este activat, sistemul va emite automat facturile de
                      penalități în fiecare zi la ora 18:00.
                    </p>
                  </div>
                  <Switch
                    className='cursor-pointer'
                    checked={defaultRule.isAutoBillingEnabled}
                    onCheckedChange={(checked) =>
                      setDefaultRule({
                        ...defaultRule,
                        isAutoBillingEnabled: checked,
                      })
                    }
                  />
                </div>
                <div className='flex justify-end gap-2 pt-4 border-t border-slate-200'>
                  <Button
                    variant='outline'
                    onClick={() => setIsEditingDefault(false)}
                  >
                    Anulează
                  </Button>
                  <Button
                    className=' min-w-[180px]'
                    onClick={handleSaveDefaultRule}
                    disabled={
                      !defaultRule.percentage ||
                      !defaultRule.autoBillDays ||
                      isSaving
                    }
                  >
                    {isSaving && (
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    )}
                    Salvează Setările Globale
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* PANOU: CREARE LISTĂ NOUĂ CUSTOM */}
          {isCreating && (
            <div className='p-6 border-b '>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='font-semibold flex items-center gap-2'>
                  <Plus className='h-4 w-4 ' />
                  Configurare Listă Nouă (Excepții)
                </h3>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setIsCreating(false)}
                  className='h-8 px-2'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>Nume Listă (ex: Clienți VIP, Rău platnici)</Label>
                    <Input
                      placeholder='Numele listei...'
                      value={newRule.name}
                      onChange={(e) =>
                        setNewRule({ ...newRule, name: e.target.value })
                      }
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label>Cotă Penalizare / Zi (%)</Label>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='ex: 0.01'
                        value={newRule.percentage}
                        onChange={(e) =>
                          setNewRule({ ...newRule, percentage: e.target.value })
                        }
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label>Emitere Auto. (Zile)</Label>
                      <Input
                        type='number'
                        placeholder='ex: 5'
                        value={newRule.autoBillDays}
                        onChange={(e) =>
                          setNewRule({
                            ...newRule,
                            autoBillDays: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label>Asignează Clienți în Listă</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        role='combobox'
                        className='justify-between w-full h-auto min-h-[40px] text-muted-foreground hover:text-foreground'
                        disabled={isLoadingClients}
                      >
                        <div className='flex flex-wrap gap-1 text-left items-center'>
                          {isLoadingClients ? (
                            <div className='flex items-center gap-2'>
                              <Loader2 className='h-4 w-4 animate-spin' /> Se
                              încarcă...
                            </div>
                          ) : newRule.clientIds.length > 0 ? (
                            <span className=' font-medium'>
                              {newRule.clientIds.length}{' '}
                              {newRule.clientIds.length === 1
                                ? 'client selectat'
                                : 'clienți selectați'}
                            </span>
                          ) : (
                            'Caută și selectează clienți...'
                          )}
                        </div>
                        <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent
                      className='w-[400px] h-[400px] p-0 bg-background text-foreground'
                      align='start'
                    >
                      <Command className='w-full h-full flex flex-col bg-background text-foreground'>
                        <CommandInput
                          placeholder='Caută client după nume...'
                          className='border-none focus:ring-0 h-10'
                        />
                        <CommandList
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          className='max-h-[350px] overflow-y-auto bg-background text-foreground'
                        >
                          <CommandEmpty className='py-6 text-center text-sm text-muted-foreground'>
                            Niciun client găsit.
                          </CommandEmpty>
                          <CommandGroup>
                            {availableClients.map((client) => {
                              const isSelected = newRule.clientIds.includes(
                                client._id,
                              )
                              return (
                                <CommandItem
                                  key={client._id}
                                  value={client.name}
                                  onSelect={() =>
                                    toggleClientSelection(client._id)
                                  }
                                  className='cursor-pointer text-foreground aria-selected:bg-muted aria-selected:text-foreground'
                                >
                                  <div
                                    className={cn(
                                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                                      isSelected
                                        ? 'text-primary-foreground bg-primary'
                                        : 'opacity-50 [&_svg]:invisible',
                                    )}
                                  >
                                    <Check className='h-4 w-4' />
                                  </div>
                                  <span>{client.name}</span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className='text-xs text-muted-foreground'>
                    Acești clienți vor ignora setările implicite globale.
                  </p>
                </div>
              </div>

              <div className='mt-6 flex justify-end gap-2 border-t border-red-200/50 pt-4'>
                <Button
                  variant='outline'
                  onClick={() => {
                    setIsCreating(false)
                    setEditingRuleId(null)
                  }}
                >
                  Anulează
                </Button>
                <Button
                  className='bg-red-600 hover:bg-red-700'
                  onClick={handleSaveListRule}
                  disabled={
                    !newRule.name ||
                    !newRule.percentage ||
                    !newRule.autoBillDays ||
                    isSaving
                  }
                >
                  {isSaving && (
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  )}
                  Salvează Lista Personalizată
                </Button>
              </div>
            </div>
          )}

          {/* TABELUL PRINCIPAL */}
          <div className='p-6'>
            <div className='border rounded-md shadow-sm'>
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow>
                    <TableHead>Nume Listă / Regulă</TableHead>
                    <TableHead className='text-center'>
                      <div className='flex items-center justify-center gap-1'>
                        <Percent className='h-3 w-3' /> Cotă / Zi
                      </div>
                    </TableHead>
                    <TableHead className='text-center'>
                      <div className='flex items-center justify-center gap-1'>
                        <Clock className='h-3 w-3' /> Emitere Automată
                      </div>
                    </TableHead>
                    <TableHead className='text-center'>
                      <div className='flex items-center justify-center gap-1'>
                        <Users className='h-3 w-3' /> Clienți Asignați
                      </div>
                    </TableHead>
                    <TableHead className='text-right w-[100px]'>
                      Acțiuni
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* RÂNDUL FIX PENTRU REGULA IMPLICITĂ */}
                  <TableRow className={!hasDefaultInDB ? 'bg-red-10/50' : ''}>
                    <TableCell className='font-medium'>
                      Regulă Implicită (Globală)
                      {!hasDefaultInDB && (
                        <Badge variant='destructive' className='ml-2'>
                          NESETATĂ
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className='text-center font-mono font-medium'>
                      {hasDefaultInDB ? `${defaultRule.percentage}%` : '---'}
                    </TableCell>
                    <TableCell className='text-center '>
                      {hasDefaultInDB ? (
                        <Badge variant='outline' className='font-mono'>
                          La {defaultRule.autoBillDays} zile
                        </Badge>
                      ) : (
                        '---'
                      )}
                    </TableCell>
                    <TableCell className='text-center text-muted-foreground text-sm italic'>
                      Toți clienții nealocați
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant={hasDefaultInDB ? 'ghost' : 'default'}
                        size='sm'
                        onClick={() => setIsEditingDefault(true)}
                        className={
                          !hasDefaultInDB
                            ? 'bg-primary hover:bg-red-700 text-white'
                            : ''
                        }
                      >
                        {hasDefaultInDB ? 'Editează' : 'Setează Cota Acum'}
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* RÂNDURILE PENTRU LISTELE CUSTOM */}
                  {customRules.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='h-24 text-center text-muted-foreground'
                      >
                        Nu ai creat nicio listă de excepții încă. Toți clienții
                        urmează regula Standard.
                      </TableCell>
                    </TableRow>
                  ) : (
                    customRules.map((rule) => (
                      <TableRow key={rule._id} className='hover:bg-muted/30'>
                        <TableCell className='font-medium text-red-700'>
                          {rule.name}
                        </TableCell>
                        <TableCell className='text-center font-mono'>
                          {rule.percentagePerDay}%
                        </TableCell>
                        <TableCell className='text-center'>
                          <Badge variant='outline' className='font-mono'>
                            La {rule.autoBillDays} zile
                          </Badge>
                        </TableCell>
                        <TableCell className='text-center'>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant='link'
                                className=' h-auto p-0 font-medium'
                              >
                                {rule.clientCount} clienți
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className='w-96 p-4 bg-background text-foreground'
                              align='center'
                              side='right'
                              sideOffset={20}
                            >
                              <h4 className='font-semibold mb-3 text-sm border-b pb-2 flex items-center gap-2'>
                                <Users className='h-3.5 w-3.5 text-muted-foreground' />
                                Clienți asignați:
                              </h4>
                              <div
                                className='max-h-[500px] overflow-y-auto pr-2'
                                onWheel={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                {rule.clientIds.length > 0 ? (
                                  <ol className='text-xs list-decimal ml-6 space-y-0.5 text-left'>
                                    {rule.clientIds.map((id) => {
                                      const client = clients.find(
                                        (c) => c._id === id,
                                      )
                                      return (
                                        <li
                                          key={id}
                                          className='pl-1 border-b border-muted/30 pb-1 last:border-0'
                                        >
                                          <span
                                            className='font-medium'
                                            title={client?.name}
                                          >
                                            {client?.name || 'Încărcare...'}
                                          </span>
                                        </li>
                                      )
                                    })}
                                  </ol>
                                ) : (
                                  <div className='text-xs text-muted-foreground text-center py-4'>
                                    Niciun client asignat.
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEditRule(rule)}
                          >
                            Editează
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
