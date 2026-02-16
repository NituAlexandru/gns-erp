'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Eye, Search, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

import { getAllAgentLists } from '@/lib/db/modules/overview/sales-lists/sales-list.actions'
import { getClientsForSelector } from '@/lib/db/modules/overview/sales-lists/sales-list.helpers'

export function SalesListViewer() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Date brute
  const [lists, setLists] = useState<any[]>([])
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({}) // ID -> Nume

  // Selecție
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Încărcăm listele și toți clienții pentru a le mapa numele
      const [listsRes, clientsRes] = await Promise.all([
        getAllAgentLists(),
        getClientsForSelector(),
      ])

      if (listsRes.success) {
        setLists(listsRes.data)
        // Selectăm automat primul agent dacă există
        if (listsRes.data.length > 0) {
          setSelectedAgentId(listsRes.data[0].agentId._id)
        }
      }

      // Creăm o mapare rapidă ID Client -> Nume Client
      if (clientsRes) {
        const mapping: Record<string, string> = {}
        clientsRes.forEach((c: any) => {
          mapping[c._id] = c.name
        })
        setClientsMap(mapping)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculăm datele pentru agentul selectat
  const currentAgentData = useMemo(() => {
    if (!selectedAgentId) return null
    const list = lists.find((l: any) => l.agentId._id === selectedAgentId)
    if (!list) return null

    // Mapăm ID-urile la nume și filtrăm după căutare
    const assignedClients = (list.clientIds || [])
      .map((id: string) => ({
        id,
        name: clientsMap[id] || 'Client Necunoscut',
      }))
      .filter((c: any) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()),
      )
      .sort((a: any, b: any) => a.name.localeCompare(b.name))

    return {
      agentName: list.agentId.name,
      clients: assignedClients,
    }
  }, [selectedAgentId, lists, clientsMap, clientSearch])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='gap-2 text-red-400 hover:text-red-600'
        >
          <Eye className='h-4 w-4' />
          Vezi Liste Agenți
        </Button>
      </DialogTrigger>

      <DialogContent className='w-full sm:max-w-[80vw] h-[85vh] flex flex-col p-0 gap-0 bg-zinc-950 border-zinc-800'>
        <DialogHeader className='p-6 border-b border-white/10'>
          <DialogTitle>Vizualizare Liste Asignate</DialogTitle>
        </DialogHeader>

        <div className='flex flex-1 overflow-hidden'>
          {isLoading ? (
            <div className='w-full h-full flex items-center justify-center'>
              <Loader2 className='h-8 w-8 animate-spin' />
            </div>
          ) : (
            <>
              {/* SIDEBAR: Lista Agenți */}
              <div className='w-1/3 border-r border-white/10 bg-zinc-900/30 flex flex-col'>
                <div className='p-4 border-b border-white/10 font-semibold text-sm text-muted-foreground'>
                  Agenți Configurați ({lists.length})
                </div>
                <ScrollArea className='flex-1'>
                  <div className='flex flex-col p-2 gap-1'>
                    {lists.map((list: any) => (
                      <button
                        key={list._id}
                        onClick={() => {
                          setSelectedAgentId(list.agentId._id)
                          setClientSearch('') // Reset search la schimbare agent
                        }}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-md text-sm text-left transition-colors',
                          selectedAgentId === list.agentId._id
                            ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                            : 'hover:bg-white/5 text-zinc-300',
                        )}
                      >
                        <div className='flex items-center gap-2'>
                          <User className='h-4 w-4 opacity-70' />
                          <span className='font-medium truncate max-w-[150px]'>
                            {list.agentId.name}
                          </span>
                        </div>
                        <Badge
                          variant='secondary'
                          className='text-xs bg-black/40'
                        >
                          {list.clientIds?.length || 0}
                        </Badge>
                      </button>
                    ))}
                    {lists.length === 0 && (
                      <div className='p-4 text-center text-sm text-muted-foreground'>
                        Nu există liste configurate.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* MAIN: Lista Clienți */}
              <div className='flex-1 flex flex-col bg-zinc-950'>
                {currentAgentData ? (
                  <>
                    <div className='p-4 border-b border-white/10 flex items-center justify-between gap-4'>
                      <div className='flex items-center gap-2'>
                        <Users className='h-5 w-5 text-zinc-400' />
                        <h3 className='font-bold text-lg'>
                          Clienții lui:{' '}
                          <span className='text-red-400'>
                            {currentAgentData.agentName}
                          </span>
                        </h3>
                      </div>

                      <div className='relative w-64'>
                        <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                        <Input
                          placeholder='Caută în listă...'
                          className='pl-8 bg-zinc-900 border-white/10 h-9'
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <ScrollArea className='flex-1 p-4'>
                      {currentAgentData.clients.length > 0 ? (
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2'>
                          {currentAgentData.clients.map((client: any) => (
                            <div
                              key={client.id}
                              className='p-2 px-3 rounded-md border border-white/5 bg-white/5 text-sm flex items-center gap-2 hover:bg-white/10 transition-colors'
                            >
                              <div className='h-1.5 w-1.5 rounded-full bg-red-500' />
                              <span className='truncate' title={client.name}>
                                {client.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='flex flex-col items-center justify-center h-40 text-muted-foreground'>
                          <p>Niciun client găsit.</p>
                        </div>
                      )}
                    </ScrollArea>

                    <div className='p-2 border-t border-white/10 text-xs text-right text-muted-foreground bg-zinc-900/30'>
                      Total: {currentAgentData.clients.length} clienți afișați
                    </div>
                  </>
                ) : (
                  <div className='flex flex-col items-center justify-center h-full text-muted-foreground'>
                    <p>Selectează un agent din stânga.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className='p-4 border-t border-white/10 bg-zinc-900'>
          <Button variant='outline' onClick={() => setIsOpen(false)}>
            Închide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
