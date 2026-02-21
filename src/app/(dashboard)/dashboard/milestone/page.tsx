'use client'

import Link from 'next/link'
import styles from '@/components/milestones/milestones.module.css'

// ─── Confetti config ──────────────────────────────────────────────────────────
// 20 pieces matching mocksite nth-child definitions exactly

interface ConfettiPiece {
  left: string
  color: string
  width: number
  height: number
  duration: string
  delay: string
  borderRadius?: string
}

const CONFETTI_PIECES: ConfettiPiece[] = [
  { left: '5%',  color: '#AF52DE', width: 10, height: 6,  duration: '4.2s', delay: '0s' },
  { left: '12%', color: '#FFD60A', width: 6,  height: 10, duration: '3.8s', delay: '0.3s' },
  { left: '20%', color: '#34C759', width: 8,  height: 8,  duration: '4.5s', delay: '0.7s',  borderRadius: '50%' },
  { left: '28%', color: '#0071E3', width: 10, height: 5,  duration: '3.6s', delay: '0.1s' },
  { left: '38%', color: '#FFD60A', width: 6,  height: 6,  duration: '4.9s', delay: '0.5s',  borderRadius: '50%' },
  { left: '46%', color: '#AF52DE', width: 9,  height: 5,  duration: '3.4s', delay: '0.9s' },
  { left: '55%', color: '#34C759', width: 7,  height: 9,  duration: '4.7s', delay: '0.2s' },
  { left: '63%', color: '#FFD60A', width: 10, height: 6,  duration: '3.9s', delay: '0.6s' },
  { left: '71%', color: '#0071E3', width: 6,  height: 8,  duration: '4.3s', delay: '0.4s',  borderRadius: '50%' },
  { left: '80%', color: '#AF52DE', width: 8,  height: 6,  duration: '3.7s', delay: '0.8s' },
  { left: '88%', color: '#34C759', width: 6,  height: 10, duration: '4.1s', delay: '0.15s' },
  { left: '95%', color: '#FFD60A', width: 9,  height: 7,  duration: '4.6s', delay: '0.55s' },
  { left: '8%',  color: '#0071E3', width: 5,  height: 9,  duration: '5.2s', delay: '1.1s' },
  { left: '33%', color: '#34C759', width: 8,  height: 5,  duration: '3.3s', delay: '1.4s',  borderRadius: '50%' },
  { left: '50%', color: '#AF52DE', width: 7,  height: 7,  duration: '4.8s', delay: '1.0s' },
  { left: '75%', color: '#FFD60A', width: 6,  height: 6,  duration: '3.5s', delay: '0.75s', borderRadius: '50%' },
  { left: '17%', color: '#AF52DE', width: 9,  height: 6,  duration: '4.4s', delay: '1.6s' },
  { left: '43%', color: '#FFD60A', width: 7,  height: 8,  duration: '3.2s', delay: '1.8s' },
  { left: '67%', color: '#34C759', width: 10, height: 5,  duration: '5.0s', delay: '1.2s' },
  { left: '91%', color: '#0071E3', width: 6,  height: 9,  duration: '4.0s', delay: '1.3s',  borderRadius: '50%' },
]

// Checkmark SVG (reused in timeline dots)
function CheckSVG({ size = 3 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={size} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// Chevron right
function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MilestonePage() {
  return (
    /*
     * Full-screen overlay: fixed-position layer that covers the entire viewport,
     * escaping the DashboardShell's main content area (margin-left: 260px,
     * padding: 32px 40px). We use position: fixed with inset: 0 and z-index
     * high enough to sit above the sidebar.
     */
    <div className={styles.fullScreenOverlay}>

      {/* ── Confetti layer ── */}
      <div className={styles.confettiLayer} aria-hidden="true">
        {CONFETTI_PIECES.map((piece, i) => (
          <div
            key={i}
            className={styles.confettiPiece}
            style={{
              left: piece.left,
              top: '-20px',
              width: piece.width,
              height: piece.height,
              background: piece.color,
              borderRadius: piece.borderRadius ?? '2px',
              animationDuration: piece.duration,
              animationDelay: piece.delay,
            }}
          />
        ))}
      </div>

      {/* ── Main overlay panel ── */}
      <div className={styles.overlay}>

        {/* Checkmark */}
        <div className={styles.checkmarkWrap}>
          <div className={styles.checkmarkCircle}>
            <CheckSVG size={3} />
          </div>
          <div className={styles.pulseRing} aria-hidden="true" />
        </div>

        {/* Score transition */}
        <div className={styles.scoreTransition}>
          <div className={styles.scoreRow}>
            <span className={styles.scoreOld}>67</span>
            <span className={styles.scoreArrow}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
            <span className={styles.scoreNew}>71</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className={styles.milestoneHeadline}>Your BRI just crossed 70!</h1>
        <p className={styles.milestoneSub}>
          You&rsquo;ve moved from <strong>&ldquo;Needs Work&rdquo;</strong> to{' '}
          <strong>&ldquo;Moderately Ready&rdquo;</strong>
        </p>

        {/* ── Card 1: What This Means ── */}
        <div className={styles.celCard} style={{ animationDelay: '1.1s' }}>
          <div className={styles.celCardLabel}>What This Means</div>
          <div className={styles.celCardTitle}>A BRI above 70 unlocks a new tier</div>
          <div className={styles.meansList}>
            <div className={styles.meansItem}>
              Buyers will view your business as a credible acquisition target
            </div>
            <div className={styles.meansItem}>
              Your valuation multiple typically increases by 0.2x&ndash;0.4x at this threshold
            </div>
            <div className={styles.meansItem}>
              You&rsquo;ve completed more preparation than 70% of businesses that go to market
            </div>
          </div>
        </div>

        {/* ── Card 2: Impact on Your Numbers ── */}
        <div className={styles.celCard} style={{ animationDelay: '1.25s' }}>
          <div className={styles.celCardLabel}>Impact on Your Numbers</div>
          <div className={styles.impactRow}>
            <div className={styles.impactStat}>
              <div className={styles.impactStatLabel}>BRI Score</div>
              <div className={`${styles.impactStatValue} ${styles.impactStatValueGreen}`}>
                67 &rarr; 71
              </div>
            </div>
            <div className={styles.impactStat}>
              <div className={styles.impactStatLabel}>Retirement Funded</div>
              <div className={styles.impactStatValue}>70% &rarr; 72%</div>
            </div>
          </div>
          <div className={styles.impactValuation}>
            <div className={styles.impactValuationLabel}>Estimated valuation impact</div>
            <div className={styles.impactValuationValue}>+$160K &ndash; $320K</div>
          </div>
        </div>

        {/* ── Card 3: Journey So Far ── */}
        <div className={styles.celCard} style={{ animationDelay: '1.4s' }}>
          <div className={styles.celCardLabel}>Your Journey So Far</div>
          <div className={styles.journeyTimeline}>

            {/* Past milestone 1 */}
            <div className={styles.journeyItem}>
              <div className={`${styles.journeyDotIndicator} ${styles.dotPast}`} aria-hidden="true">
                <CheckSVG size={3} />
              </div>
              <div className={styles.journeyContent}>
                <div className={styles.journeyDate}>Sep 15, 2025</div>
                <div className={styles.journeyLabel}>Started at BRI 45</div>
              </div>
            </div>
            <div className={styles.journeyLine} aria-hidden="true" />

            {/* Past milestone 2 */}
            <div className={styles.journeyItem}>
              <div className={`${styles.journeyDotIndicator} ${styles.dotPast}`} aria-hidden="true">
                <CheckSVG size={3} />
              </div>
              <div className={styles.journeyContent}>
                <div className={styles.journeyDate}>Oct 8, 2025</div>
                <div className={styles.journeyLabel}>Crossed 50 &mdash; &ldquo;Getting Started&rdquo;</div>
              </div>
            </div>
            <div className={styles.journeyLine} aria-hidden="true" />

            {/* Past milestone 3 */}
            <div className={styles.journeyItem}>
              <div className={`${styles.journeyDotIndicator} ${styles.dotPast}`} aria-hidden="true">
                <CheckSVG size={3} />
              </div>
              <div className={styles.journeyContent}>
                <div className={styles.journeyDate}>Nov 22, 2025</div>
                <div className={styles.journeyLabel}>Crossed 60 &mdash; &ldquo;Making Progress&rdquo;</div>
              </div>
            </div>
            <div className={styles.journeyLine} aria-hidden="true" />

            {/* NOW milestone */}
            <div className={styles.journeyItem}>
              <div className={`${styles.journeyDotIndicator} ${styles.dotNow}`} aria-hidden="true">
                <CheckSVG size={3} />
              </div>
              <div className={styles.journeyContent}>
                <div className={styles.journeyDate}>Today &mdash; Feb 20, 2026</div>
                <div className={`${styles.journeyLabel} ${styles.journeyLabelNow}`}>
                  Crossed 70 &mdash; &ldquo;Moderately Ready&rdquo;
                </div>
              </div>
            </div>
            <div className={styles.journeyLine} aria-hidden="true" />

            {/* Next milestone */}
            <div className={styles.journeyItem}>
              <div className={`${styles.journeyDotIndicator} ${styles.dotNext}`} aria-label="Next milestone">
                80
              </div>
              <div className={styles.journeyContent}>
                <div className={styles.journeyDate}>Next milestone</div>
                <div className={`${styles.journeyLabel} ${styles.journeyLabelNext}`}>
                  BRI 80 &mdash; &ldquo;Highly Ready&rdquo;
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Share row ── */}
        <div className={styles.shareRow}>
          <button className={styles.shareBtn} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download achievement card
          </button>
          <button className={styles.shareBtn} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Share with your advisor
          </button>
        </div>

        {/* ── Next steps ── */}
        <div className={styles.nextSteps}>
          <div className={styles.nextStepsTitle}>What to focus on next</div>
          <p className={styles.nextStepsText}>
            Your weakest factor is still{' '}
            <strong>Owner Dependence (42/100)</strong>. Improving this to 60+ could push your BRI
            above 80 &mdash; and add an estimated $400K&ndash;$800K to your valuation.
          </p>
          <Link href="/dashboard/action-center" className={styles.btnNextPrimary}>
            Keep going &mdash; view your next priority
            <ChevronRight />
          </Link>
          <Link href="/dashboard" className={styles.btnNextSecondary}>
            Return to dashboard
          </Link>
        </div>

        {/* ── Next milestone hint ── */}
        <p className={styles.nextMilestoneHint}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Next milestone: BRI 80 &mdash; &ldquo;Highly Ready&rdquo; &nbsp;&middot;&nbsp; 9 points to go
        </p>

      </div>
    </div>
  )
}
