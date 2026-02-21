'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/retirement/retirement.module.css'

// TODO: wire to API — fetch non-compete terms, checklist progress, timeline phase from company data

const WEALTH_CHECKLIST = [
  { label: 'Wealth advisor selection', done: true },
  { label: 'Pre-close tax planning', done: true },
  { label: 'Investment policy statement', done: false },
  { label: 'Asset allocation plan', done: false },
  { label: 'Tax-loss harvesting setup', done: false },
  { label: 'Estate plan update', done: false },
  { label: 'Charitable giving strategy', done: false },
  { label: 'Insurance coverage review', done: false },
]

const IDENTITY_PROMPTS = [
  '"What did you love most about running your business?"',
  '"What are you most looking forward to not doing?"',
  '"What would you do if money wasn\'t a factor?"',
  '"Who are you when you\'re not the owner?"',
]

const TIME_TOGGLES = [
  { label: 'Board / advisory positions', on: true },
  { label: 'Mentoring other founders', on: true },
  { label: 'New venture exploration', on: false },
  { label: 'Travel & personal goals', on: true },
  { label: 'Community involvement', on: false },
]

const NONCOMPETE_CAN = [
  'Invest in other HVAC businesses (passive)',
  'Start or join a business in a different industry',
  'Consult for companies outside the geographic area',
  'Sit on boards and advisory councils',
  'Teach, speak, or mentor in the trades',
]

const NONCOMPETE_CANT = [
  'Operate or own an HVAC company within 75 miles',
  'Solicit former employees to leave the business',
  'Solicit former customers for competing services',
  'Use trade secrets or confidential information',
]

const TIMELINE_PHASES = [
  {
    dot: 'past',
    label: 'Months 1–3',
    title: 'Transition Period',
    desc: "You're still involved — knowledge transfer, customer introductions, staff handoff. You have a role and a reason to show up.",
    note: 'What to expect: Busy, purposeful, almost like nothing changed.',
  },
  {
    dot: 'current',
    dotLabel: 'NOW',
    label: 'Months 3–6',
    title: 'The Identity Gap',
    desc: "The transition ends, and the structure disappears. This is when most founders struggle. The calls stop. The decisions aren't yours. You're not sure what you are.",
    note: 'What to expect: Restlessness, unexpected grief, a need for new anchors. This is normal — and it passes.',
  },
  {
    dot: 'future',
    dotLabel: '3',
    label: 'Months 6–12',
    title: 'New Normal',
    desc: 'Routines start forming. New projects take shape. The freedom that felt strange begins to feel like opportunity.',
    note: 'What to expect: Growing clarity, early signs of a new identity, better sleep.',
  },
  {
    dot: 'future',
    dotLabel: '4',
    label: 'Year 2+',
    title: 'Next Chapter',
    desc: 'Many founders report this as the best period of their lives. Full ownership of your time, financial security, and the wisdom of what you built.',
    note: 'What to expect: Purpose on your own terms. This is what you planned for.',
  },
]

const RESOURCES = [
  { icon: 'article', title: "The Founder's Guide to Life After Exit", sub: 'Article · 12 min read' },
  { icon: 'download', title: 'Finding Purpose After Selling: A 90-Day Framework', sub: 'Downloadable PDF · Free' },
  { icon: 'community', title: "Connect with Other Founders Who've Sold", sub: 'Community · 400+ members' },
  { icon: 'support', title: 'When to Seek Professional Support', sub: 'Guide to therapists who specialize in entrepreneurial transitions' },
]

const PARTNER_CHANGES = [
  'Daily routine and schedule',
  'Income source (salary → investment income)',
  "Mike's professional identity",
  'Social circle and peer group',
]

const PARTNER_STABLE = [
  'Financial security (if planned well)',
  'Your relationship',
  "Mike's skills and experience",
  'Family values and priorities',
]

export default function PostExitPage() {
  const [toggles, setToggles] = useState(TIME_TOGGLES.map((t) => t.on))

  const doneCount = WEALTH_CHECKLIST.filter((i) => i.done).length

  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard">Home</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Life After Exit</span>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px', marginBottom: 4 }}>Life After Exit</h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)' }}>Planning your next chapter</p>
      </div>

      {/* Hero Banner — dark purple gradient */}
      <div className={styles.heroBanner}>
        <div className={styles.heroBannerEyebrow}>The Question Nobody Asks Until It&apos;s Too Late</div>
        <div className={styles.heroBannerHeadline}>The deal closes. The wire hits. Then what?</div>
        <div className={styles.heroBannerSub}>
          Most founders describe the first 6 months after selling as the hardest transition of their lives. The loss of identity, routine, and purpose hits harder than anyone expects. Exit OS helps you plan for what comes next &mdash; before closing day.
        </div>
      </div>

      {/* Three Pillars Grid */}
      <div className={styles.pillarsGrid}>

        {/* Wealth Preservation */}
        <div className={`${styles.card} ${styles.pillarCard}`}>
          <div className={`${styles.pillarIconWrap} ${styles.pillarIconGreen}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className={`${styles.pillarTitle} ${styles.pillarTitleGreen}`}>Wealth Preservation</div>
          <div className={styles.pillarDesc}>
            Your $5.9M in proceeds needs a plan before closing day. Money without a strategy disappears faster than you expect.
          </div>
          <div className={styles.checklist}>
            {WEALTH_CHECKLIST.map((item) => (
              <div key={item.label} className={`${styles.checklistItem} ${item.done ? styles.checklistItemDone : ''}`}>
                <div className={`${styles.checkBox} ${item.done ? styles.checkBoxDone : ''}`}>
                  {item.done && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                {item.label}
              </div>
            ))}
          </div>
          <div className={styles.checklistProgress}>{doneCount} of {WEALTH_CHECKLIST.length} items complete</div>
          <a href="#" className={styles.pillarLink}>Work with your wealth advisor &rarr;</a>
        </div>

        {/* Identity Transition */}
        <div className={`${styles.card} ${styles.pillarCard}`}>
          <div className={`${styles.pillarIconWrap} ${styles.pillarIconPurple}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>
          <div className={`${styles.pillarTitle} ${styles.pillarTitlePurple}`}>Identity Transition</div>
          <div className={styles.pillarDesc}>
            You&apos;ve been &quot;Mike the HVAC guy&quot; for 22 years. Who are you next? This is the part nobody prepares for.
          </div>
          <div className={styles.prompts}>
            {IDENTITY_PROMPTS.map((p) => (
              <div key={p} className={styles.promptCard}>{p}</div>
            ))}
          </div>
          <a href="#" className={styles.pillarLink}>Explore the Founder Transition Guide &rarr;</a>
        </div>

        {/* Structured Time */}
        <div className={`${styles.card} ${styles.pillarCard}`}>
          <div className={`${styles.pillarIconWrap} ${styles.pillarIconTeal}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className={`${styles.pillarTitle} ${styles.pillarTitleTeal}`}>Structured Time</div>
          <div className={styles.pillarDesc}>
            The #1 mistake: no plan for Tuesday morning. Structure doesn&apos;t disappear when the business does &mdash; you have to build it yourself.
          </div>
          <div className={styles.toggleItems}>
            {TIME_TOGGLES.map((item, idx) => (
              <div key={item.label} className={styles.toggleItem}>
                <span className={styles.toggleLabel}>{item.label}</span>
                <button
                  aria-label={`Toggle ${item.label}`}
                  role="switch"
                  aria-checked={toggles[idx]}
                  onClick={() => setToggles((prev) => prev.map((v, i) => (i === idx ? !v : v)))}
                  className={`${styles.toggleSwitch} ${toggles[idx] ? styles.toggleSwitchOn : ''}`}
                />
              </div>
            ))}
          </div>
          <a href="#" className={styles.pillarLink}>Build your post-exit calendar &rarr;</a>
        </div>

      </div>

      {/* Non-Compete Reality */}
      <div className={`${styles.card} ${styles.noncompeteCard}`}>
        <div className={styles.noncompeteHeader}>
          <div className={styles.noncompeteBadge}>Non-Compete</div>
          <div className={styles.noncompeteTerm}>5 years &nbsp;&middot;&nbsp; 75-mile radius &nbsp;&middot;&nbsp; HVAC services</div>
        </div>
        <div className={styles.noncompeteCols}>
          {/* Can do */}
          <div>
            <div className={`${styles.noncompeteColLabel} ${styles.noncompeteColLabelCan}`}>What you CAN do</div>
            <div className={styles.noncompeteList}>
              {NONCOMPETE_CAN.map((item) => (
                <div key={item} className={`${styles.noncompeteListItem} ${styles.noncompeteListItemCan}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
          {/* Cannot do */}
          <div>
            <div className={`${styles.noncompeteColLabel} ${styles.noncompeteColLabelCant}`}>What you CANNOT do</div>
            <div className={styles.noncompeteList}>
              {NONCOMPETE_CANT.map((item) => (
                <div key={item} className={`${styles.noncompeteListItem} ${styles.noncompeteListItemCant}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.noncompeteEnd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--text-muted)' }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Non-compete ends: <strong>&nbsp;April 2031</strong>
        </div>
        <div className={styles.coachNote}>
          <div className={styles.coachNoteIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'white' }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div className={styles.coachNoteText}>
            Many founders find the non-compete more emotionally constraining than expected. The geography and industry limits feel abstract until you have a new idea you can&apos;t pursue. Having a clear plan for what you <em>will</em> do is more important than knowing what you can&apos;t.
          </div>
        </div>
      </div>

      {/* Transition Timeline */}
      <div className={styles.card} style={{ marginBottom: 20 }}>
        <div className={styles.cardLabel}>Transition Timeline</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>What to expect after closing</div>
        <div className={styles.postExitTimeline}>
          {TIMELINE_PHASES.map((phase) => (
            <div key={phase.title} className={styles.timelinePhase}>
              <div className={
                phase.dot === 'past'
                  ? `${styles.timelinePhaseDot} ${styles.timelinePhaseDotPast}`
                  : phase.dot === 'current'
                    ? `${styles.timelinePhaseDot} ${styles.timelinePhaseDotCurrent}`
                    : `${styles.timelinePhaseDot} ${styles.timelinePhaseDotFuture}`
              }>
                {phase.dot === 'past' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{phase.dotLabel}</span>
                )}
              </div>
              <div className={styles.timelinePhaseContent}>
                <div className={
                  phase.dot === 'past'
                    ? `${styles.timelinePhaseLabel} ${styles.timelinePhaseLabelPast}`
                    : phase.dot === 'current'
                      ? `${styles.timelinePhaseLabel} ${styles.timelinePhaseLabelCurrent}`
                      : styles.timelinePhaseLabel
                }>{phase.label}</div>
                <div className={styles.timelinePhaseTitle}>{phase.title}</div>
                <div className={styles.timelinePhaseDesc}>{phase.desc}</div>
                <div className={styles.timelinePhaseNote}>{phase.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className={styles.card} style={{ marginBottom: 20 }}>
        <div className={styles.cardLabel}>Resources</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Curated for founders who&apos;ve sold</div>
        <div className={styles.resourcesList}>
          {RESOURCES.map((r) => (
            <a key={r.title} href="#" className={styles.resourceItem}>
              <div className={`${styles.resourceIcon} ${
                r.icon === 'article' ? styles.resourceIconArticle
                  : r.icon === 'download' ? styles.resourceIconDownload
                    : r.icon === 'community' ? styles.resourceIconCommunity
                      : styles.resourceIconSupport
              }`}>
                {r.icon === 'article' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                )}
                {r.icon === 'download' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
                {r.icon === 'community' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                )}
                {r.icon === 'support' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                )}
              </div>
              <div className={styles.resourceText}>
                <div className={styles.resourceTitle}>{r.title}</div>
                <div className={styles.resourceSubtitle}>{r.sub}</div>
              </div>
              <div className={styles.resourceArrow}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Partner / Spouse Card */}
      <div className={`${styles.card} ${styles.partnerCard}`}>
        <div className={styles.partnerHeader}>
          <div className={styles.partnerIconWrap}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </div>
          <div>
            <div className={styles.partnerTitle}>Share this with your partner</div>
          </div>
        </div>
        <div className={styles.partnerSubtitle}>
          Selling your business affects your whole family. A spouse who understands the numbers and the timeline makes every phase of this transition easier.
        </div>

        <div className={styles.partnerFacts}>
          <div className={styles.partnerFact}>
            <span className={styles.partnerFactLabel}>Net proceeds</span>
            <span className={styles.partnerFactValue}>$5.9M &rarr; invested at 5% = ~$295K annual income</span>
          </div>
          <div className={styles.partnerFact}>
            <span className={styles.partnerFactLabel}>Timeline</span>
            <span className={styles.partnerFactValue}>Closing in ~3 months, transition period 6&ndash;12 months</span>
          </div>
        </div>

        <div className={styles.partnerChangeGrid}>
          <div className={`${styles.changesCol}`}>
            <div className={`${styles.partnerChangeColLabel} ${styles.partnerChangeColLabelChanges}`}>What Changes</div>
            {PARTNER_CHANGES.map((item) => (
              <div key={item} className={styles.partnerChangeItem}>{item}</div>
            ))}
          </div>
          <div className={`${styles.stableCol}`}>
            <div className={`${styles.partnerChangeColLabel} ${styles.partnerChangeColLabelStable}`}>What Doesn&apos;t Change</div>
            {PARTNER_STABLE.map((item) => (
              <div key={item} className={styles.partnerChangeItem}>{item}</div>
            ))}
          </div>
        </div>

        <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share with Lisa
        </button>
      </div>
    </div>
  )
}
