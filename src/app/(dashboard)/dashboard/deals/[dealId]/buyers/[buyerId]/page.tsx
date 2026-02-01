'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  STAGE_LABELS,
  STAGE_COLORS,
  BUYER_TYPE_LABELS,
  BUYER_TIER_LABELS,
} from '@/lib/deal-tracker/constants'
import { APPROVAL_STATUS_LABELS } from '@/lib/contact-system/constants'
import { ApprovalStatus } from '@prisma/client'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  History,
  Users,
  Activity,
} from 'lucide-react'
import type { DealBuyer, StageHistoryEntry } from '@/components/deals/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
  },
}

interface PageProps {
  params: Promise<{ dealId: string; buyerId: string }>
}

export default function BuyerDetailPage({ params }: PageProps) {
  const router = useRouter()
  const [dealId, setDealId] = useState<string>('')
  const [buyerId, setBuyerId] = useState<string>('')
  const [buyer, setBuyer] = useState<DealBuyer | null>(null)
  const [history, setHistory] = useState<StageHistoryEntry[]>([])
  const [deal, setDeal] = useState<{ codeName: string; company: { name: string } } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Unwrap params
  useEffect(() => {
    params.then(({ dealId: d, buyerId: b }) => {
      setDealId(d)
      setBuyerId(b)
    })
  }, [params])

  const fetchBuyer = useCallback(async () => {
    if (!dealId || !buyerId) return
    try {
      const res = await fetch(`/api/deals/${dealId}/buyers/${buyerId}`)
      if (res.ok) {
        const data = await res.json()
        setBuyer(data.buyer)
        setDeal(data.buyer?.deal)
      } else if (res.status === 404) {
        router.push(`/dashboard/deals/${dealId}`)
      }
    } catch (error) {
      console.error('Error fetching buyer:', error)
    }
  }, [dealId, buyerId, router])

  const fetchHistory = useCallback(async () => {
    if (!dealId || !buyerId) return
    try {
      const res = await fetch(`/api/deals/${dealId}/buyers/${buyerId}/history`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }, [dealId, buyerId])

  useEffect(() => {
    if (!dealId || !buyerId) return
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchBuyer(), fetchHistory()])
      setIsLoading(false)
    }
    loadData()
  }, [dealId, buyerId, fetchBuyer, fetchHistory])

  const handleApprovalChange = async (status: ApprovalStatus) => {
    if (!dealId || !buyerId) return
    try {
      const res = await fetch(`/api/deals/${dealId}/buyers/${buyerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: status }),
      })
      if (res.ok) {
        fetchBuyer()
      }
    } catch (error) {
      console.error('Error updating approval:', error)
    }
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-4"
          >
            <Loader2 className="h-10 w-10 text-primary" />
          </motion.div>
          <p className="text-muted-foreground font-medium">Loading buyer details...</p>
        </div>
      </div>
    )
  }

  if (!buyer || !deal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Buyer not found</p>
          <Button asChild variant="link" className="mt-2">
            <Link href={`/dashboard/deals/${dealId}`}>Back to Deal</Link>
          </Button>
        </div>
      </div>
    )
  }

  const stageColors = STAGE_COLORS[buyer.currentStage]
  const isPendingApproval = buyer.approvalStatus === ApprovalStatus.PENDING

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Breadcrumb & Header */}
      <motion.div variants={itemVariants}>
        <Link
          href={`/dashboard/deals/${dealId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {deal.codeName}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
                {buyer.canonicalCompany.name}
              </h1>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  stageColors.bg,
                  stageColors.text
                )}
              >
                {STAGE_LABELS[buyer.currentStage]}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {BUYER_TYPE_LABELS[buyer.canonicalCompany.companyType]}
              </span>
              <span>{BUYER_TIER_LABELS[buyer.tier]}</span>
              {buyer.canonicalCompany.website && (
                <a
                  href={`https://${buyer.canonicalCompany.website.replace(/^https?:\/\//, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>
          </div>

          {/* Approval Actions */}
          {isPendingApproval && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleApprovalChange(ApprovalStatus.DENIED)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Deny
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleApprovalChange(ApprovalStatus.APPROVED)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Approval Banner */}
      {isPendingApproval && (
        <motion.div
          variants={itemVariants}
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Pending Seller Approval
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                This buyer is awaiting approval before outreach can begin.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">
              <FileText className="h-4 w-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <Users className="h-4 w-4 mr-1" />
              Contacts ({buyer.contacts.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-1" />
              History ({history.length})
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-1" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Key Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Buyer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium">{APPROVAL_STATUS_LABELS[buyer.approvalStatus]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stage</p>
                      <p className="font-medium">{STAGE_LABELS[buyer.currentStage]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">
                        {BUYER_TYPE_LABELS[buyer.canonicalCompany.companyType]}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tier</p>
                      <p className="font-medium">{BUYER_TIER_LABELS[buyer.tier]}</p>
                    </div>
                  </div>
                  {buyer.buyerRationale && (
                    <div>
                      <p className="text-sm text-muted-foreground">Rationale</p>
                      <p className="text-sm mt-1">{buyer.buyerRationale}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">IOI Amount</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(buyer.ioiAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">LOI Amount</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(buyer.loiAmount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Milestones Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Key Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Added</p>
                      <p className="font-medium">{formatDate(buyer.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Teaser Sent</p>
                      <p className="font-medium">{formatDate(buyer.teaserSentAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">NDA Executed</p>
                      <p className="font-medium">{formatDate(buyer.ndaExecutedAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CIM Access</p>
                      <p className="font-medium">{formatDate(buyer.cimAccessAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">IOI Received</p>
                      <p className="font-medium">{formatDate(buyer.ioiReceivedAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">LOI Received</p>
                      <p className="font-medium">{formatDate(buyer.loiReceivedAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Closed</p>
                      <p className="font-medium">{formatDate(buyer.closedAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Exited</p>
                      <p className="font-medium">{formatDate(buyer.exitedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="mt-6">
            {buyer.contacts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No contacts added yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {buyer.contacts.map((contact) => (
                  <Card key={contact.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {contact.canonicalPerson.firstName}{' '}
                              {contact.canonicalPerson.lastName}
                            </p>
                            {contact.canonicalPerson.currentTitle && (
                              <p className="text-sm text-muted-foreground">
                                {contact.canonicalPerson.currentTitle}
                              </p>
                            )}
                          </div>
                        </div>
                        {contact.isPrimary && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="mt-4 space-y-2">
                        {contact.canonicalPerson.email && (
                          <a
                            href={`mailto:${contact.canonicalPerson.email}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="h-4 w-4" />
                            {contact.canonicalPerson.email}
                          </a>
                        )}
                        {contact.canonicalPerson.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {contact.canonicalPerson.phone}
                          </div>
                        )}
                        {contact.canonicalPerson.linkedInUrl && (
                          <a
                            href={contact.canonicalPerson.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                          >
                            <Linkedin className="h-4 w-4" />
                            LinkedIn Profile
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            {history.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No stage history yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {history.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'flex items-start gap-4 pb-4',
                          idx < history.length - 1 && 'border-b'
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <History className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {entry.fromStageLabel && (
                              <>
                                <span className="text-sm text-muted-foreground">
                                  {entry.fromStageLabel}
                                </span>
                                <ArrowLeft className="h-3 w-3 text-muted-foreground rotate-180" />
                              </>
                            )}
                            <span className="font-medium text-sm">{entry.toStageLabel}</span>
                          </div>
                          {entry.note && (
                            <p className="text-sm text-muted-foreground mt-1">{entry.note}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(entry.changedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Activity timeline coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
