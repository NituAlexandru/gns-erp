'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, ChevronsUpDown, Save, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Importăm noile acțiuni simplificate
import {
  getAllAgentLists,
  saveAgentClientList,
} from '@/lib/db/modules/overview/sales-lists/sales-list.actions'
import {
  getClientsForSelector,
  getAgentsForSelector,
} from '@/lib/db/modules/overview/sales-lists/sales-list.helpers'

interface SimpleEntity {
  _id: string
  name: string
}

export function SalesListManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Data
  const [clients, setClients] = useState<SimpleEntity[]>([])
  const [agents, setAgents] = useState<SimpleEntity[]>([])

  // State Local: Mapare AgentID -> Array de ClientIDs
  // Aici ținem minte ce clienți are fiecare agent selectați în interfață
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})

  // Track modified agents to save only changes
  const [modifiedAgents, setModifiedAgents] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    setIsLoading(true)
    const [listsRes, clientsRes, agentsRes] = await Promise.all([
      getAllAgentLists(),
      getClientsForSelector(),
      getAgentsForSelector(),
    ])

    if (clientsRes) setClients(clientsRes)
    if (agentsRes) setAgents(agentsRes)

    // Populăm starea locală cu ce vine din DB
    if (listsRes.success && Array.isArray(listsRes.data)) {
      const mapping: Record<string, string[]> = {}
      listsRes.data.forEach((list: any) => {
        // list.agentId poate fi populat (obiect) sau string, depinde de backend
        const agentId =
          typeof list.agentId === 'object' ? list.agentId._id : list.agentId
        mapping[agentId] = list.clientIds || []
      })
      setAssignments(mapping)
    }

    setModifiedAgents(new Set())
    setIsLoading(false)
  }

  const toggleClientForAgent = (agentId: string, clientId: string) => {
    setAssignments((prev) => {
      const currentClients = prev[agentId] || []
      const exists = currentClients.includes(clientId)

      let newClients
      if (exists) {
        newClients = currentClients.filter((id) => id !== clientId)
      } else {
        newClients = [...currentClients, clientId]
      }

      return { ...prev, [agentId]: newClients }
    })

    // Marcăm agentul ca modificat
    setModifiedAgents((prev) => new Set(prev).add(agentId))
  }

  const handleSaveAll = async () => {
    if (modifiedAgents.size === 0) {
      toast.info('Nu există modificări de salvat.')
      return
    }

    setIsLoading(true)
    try {
      // Salvăm doar agenții care au fost modificați
      const promises = Array.from(modifiedAgents).map((agentId) => {
        const clientIds = assignments[agentId] || []
        return saveAgentClientList(agentId, clientIds)
      })

      await Promise.all(promises)

      toast.success('Listele au fost actualizate!')
      setModifiedAgents(new Set())
      await loadData()
      setIsOpen(false)
    } catch (error) {
      toast.error('Eroare la salvare.')
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger-ul este doar un buton de editare simplu */}
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' className='gap-2'>
          <Edit className='h-4 w-4' />
          Editează Liste Agenți
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-[80vw] h-[85vh] flex flex-col p-0 gap-0 bg-zinc-950 border-zinc-800'>
        <DialogHeader className='p-6 border-b border-white/10 flex flex-row items-center justify-between'>
          <DialogTitle>Configurare Liste Clienți per Agent</DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto p-6 bg-zinc-950/50'>
          {isLoading && !agents.length ? (
            <div className='flex justify-center p-10'>
              <Loader2 className='animate-spin' />
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {agents.map((agent) => {
                const assignedCount = assignments[agent._id]?.length || 0
                const isModified = modifiedAgents.has(agent._id)

                return (
                  <div
                    key={agent._id}
                    className={cn(
                      'p-4 border rounded-lg flex flex-col gap-3 transition-colors',
                      isModified
                        ? 'border-blue-500/50 bg-blue-500/5'
                        : 'border-white/10 bg-zinc-900',
                    )}
                  >
                    <div className='flex justify-between items-center'>
                      <span className='font-bold text-sm'>{agent.name}</span>
                      <Badge
                        variant={assignedCount > 0 ? 'default' : 'secondary'}
                      >
                        {assignedCount} Clienți
                      </Badge>
                    </div>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant='outline'
                          role='combobox'
                          className='justify-between w-full border-white/10 bg-zinc-950 text-muted-foreground hover:text-foreground'
                        >
                          {assignedCount > 0
                            ? `Gestionează (${assignedCount})`
                            : 'Adaugă clienți...'}
                          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent
                        className='w-[450px] h-[500px] p-0 bg-zinc-950 border-white/10'
                        align='start'
                      >
                        <Command className='bg-zinc-950 w-full h-full flex flex-col'>
                          <CommandInput
                            placeholder='Caută client...'
                            className='border-none focus:ring-0 h-10'
                          />

                          {/* FIX SCROLL: max-h-[450px] forțează scroll-ul să apară */}
                          <CommandList className='max-h-[450px] overflow-y-auto'>
                            <CommandEmpty className='py-6 text-center text-sm text-muted-foreground'>
                              Niciun client găsit.
                            </CommandEmpty>
                            <CommandGroup>
                              {clients.map((client) => {
                                const isSelected = (
                                  assignments[agent._id] || []
                                ).includes(client._id)
                                return (
                                  <CommandItem
                                    key={client._id}
                                    value={client.name}
                                    onSelect={() =>
                                      toggleClientForAgent(
                                        agent._id,
                                        client._id,
                                      )
                                    }
                                    className='cursor-pointer aria-selected:bg-white/10'
                                  >
                                    <div
                                      className={cn(
                                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                                        isSelected
                                          ? 'bg-primary text-primary-foreground'
                                          : 'opacity-50 [&_svg]:invisible',
                                      )}
                                    >
                                      <Check className={cn('h-4 w-4')} />
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
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className='p-4 border-t border-white/10 bg-zinc-900'>
          <Button variant='ghost' onClick={() => setIsOpen(false)}>
            Închide
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={isLoading || modifiedAgents.size === 0}
            className='bg-green-600 hover:bg-green-700 min-w-[150px]'
          >
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            <Save className='mr-2 h-4 w-4' /> Salvează Modificările
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
