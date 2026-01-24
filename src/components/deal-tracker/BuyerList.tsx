'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DealStage, BuyerType, BuyerTier } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StageChangeModal } from './StageChangeModal'
import {
  STAGE_LABELS,
  STAGE_COLORS,
  BUYER_TYPE_LABELS,
  BUYER_TYPE_COLORS,
  BUYER_TIER_LABELS,
  BUYER_TIER_COLORS,
  VALID_STAGE_TRANSITIONS,
} from '@/lib/deal-tracker/constants'
import { cn } from '@/lib/utils'

interface ProspectiveBuyer {
  id: string
  name: string
  buyerType: BuyerType
  tier: BuyerTier
  currentStage: DealStage
  website: string | null
  industry: string | null
  location: string | null
  stageUpdatedAt: string
  ioiAmount: number | null
  loiAmount: number | null
  contacts: Array<{
    id: string
    email: string
    firstName: string
    lastName: string
    isPrimary: boolean
  }>
  _count: {
    documents: number
    meetings: number
    activities: number
  }
}

interface BuyerListProps {
  buyers: ProspectiveBuyer[]
  companyId: string
  onBuyerUpdated: () => void
}

export function BuyerList({ buyers, companyId, onBuyerUpdated }: BuyerListProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<ProspectiveBuyer | null>(null)
  const [targetStage, setTargetStage] = useState<DealStage | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Buyer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>IOI/LOI</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buyers.map((buyer) => {
              const stageColors = STAGE_COLORS[buyer.currentStage]
              const typeColors = BUYER_TYPE_COLORS[buyer.buyerType]
              const tierColors = BUYER_TIER_COLORS[buyer.tier]
              const primaryContact = buyer.contacts.find(c => c.isPrimary) || buyer.contacts[0]
              const validTransitions = VALID_STAGE_TRANSITIONS[buyer.currentStage] || []

              return (
                <TableRow key={buyer.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/deal-tracker/${buyer.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {buyer.name}
                    </Link>
                    {buyer.industry && (
                      <p className="text-xs text-muted-foreground">{buyer.industry}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'text-xs px-2 py-1 rounded',
                      typeColors.bg,
                      typeColors.text
                    )}>
                      {BUYER_TYPE_LABELS[buyer.buyerType]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'text-xs px-2 py-1 rounded',
                      tierColors.bg,
                      tierColors.text
                    )}>
                      {BUYER_TIER_LABELS[buyer.tier]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'text-xs px-2 py-1 rounded',
                      stageColors.bg,
                      stageColors.text
                    )}>
                      {STAGE_LABELS[buyer.currentStage]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {primaryContact ? (
                      <div>
                        <p className="text-sm">
                          {primaryContact.firstName} {primaryContact.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{primaryContact.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No contacts</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {buyer.loiAmount ? (
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(Number(buyer.loiAmount))}</p>
                        <p className="text-xs text-muted-foreground">LOI</p>
                      </div>
                    ) : buyer.ioiAmount ? (
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(Number(buyer.ioiAmount))}</p>
                        <p className="text-xs text-muted-foreground">IOI</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(buyer.stageUpdatedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/deal-tracker/${buyer.id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {validTransitions.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              Move to Stage
                            </div>
                            {validTransitions.map((stage) => (
                              <DropdownMenuItem
                                key={stage}
                                onClick={() => {
                                  setSelectedBuyer(buyer)
                                  setTargetStage(stage)
                                }}
                              >
                                <span className={cn(
                                  'w-2 h-2 rounded-full mr-2',
                                  STAGE_COLORS[stage].bg
                                )} />
                                {STAGE_LABELS[stage]}
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Stage Change Modal */}
      {selectedBuyer && targetStage && (
        <StageChangeModal
          buyer={selectedBuyer}
          targetStage={targetStage}
          companyId={companyId}
          isOpen={true}
          onClose={() => {
            setSelectedBuyer(null)
            setTargetStage(null)
          }}
          onComplete={() => {
            setSelectedBuyer(null)
            setTargetStage(null)
            onBuyerUpdated()
          }}
        />
      )}
    </>
  )
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  )
}
