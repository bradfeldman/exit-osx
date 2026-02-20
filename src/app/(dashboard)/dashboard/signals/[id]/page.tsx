'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/actions/action-center.module.css'

function formatShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${Math.round(value).toLocaleString()}`
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

interface Signal {
  id: string
  channel: string
  category: string | null
  eventType: string
  severity: string
  confidence: string
  title: string
  description: string | null
  resolutionStatus: string
  estimatedValueImpact: number | null
  weightedValueImpact: number | null
  userConfirmed: boolean | null
  createdAt: string
}

const SEVERITY_HERO: Record<string, { heroClass: string; iconBg: string }> = {
  POSITIVE: { heroClass: 'signalHeroPositive', iconBg: 'var(--green)' },
  LOW: { heroClass: 'signalHeroPositive', iconBg: 'var(--accent)' },
  MEDIUM: { heroClass: 'signalHeroWarning', iconBg: 'var(--orange)' },
  WARNING: { heroClass: 'signalHeroWarning', iconBg: 'var(--orange)' },
  HIGH: { heroClass: 'signalHeroDanger', iconBg: 'var(--red)' },
  CRITICAL: { heroClass: 'signalHeroDanger', iconBg: 'var(--red)' },
}

const SEVERITY_LABELS: Record<string, string> = {
  POSITIVE: 'Positive',
  LOW: 'Informational',
  MEDIUM: 'Warning',
  WARNING: 'Warning',
  HIGH: 'High Risk',
  CRITICAL: 'Critical',
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  OPERATIONAL: 'Operational',
  MARKET: 'Market',
  CUSTOMER_CONCENTRATION: 'Customer Risk',
  TRANSFERABILITY: 'Transferability',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

const CHANNEL_LABELS: Record<string, string> = {
  PROMPTED_DISCLOSURE: 'Weekly Check-In',
  TASK_GENERATED: 'Task Generated',
  TIME_DECAY: 'Automated Check',
  EXTERNAL: 'External Source',
  ADVISOR: 'Advisor Input',
}

export default function SignalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: signalId } = use(params)
  const { selectedCompanyId } = useCompany()
  const [signal, setSignal] = useState<Signal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    fetch(`/api/companies/${selectedCompanyId}/signals?limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data?.signals) return
        const found = data.signals.find((s: Signal) => s.id === signalId)
        if (found) setSignal(found)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedCompanyId, signalId])

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (!signal) {
    return (
      <div className={styles.card} style={{ textAlign: 'center', padding: '60px 40px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Signal not found.</p>
        <Link href="/dashboard/signals" className={styles.sectionLink} style={{ marginTop: '8px', display: 'inline-block' }}>
          Back to Signals
        </Link>
      </div>
    )
  }

  const sev = SEVERITY_HERO[signal.severity] || SEVERITY_HERO.LOW
  const isNegative = signal.severity === 'HIGH' || signal.severity === 'CRITICAL'
  const isWarning = signal.severity === 'MEDIUM' || signal.severity === 'WARNING'
  const impact = signal.estimatedValueImpact

  return (
    <>
      <TrackPageView page={`/dashboard/signals/${signalId}`} />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/signals">Signals</Link>
        <ChevronSmallIcon />
        <span>{signal.title.length > 50 ? signal.title.slice(0, 50) + '...' : signal.title}</span>
      </div>

      {/* Signal Hero */}
      <div className={`${styles.signalHero} ${styles[sev.heroClass]}`}>
        <div className={styles.signalHeroIcon} style={{ background: sev.iconBg }}>
          <SeverityIcon severity={signal.severity} />
        </div>
        <div style={{ flex: 1 }}>
          <div className={styles.signalHeroTitle}>{signal.title}</div>
          <div className={styles.signalHeroMeta}>
            <span className={styles.badge} style={{
              background: sev.iconBg, color: '#fff',
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
            }}>
              {SEVERITY_LABELS[signal.severity] || signal.severity}
            </span>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-tertiary)' }} />
            <div className={styles.statusMeta}>
              <CalendarIcon />
              Detected {new Date(signal.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            {signal.category && (
              <>
                <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-tertiary)' }} />
                <div className={styles.statusMeta}>
                  Category: {CATEGORY_LABELS[signal.category] || signal.category}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Impact Card */}
      {impact !== null && impact !== 0 && (
        <div className={`${styles.impactCard} ${isNegative || isWarning ? styles.impactCardDanger : styles.impactCardPositive}`}>
          <div className={styles.impactIcon} style={{ background: isNegative || isWarning ? 'var(--red)' : 'var(--green)' }}>
            <DollarIcon />
          </div>
          <div>
            <div className={styles.impactLabel} style={{ color: isNegative || isWarning ? 'var(--red)' : '#1B7A34' }}>
              Estimated Valuation Impact
            </div>
            <div className={styles.impactRange} style={{ color: isNegative || isWarning ? 'var(--red)' : '#1B7A34' }}>
              {impact > 0 ? '+' : ''}{formatCurrency(impact)}
            </div>
          </div>
        </div>
      )}

      {/* Two-col layout */}
      <div className={styles.signalLayout}>
        {/* LEFT */}
        <div>
          {/* What Happened */}
          {signal.description && (
            <div className={styles.card}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                What Happened
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                {signal.description}
              </div>
            </div>
          )}

          {/* AI Analysis placeholder */}
          {(isNegative || isWarning) && signal.description && (
            <div className={styles.aiAnalysis}>
              <div className={styles.aiAnalysisIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.aiAnalysisLabel}>AI Analysis</div>
                <div className={styles.aiAnalysisTitle}>Signal Analysis</div>
                <div className={styles.aiAnalysisText}>
                  This signal was detected automatically based on your business data. It may impact your valuation and buyer perception.
                  {impact && Math.abs(impact) > 100000 && (
                    <> At an estimated impact of <strong>{formatCurrency(Math.abs(impact))}</strong>, this warrants prompt attention.</>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div>
          {/* Signal Meta */}
          <div className={styles.card}>
            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Signal Details
            </div>
            <div className={styles.metaList}>
              <div className={styles.metaRow}>
                <div className={styles.metaLabel}>Severity</div>
                <div className={styles.metaValue}>
                  <span className={styles.badge} style={{
                    fontSize: '11px',
                    background: isNegative ? 'var(--red-light)' : isWarning ? 'var(--orange-light)' : 'var(--green-light)',
                    color: isNegative ? 'var(--red)' : isWarning ? '#C47000' : '#1B7A34',
                    padding: '3px 9px', borderRadius: '12px'
                  }}>
                    {SEVERITY_LABELS[signal.severity] || signal.severity}
                  </span>
                </div>
              </div>
              {signal.category && (
                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>Category</div>
                  <div className={styles.metaValue}>{CATEGORY_LABELS[signal.category] || signal.category}</div>
                </div>
              )}
              <div className={styles.metaRow}>
                <div className={styles.metaLabel}>Source</div>
                <div className={styles.metaValue}>{CHANNEL_LABELS[signal.channel] || signal.channel}</div>
              </div>
              <div className={styles.metaRow}>
                <div className={styles.metaLabel}>Detected</div>
                <div className={styles.metaValue}>
                  {new Date(signal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div className={styles.metaRow}>
                <div className={styles.metaLabel}>Status</div>
                <div className={styles.metaValue}>
                  {signal.resolutionStatus === 'OPEN' ? 'Open' : signal.resolutionStatus === 'CONFIRMED' ? 'Confirmed' : signal.resolutionStatus === 'DISMISSED' ? 'Dismissed' : signal.resolutionStatus}
                </div>
              </div>
              <div className={styles.metaRow}>
                <div className={styles.metaLabel}>Confidence</div>
                <div className={styles.metaValue}>
                  {signal.confidence === 'HIGH' ? 'High' : signal.confidence === 'MEDIUM' ? 'Medium' : 'Low'}
                </div>
              </div>
            </div>
          </div>

          {/* Due diligence note for negative signals */}
          {(isNegative || isWarning) && (
            <div className={styles.card} style={{
              background: isNegative ? 'var(--red-light)' : 'var(--orange-light)',
              borderColor: isNegative ? 'rgba(255,59,48,0.2)' : 'rgba(255,149,0,0.2)'
            }}>
              <div style={{
                fontSize: '12px', fontWeight: 700,
                color: isNegative ? 'var(--red)' : '#C47000',
                marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                Due Diligence Risk
              </div>
              <div style={{
                fontSize: '13px',
                color: isNegative ? '#8B1A1A' : '#7A4800',
                lineHeight: 1.55
              }}>
                Buyers performing due diligence will likely investigate this signal. Addressing it proactively strengthens your negotiating position and may prevent valuation discounts.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function ChevronSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px', opacity: 0.6 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  )
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'POSITIVE') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  )
  if (severity === 'MEDIUM' || severity === 'WARNING') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
  if (severity === 'HIGH' || severity === 'CRITICAL') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
  // info / LOW
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}
