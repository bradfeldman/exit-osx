'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BuyerTypeBadge } from '../shared/BuyerTypeBadge'
import { TierBadge } from '../shared/TierBadge'
import { EngagementDot } from '../shared/EngagementDot'
import type { PipelineBuyer } from './BuyerCard'

interface BuyerDetailPanelProps {
  buyer: PipelineBuyer
  onClose: () => void
}

export function BuyerDetailPanel({ buyer, onClose }: BuyerDetailPanelProps) {
  const offerAmount = buyer.loiAmount ?? buyer.ioiAmount

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: amount >= 1_000_000 ? 1 : 0,
      notation: amount >= 1_000_000 ? 'compact' : 'standard',
    }).format(amount)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-[500px] bg-card border-l border-border shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border/50 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-lg font-semibold text-foreground pr-8">{buyer.companyName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <BuyerTypeBadge type={buyer.buyerType} />
            <TierBadge tier={buyer.tier} />
            <EngagementDot level={buyer.engagementLevel} />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Overview */}
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              Overview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Stage</span>
                <span className="font-medium">{buyer.stageLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage Updated</span>
                <span>{new Date(buyer.stageUpdatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {buyer.primaryContact && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primary Contact</span>
                    <span>{buyer.primaryContact.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="text-xs">{buyer.primaryContact.email}</span>
                  </div>
                  {buyer.primaryContact.title && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title</span>
                      <span>{buyer.primaryContact.title}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Engagement */}
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              Data Room Engagement
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Docs viewed (7d)</span>
                <span className="font-medium">{buyer.docViewsLast7Days}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last activity</span>
                <span>
                  {buyer.lastActivity
                    ? new Date(buyer.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Engagement</span>
                <div className="flex items-center gap-1.5">
                  <EngagementDot level={buyer.engagementLevel} />
                  <span className="text-xs capitalize">{buyer.engagementLevel}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Offers */}
          {offerAmount && buyer.offerType && (
            <section>
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                Offer Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-[var(--burnt-orange)]">
                    {formatAmount(offerAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{buyer.offerType}</span>
                </div>
                {buyer.offerDeadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline</span>
                    <span>
                      {new Date(buyer.offerDeadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                {buyer.exclusivityEnd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exclusivity Ends</span>
                    <span>
                      {new Date(buyer.exclusivityEnd).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Tags */}
          {buyer.tags.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1">
                {buyer.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          {buyer.internalNotes && (
            <section>
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                Notes
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {buyer.internalNotes}
              </p>
            </section>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border/50 bg-card flex items-center gap-2">
          <Button size="sm" variant="outline">
            Change Stage
          </Button>
          <Button size="sm" variant="ghost">
            Add Contact
          </Button>
          <Button size="sm" variant="ghost">
            Log Meeting
          </Button>
        </div>
      </div>
    </>
  )
}
