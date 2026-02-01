'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { ApprovalQueue } from '@/components/approvals'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'

interface PageProps {
  params: Promise<{ dealId: string }>
}

interface Deal {
  id: string
  name: string
  status: string
}

export default function ApprovalsPage({ params }: PageProps) {
  const { dealId } = use(params)
  const router = useRouter()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const res = await fetch(`/api/deals/${dealId}`)
        if (res.ok) {
          const data = await res.json()
          setDeal(data.deal)
        } else {
          setError('Deal not found')
        }
      } catch (err) {
        setError('Failed to load deal')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDeal()
  }, [dealId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{error || 'Deal not found'}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/deals')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deals
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/deals" className="hover:text-foreground">
          Deals
        </Link>
        <span>/</span>
        <Link href={`/dashboard/deals/${dealId}`} className="hover:text-foreground">
          {deal.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Approvals</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{deal.name} - Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve buyers for outreach
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/deals/${dealId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deal
          </Link>
        </Button>
      </div>

      {/* Approval Queue */}
      <ApprovalQueue dealId={dealId} dealName={deal.name} />
    </motion.div>
  )
}
