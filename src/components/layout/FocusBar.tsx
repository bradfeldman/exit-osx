'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, X, Check, Loader2, Menu } from 'lucide-react'

interface FocusBarProps {
  playbookId: string
  playbookTitle: string
  currentSection: number
  totalSections: number
  saveStatus?: 'saved' | 'saving' | 'idle'
  referrer?: string | null
  onMenuToggle?: () => void
}

export function FocusBar({
  playbookId,
  playbookTitle,
  currentSection,
  totalSections,
  saveStatus = 'idle',
  referrer,
  onMenuToggle,
}: FocusBarProps) {
  const router = useRouter()
  const progressPercent = totalSections > 0 ? ((currentSection + 1) / totalSections) * 100 : 0

  const handleClose = () => {
    if (referrer) {
      router.push(referrer)
    } else {
      router.push('/dashboard/playbook')
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-white border-b" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
      {/* Progress bar (thin line at very top) */}
      <div className="h-[3px] bg-gray-100 w-full">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: 'var(--accent, #0071E3)',
          }}
        />
      </div>

      {/* Bar content */}
      <div className="h-[45px] flex items-center px-4 gap-4">
        {/* Left: Back + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href={`/playbook/${playbookId}`}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back to playbook overview"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary, #6E6E73)' }} />
          </Link>

          <nav className="hidden sm:flex items-center gap-1.5 text-sm min-w-0" aria-label="Breadcrumb">
            <Link href="/dashboard" className="shrink-0 hover:underline" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
              Exit OS
            </Link>
            <span className="shrink-0" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>/</span>
            <Link href="/dashboard/playbook" className="shrink-0 hover:underline" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
              Programs
            </Link>
            <span className="shrink-0" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>/</span>
            <span className="truncate font-medium" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
              {playbookTitle}
            </span>
          </nav>

          {/* Mobile: just title */}
          <span className="sm:hidden truncate text-sm font-medium" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
            {playbookTitle}
          </span>
        </div>

        {/* Center: Section progress */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
            Section {currentSection + 1} of {totalSections}
          </span>
        </div>

        {/* Right: Save status + Close */}
        <div className="flex items-center gap-3 shrink-0">
          {saveStatus === 'saving' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
              <Check className="w-3 h-3" />
              Auto-saved
            </span>
          )}

          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open section menu"
            >
              <Menu className="w-4 h-4" style={{ color: 'var(--text-secondary, #6E6E73)' }} />
            </button>
          )}

          <button
            onClick={handleClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close playbook"
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-secondary, #6E6E73)' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
