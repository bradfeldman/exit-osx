'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Eye, EyeOff, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { DataRoomDoc } from './DataRoomDocCard'

interface Buyer {
  id: string
  name: string
  company: string | null
}

interface DocAccess {
  buyerId: string
  documentId: string
  granted: boolean
}

interface ProspectAccessPanelProps {
  companyId: string
  documents: DataRoomDoc[]
}

export function ProspectAccessPanel({ companyId, documents }: ProspectAccessPanelProps) {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [access, setAccess] = useState<DocAccess[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchBuyers = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/deal-room/buyers`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setBuyers(json.buyers || [])
      setAccess(json.access || [])
    } catch {
      toast.error('Failed to load prospect data')
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchBuyers()
  }, [fetchBuyers])

  const toggleAccess = async (buyerId: string, documentId: string, currentlyGranted: boolean) => {
    // Optimistic update
    setAccess((prev) => {
      const existing = prev.find((a) => a.buyerId === buyerId && a.documentId === documentId)
      if (existing) {
        return prev.map((a) =>
          a.buyerId === buyerId && a.documentId === documentId
            ? { ...a, granted: !currentlyGranted }
            : a
        )
      }
      return [...prev, { buyerId, documentId, granted: !currentlyGranted }]
    })

    try {
      const res = await fetch(
        `/api/companies/${companyId}/deal-room/buyers/${buyerId}/doc-access`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId, granted: !currentlyGranted }),
        }
      )
      if (!res.ok) throw new Error('Failed to update')
    } catch {
      // Rollback
      setAccess((prev) =>
        prev.map((a) =>
          a.buyerId === buyerId && a.documentId === documentId
            ? { ...a, granted: currentlyGranted }
            : a
        )
      )
      toast.error('Failed to update access')
    }
  }

  const isGranted = (buyerId: string, documentId: string) => {
    const entry = access.find((a) => a.buyerId === buyerId && a.documentId === documentId)
    return entry?.granted ?? false
  }

  const filteredBuyers = buyers.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.company?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (buyers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          No prospects added yet. Add buyers from the Pipeline tab to manage document access.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Control which documents each prospect can access. Toggle visibility per document per buyer.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prospects..."
          className="pl-9 h-9"
        />
      </div>

      {/* Access Grid */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/30 min-w-[160px]">
                Prospect
              </th>
              {documents.map((doc) => (
                <th
                  key={doc.id}
                  className="p-3 font-medium text-muted-foreground text-center min-w-[100px]"
                  title={doc.documentName}
                >
                  <span className="text-xs line-clamp-2">{doc.documentName}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredBuyers.map((buyer) => (
              <tr key={buyer.id} className="border-b last:border-b-0 hover:bg-muted/10">
                <td className="p-3 sticky left-0 bg-background">
                  <div className="font-medium text-foreground">{buyer.name}</div>
                  {buyer.company && (
                    <div className="text-xs text-muted-foreground">{buyer.company}</div>
                  )}
                </td>
                {documents.map((doc) => {
                  const granted = isGranted(buyer.id, doc.id)
                  return (
                    <td key={doc.id} className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAccess(buyer.id, doc.id, granted)}
                        className="h-7 w-7 p-0"
                      >
                        {granted ? (
                          <Eye className="h-4 w-4 text-green-dark" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </Button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
