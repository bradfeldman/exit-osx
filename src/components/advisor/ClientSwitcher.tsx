'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'

interface Client {
  companyId: string
  companyName: string
  organizationName: string
}

interface ClientSwitcherProps {
  currentCompanyId: string
}

export function ClientSwitcher({ currentCompanyId }: ClientSwitcherProps) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    try {
      const response = await fetch('/api/advisor')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients)
      }
    } catch (error) {
      console.error('Failed to load clients:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleClientChange(companyId: string) {
    router.push(`/advisor/${companyId}`)
  }

  if (loading) {
    return (
      <div className="h-9 w-48 bg-muted animate-pulse rounded-md" />
    )
  }

  const currentClient = clients.find(c => c.companyId === currentCompanyId)

  return (
    <Select value={currentCompanyId} onValueChange={handleClientChange}>
      <SelectTrigger className="w-56">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <SelectValue>
            {currentClient?.companyName || 'Select client'}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {clients.map((client) => (
          <SelectItem key={client.companyId} value={client.companyId}>
            <div>
              <div className="font-medium">{client.companyName}</div>
              <div className="text-xs text-muted-foreground">
                {client.organizationName}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
