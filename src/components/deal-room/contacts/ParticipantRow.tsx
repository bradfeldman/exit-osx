'use client'

import { cn } from '@/lib/utils'
import { SideBadge } from './SideBadge'
import { PARTICIPANT_ROLE_LABELS } from '@/lib/contact-system/constants'
import type { DealParticipantData } from '@/hooks/useContactSystem'

interface ParticipantRowProps {
  participant: DealParticipantData
  onClick?: () => void
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const AVATAR_COLORS: Record<string, string> = {
  BUYER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  SELLER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  NEUTRAL: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

export function ParticipantRow({ participant, onClick }: ParticipantRowProps) {
  const { canonicalPerson, side, role, isPrimary, isActive, dealBuyer } = participant
  const fullName = `${canonicalPerson.firstName} ${canonicalPerson.lastName}`
  const roleLabel = PARTICIPANT_ROLE_LABELS[role] ?? role

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
        'hover:bg-muted/50',
        !isActive && 'opacity-50'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
        AVATAR_COLORS[side] ?? AVATAR_COLORS.NEUTRAL
      )}>
        {getInitials(canonicalPerson.firstName, canonicalPerson.lastName)}
      </div>

      {/* Name & title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate">
            {fullName}
          </span>
          {isPrimary && (
            <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Primary
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {canonicalPerson.currentTitle && (
            <span className="truncate">{canonicalPerson.currentTitle}</span>
          )}
          {canonicalPerson.currentTitle && canonicalPerson.currentCompany && (
            <span>&middot;</span>
          )}
          {canonicalPerson.currentCompany && (
            <span className="truncate">{canonicalPerson.currentCompany.name}</span>
          )}
        </div>
      </div>

      {/* Role badge */}
      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
        {roleLabel}
      </span>

      {/* Side badge */}
      <SideBadge side={side} />

      {/* Buyer name (if buyer-side) */}
      {dealBuyer && (
        <span className="text-[10px] text-muted-foreground truncate max-w-[100px] shrink-0">
          → {dealBuyer.canonicalCompany.name}
        </span>
      )}
    </button>
  )
}
