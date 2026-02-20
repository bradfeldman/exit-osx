'use client'

import Link from 'next/link'
import { Lock, Check, Circle } from 'lucide-react'

export interface PlaybookSection {
  title: string
  order: number
  status: 'completed' | 'active' | 'unlocked' | 'locked'
}

interface PlaybookSidebarProps {
  playbookId: string
  playbookTitle: string
  sections: PlaybookSection[]
  currentSection: number
  compositeScore?: number | null
  percentComplete: number
  variant?: 'desktop' | 'mobile'
  onNavigate?: () => void
}

export function PlaybookSidebar({
  playbookId,
  playbookTitle,
  sections,
  currentSection,
  compositeScore,
  percentComplete,
  variant = 'desktop',
  onNavigate,
}: PlaybookSidebarProps) {
  return (
    <aside
      className={
        variant === 'mobile'
          ? 'flex flex-col w-full bg-white overflow-y-auto'
          : 'hidden lg:flex flex-col w-64 h-full bg-white border-r overflow-y-auto'
      }
      style={variant === 'desktop' ? { borderColor: 'var(--border, #E5E7EB)' } : undefined}
    >
      {/* Brand block */}
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border-light, #F2F2F7)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent, #0071E3)' }}>
          Exit OS Playbook
        </p>
        <h2 className="text-sm font-bold mt-1 leading-tight" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
          {playbookTitle}
        </h2>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-light, #F2F2F7)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
            Progress
          </span>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
            {Math.round(percentComplete)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percentComplete}%`,
              backgroundColor: 'var(--accent, #0071E3)',
            }}
          />
        </div>
      </div>

      {/* Section nav */}
      <nav className="flex-1 py-2 overflow-y-auto" aria-label="Playbook sections">
        <ul className="space-y-0.5">
          {sections.map((section) => {
            const isActive = section.order === currentSection
            const isCompleted = section.status === 'completed'
            const isLocked = section.status === 'locked'

            return (
              <li key={section.order}>
                {isLocked ? (
                  <div
                    className="flex items-center gap-3 px-5 py-2.5 text-sm cursor-not-allowed opacity-50"
                    aria-disabled="true"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary, #8E8E93)' }} />
                    <span className="truncate" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
                      {section.title}
                    </span>
                  </div>
                ) : (
                  <Link
                    href={`/playbook/${playbookId}/${section.order}`}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                      isActive ? 'border-l-[3px]' : 'border-l-[3px] border-transparent hover:bg-gray-50'
                    }`}
                    style={
                      isActive
                        ? {
                            borderLeftColor: 'var(--accent, #0071E3)',
                            backgroundColor: 'var(--accent-light, #EBF5FF)',
                          }
                        : undefined
                    }
                  >
                    {isCompleted ? (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--green, #34C759)' }}>
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <Circle
                        className="w-4 h-4 shrink-0"
                        style={{
                          color: isActive ? 'var(--accent, #0071E3)' : 'var(--text-tertiary, #8E8E93)',
                        }}
                      />
                    )}
                    <span
                      className={`truncate ${isActive ? 'font-medium' : ''}`}
                      style={{
                        color: isActive
                          ? 'var(--accent, #0071E3)'
                          : isCompleted
                            ? 'var(--text-primary, #1D1D1F)'
                            : 'var(--text-secondary, #6E6E73)',
                      }}
                    >
                      {section.title}
                    </span>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Composite score (bottom) */}
      {compositeScore !== null && compositeScore !== undefined && (
        <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border-light, #F2F2F7)' }}>
          <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
            Composite Score
          </p>
          <div className="flex items-baseline gap-1">
            <span
              className="text-2xl font-bold tabular-nums"
              style={{
                color:
                  compositeScore >= 70
                    ? 'var(--green, #34C759)'
                    : compositeScore >= 40
                      ? 'var(--orange, #FF9500)'
                      : 'var(--red, #FF3B30)',
              }}
            >
              {Math.round(compositeScore)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
              / 100
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
