'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CONTACT_ROLE_LABELS, DEAL_STATUS_LABELS, DEAL_STATUS_COLORS } from '@/lib/contact-system/constants'
import { BuyerContactRole, DealStage } from '@prisma/client'
import { cn } from '@/lib/utils'
import {
  History,
  Building2,
  Briefcase,
  Calendar,
  ExternalLink,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

interface DealHistoryItem {
  id: string
  role: BuyerContactRole
  isPrimary: boolean
  dealBuyer: {
    id: string
    currentStage: DealStage
    approvalStatus: string
    deal: {
      id: string
      name: string
      status: string
      company: {
        name: string
      }
    }
    canonicalCompany: {
      id: string
      name: string
    }
  }
  createdAt: string
}

interface ContactHistoryProps {
  personId: string
  /** Current deal ID to highlight */
  currentDealId?: string
  className?: string
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
}

export function ContactHistory({ personId, currentDealId, className }: ContactHistoryProps) {
  const [history, setHistory] = useState<DealHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/contact-system/canonical/people/${personId}/deals`)
        if (res.ok) {
          const data = await res.json()
          setHistory(data.dealContacts || [])
        }
      } catch (error) {
        console.error('Error fetching contact history:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [personId])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Deal History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const otherDeals = history.filter(
    (h) => h.dealBuyer.deal.id !== currentDealId
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Deal History
          <Badge variant="secondary" className="ml-auto">
            {history.length} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No prior deal involvement
          </p>
        ) : otherDeals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Only involved in current deal
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            <AnimatePresence>
              <motion.div
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {otherDeals.map((item, index) => {
                  const deal = item.dealBuyer.deal
                  const buyer = item.dealBuyer
                  const statusColor = DEAL_STATUS_COLORS[deal.status as keyof typeof DEAL_STATUS_COLORS] || 'gray'

                  let stageIcon = <Clock className="h-4 w-4 text-muted-foreground" />
                  if (buyer.currentStage === 'CLOSED') {
                    stageIcon = <CheckCircle className="h-4 w-4 text-green-600" />
                  } else if (['WITHDRAWN', 'TERMINATED', 'PASSED'].includes(buyer.currentStage)) {
                    stageIcon = <XCircle className="h-4 w-4 text-red-600" />
                  }

                  return (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.05 }}
                      className="relative flex gap-3 pl-2"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-[11px] w-2.5 h-2.5 rounded-full bg-background border-2 border-border z-10" />

                      {/* Content */}
                      <div className="flex-1 ml-6 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/dashboard/deals/${deal.id}`}
                                className="font-medium hover:underline truncate"
                              >
                                {deal.name}
                              </Link>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  `border-${statusColor}-300 text-${statusColor}-700`
                                )}
                              >
                                {DEAL_STATUS_LABELS[deal.status as keyof typeof DEAL_STATUS_LABELS] || deal.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span>{buyer.canonicalCompany.name}</span>
                              <span>•</span>
                              <span>{CONTACT_ROLE_LABELS[item.role as keyof typeof CONTACT_ROLE_LABELS]}</span>
                              {item.isPrimary && (
                                <>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-[10px] h-4">
                                    Primary
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {stageIcon}
                            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                              <Link href={`/dashboard/deals/${deal.id}/buyers/${buyer.id}`}>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </div>

                        {/* Stage indicator */}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>Stage:</span>
                          <Badge variant="outline" className="text-xs">
                            {buyer.currentStage.replace(/_/g, ' ')}
                          </Badge>
                          <span>•</span>
                          <span>
                            Added {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Institutional Memory Notes */}
        {otherDeals.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Institutional Memory</h4>
            <p className="text-xs text-muted-foreground">
              This contact has been involved in {otherDeals.length} other deal
              {otherDeals.length > 1 ? 's' : ''}.
              {otherDeals.some((d) => d.dealBuyer.currentStage === 'CLOSED') && (
                <span className="text-green-600 ml-1">
                  Previously part of a closed deal.
                </span>
              )}
              {otherDeals.every((d) => ['WITHDRAWN', 'TERMINATED', 'PASSED'].includes(d.dealBuyer.currentStage)) && (
                <span className="text-amber-600 ml-1">
                  No prior successful deals.
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
