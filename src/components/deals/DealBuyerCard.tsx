'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from '@/lib/motion'
import { DealStage, ApprovalStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  STAGE_LABELS,
  STAGE_COLORS,
  BUYER_TYPE_LABELS,
  BUYER_TYPE_COLORS,
  BUYER_TIER_LABELS,
  BUYER_TIER_COLORS,
  VALID_STAGE_TRANSITIONS,
} from '@/lib/deal-tracker/constants'
import { APPROVAL_STATUS_LABELS } from '@/lib/contact-system/constants'

const APPROVAL_COLORS: Record<ApprovalStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700' },
  HOLD: { bg: 'bg-orange-100', text: 'text-orange-700' },
  DENIED: { bg: 'bg-red-100', text: 'text-red-700' },
}
import { cn } from '@/lib/utils'
import {
  MoreHorizontal,
  User,
  DollarSign,
  Users,
  Clock,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import type { DealBuyer } from './types'

interface DealBuyerCardProps {
  buyer: DealBuyer
  dealId: string
  onStageChange: (stage: DealStage) => void
  onApprovalChange?: (status: ApprovalStatus) => void
}

export function DealBuyerCard({
  buyer,
  dealId,
  onStageChange,
  onApprovalChange,
}: DealBuyerCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const stageColors = STAGE_COLORS[buyer.currentStage]
  const typeColors = BUYER_TYPE_COLORS[buyer.canonicalCompany.companyType]
  const tierColors = BUYER_TIER_COLORS[buyer.tier]
  const approvalColors = APPROVAL_COLORS[buyer.approvalStatus]
  const primaryContact = buyer.contacts.find((c) => c.isPrimary) || buyer.contacts[0]
  const validTransitions = VALID_STAGE_TRANSITIONS[buyer.currentStage] || []
  const canTransition = buyer.approvalStatus === ApprovalStatus.APPROVED && validTransitions.length > 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const daysSinceUpdate = useMemo(() => {
    const now = new Date()
    const updated = new Date(buyer.stageUpdatedAt)
    return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))
  }, [buyer.stageUpdatedAt])

  const urgencyLevel = daysSinceUpdate > 30 ? 'critical' : daysSinceUpdate > 14 ? 'warning' : 'normal'
  const isPendingApproval = buyer.approvalStatus === ApprovalStatus.PENDING

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'bg-background rounded-xl border shadow-sm hover:shadow-md transition-all group cursor-pointer',
        urgencyLevel === 'critical' && 'border-red-200 dark:border-red-900/50',
        urgencyLevel === 'warning' && 'border-amber-200 dark:border-amber-900/50',
        isPendingApproval && 'border-amber-300 dark:border-amber-800'
      )}
    >
      {/* Header */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/dashboard/deals/${dealId}/buyers/${buyer.id}`}
            className="font-medium text-sm hover:text-primary transition-colors line-clamp-1 group-hover:text-primary flex-1"
          >
            {buyer.canonicalCompany.name}
          </Link>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link
                  href={`/dashboard/deals/${dealId}/buyers/${buyer.id}`}
                  className="flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>

              {/* Approval Actions */}
              {isPendingApproval && onApprovalChange && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Approval
                  </div>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsMenuOpen(false)
                      onApprovalChange(ApprovalStatus.APPROVED)
                    }}
                    className="flex items-center text-green-600"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsMenuOpen(false)
                      onApprovalChange(ApprovalStatus.DENIED)
                    }}
                    className="flex items-center text-red-600"
                  >
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Deny
                  </DropdownMenuItem>
                </>
              )}

              {/* Stage Transitions */}
              {canTransition && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Move to Stage
                  </div>
                  {validTransitions.map((stage) => (
                    <DropdownMenuItem
                      key={stage}
                      onClick={() => {
                        setIsMenuOpen(false)
                        onStageChange(stage)
                      }}
                      className="flex items-center"
                    >
                      <span
                        className={cn('w-2 h-2 rounded-full mr-2', STAGE_COLORS[stage].bg)}
                      />
                      <span className="flex-1">{STAGE_LABELS[stage]}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {isPendingApproval && (
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                approvalColors.bg,
                approvalColors.text
              )}
            >
              {APPROVAL_STATUS_LABELS[buyer.approvalStatus]}
            </span>
          )}
          <span
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              typeColors.bg,
              typeColors.text
            )}
          >
            {BUYER_TYPE_LABELS[buyer.canonicalCompany.companyType]}
          </span>
          <span
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              tierColors.bg,
              tierColors.text
            )}
          >
            {BUYER_TIER_LABELS[buyer.tier]}
          </span>
          <span
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              stageColors.bg,
              stageColors.text
            )}
          >
            {STAGE_LABELS[buyer.currentStage]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3 space-y-1.5">
        {/* Primary Contact */}
        {primaryContact && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {primaryContact.canonicalPerson.firstName}{' '}
              {primaryContact.canonicalPerson.lastName}
            </span>
          </div>
        )}

        {/* IOI/LOI Amount */}
        {(buyer.ioiAmount || buyer.loiAmount) && (
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="h-3 w-3 flex-shrink-0 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-600 dark:text-green-400">
              {buyer.loiAmount
                ? `LOI: ${formatCurrency(Number(buyer.loiAmount))}`
                : `IOI: ${formatCurrency(Number(buyer.ioiAmount))}`}
            </span>
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {buyer.contacts.length}
            </span>
          </div>
          <span
            className={cn(
              'flex items-center gap-1 font-medium',
              urgencyLevel === 'warning' && 'text-amber-500',
              urgencyLevel === 'critical' && 'text-red-500'
            )}
          >
            <Clock className="h-3 w-3" />
            {daysSinceUpdate}d
          </span>
        </div>
      </div>

      {/* Urgency indicator bar */}
      {urgencyLevel !== 'normal' && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className={cn(
            'h-0.5 rounded-b-xl origin-left',
            urgencyLevel === 'warning' && 'bg-amber-500',
            urgencyLevel === 'critical' && 'bg-red-500'
          )}
        />
      )}
    </motion.div>
  )
}
