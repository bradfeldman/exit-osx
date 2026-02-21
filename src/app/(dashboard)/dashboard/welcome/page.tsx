'use client'

import Link from 'next/link'
import styles from '@/components/welcome/welcome.module.css'

// TODO: wire to API — fetch user name + completion status per step

const STEPS = [
  {
    num: 1,
    icon: 'connect',
    title: 'Connect Your Financials',
    desc: 'Link QuickBooks, Xero, or upload a CSV to import your P&L and balance sheet. This powers your valuation and all financial insights.',
    time: '5 min',
    locked: false,
    href: '/dashboard/settings/integrations/connect',
    btnLabel: 'Connect Now',
    completed: false,
  },
  {
    num: 2,
    icon: 'assessment',
    title: 'Take Your Exit Readiness Assessment',
    desc: 'Answer 8 quick questions to get your Business Readiness Index (BRI) score and a personalized exit plan.',
    time: '3 min',
    locked: false,
    href: '/dashboard/assessments',
    btnLabel: 'Start Assessment',
    completed: false,
  },
  {
    num: 3,
    icon: 'valuation',
    title: 'Review Your Valuation',
    desc: 'Once your data is connected and assessment complete, see your full enterprise value estimate using three professional valuation methods.',
    time: '2 min',
    locked: true,
    href: '/dashboard/valuation',
    btnLabel: 'View Valuation',
    completed: false,
  },
]

const STEP_ICONS: Record<string, React.ReactNode> = {
  connect: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  ),
  assessment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  valuation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
}

const STEP_ICON_COLORS: Record<string, string> = {
  connect: styles.stepIconBlue,
  assessment: styles.stepIconGreen,
  valuation: styles.stepIconPurple,
}

export default function WelcomePage() {
  // TODO: wire to API — fetch real completion status + user name

  const completedCount = STEPS.filter(s => s.completed).length
  const progressPct = Math.round((completedCount / STEPS.length) * 100)

  return (
    <div>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarGreeting}>
          <h1>Welcome to Exit OSx 👋</h1>
          <p>Let's get your business set up and your first valuation running in under 10 minutes.</p>
        </div>
        <Link href="/dashboard/coach" className={styles.btnAiCoach} aria-label="Open AI Coach">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Ask AI Coach
        </Link>
      </div>

      {/* Progress section */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>Your Setup Progress</span>
          <span className={styles.progressPct}>{progressPct}%</span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Setup progress"
        >
          <div
            className={styles.progressFill}
            style={{ width: `${Math.max(progressPct, 3)}%` }}
          />
        </div>
        <p className={styles.progressSub}>
          {completedCount === 0
            ? 'Complete the steps below to unlock your full dashboard.'
            : `${completedCount} of ${STEPS.length} steps complete.`}
        </p>
      </div>

      {/* Checklist */}
      <ol className={styles.checklist} aria-label="Setup checklist">
        {STEPS.map((step) => (
          <li
            key={step.num}
            className={`${styles.stepCard} ${step.locked ? styles.stepCardLocked : ''}`}
            aria-label={step.locked ? `${step.title} (locked)` : step.title}
          >
            <div className={styles.stepNumCol}>
              <div
                className={`${styles.stepCircle} ${
                  step.completed
                    ? styles.stepCircleCompleted
                    : step.locked
                    ? styles.stepCircleLocked
                    : styles.stepCircleActive
                }`}
                aria-hidden="true"
              >
                {step.completed ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8l3.5 3.5L13 4" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
            </div>

            <div className={styles.stepBody}>
              <div className={styles.stepIconRow}>
                <div className={`${styles.stepIconWrap} ${STEP_ICON_COLORS[step.icon]}`} aria-hidden="true">
                  {STEP_ICONS[step.icon]}
                </div>
                <span className={styles.stepTitle}>{step.title}</span>
              </div>
              <p className={styles.stepDesc}>{step.desc}</p>

              <div className={styles.stepMeta}>
                <span className={styles.stepMetaItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {step.time}
                </span>
                {step.locked && (
                  <span className={styles.lockBadge}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    Complete step {step.num - 1} to unlock
                  </span>
                )}
              </div>

              {!step.locked && (
                <Link
                  href={step.href}
                  className={`${styles.btnStep} ${styles.btnStepPrimary}`}
                >
                  {step.btnLabel}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* Dashboard preview (ghost) */}
      <div className={styles.previewFrame}>
        <div className={styles.previewBlur} aria-hidden="true">
          <div className={styles.ghostCards}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.ghostCard}>
                <div className={styles.ghostLine} style={{ width: '70%' }} />
                <div className={styles.ghostLine} style={{ width: '90%' }} />
                <div className={styles.ghostLine} />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.previewOverlay} aria-label="Dashboard preview — complete setup to unlock">
          <div className={styles.previewOverlayIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div className={styles.previewOverlayText}>
            <strong>Your full dashboard is waiting</strong>
            <span>Complete the setup steps above to unlock everything</span>
          </div>
        </div>
      </div>

      {/* AI Coach CTA */}
      <div className={styles.aiCoachCta}>
        <div className={styles.aiCoachCtaText}>
          <h3>Have questions? Ask your AI Exit Coach.</h3>
          <p>Get instant answers about exit planning, business valuation, and how to improve your score — available 24/7.</p>
        </div>
        <Link href="/dashboard/coach" className={styles.btnCoachLight}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Open AI Coach
        </Link>
      </div>
    </div>
  )
}
