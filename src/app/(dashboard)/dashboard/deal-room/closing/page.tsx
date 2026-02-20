'use client'

import Link from 'next/link'
import styles from '@/components/deal-room/deal-room.module.css'
import { TrackPageView } from '@/components/tracking/TrackPageView'

// ── Types ────────────────────────────────────────────────────────────────────

type CheckState = 'done' | 'prog' | 'none' | 'locked'

interface CheckItem {
  name: string
  state: CheckState
  note?: string
  noteType?: 'coach' | 'inprog'
  date?: string
  dateDone?: boolean
  milestone?: boolean
  celebrate?: boolean
}

interface PhaseGroup {
  num: number
  name: string
  state: 'done' | 'current' | 'locked'
  prog: string
  barPct?: number
  items: CheckItem[]
}

// ── Data ─────────────────────────────────────────────────────────────────────

const PHASE_GROUPS: PhaseGroup[] = [
  {
    num: 3,
    name: 'Purchase Agreement',
    state: 'current',
    prog: '4 of 7 complete — current phase',
    barPct: 57,
    items: [
      { name: 'Receive draft purchase agreement from buyer\'s counsel', state: 'done', date: 'Completed Feb 10', dateDone: true },
      { name: 'Initial review with your attorney', state: 'done', date: 'Completed Feb 14', dateDone: true },
      { name: 'Identify key negotiation points', state: 'done', date: 'Completed Feb 16', dateDone: true },
      { name: 'First redline submitted to buyer\'s counsel', state: 'done', date: 'Completed Feb 18', dateDone: true },
      { name: 'Negotiate representations & warranties', state: 'prog', note: 'Your attorney reviewing seller reps — call scheduled Feb 19', noteType: 'inprog' },
      { name: 'Finalize non-compete terms', state: 'none', note: 'AI Coach: Standard for HVAC is 3–5 years, 50-mile radius. ServiceMaster is requesting 5 years / 75 miles — there is room to negotiate.', noteType: 'coach' },
      { name: 'Agree on working capital target & peg', state: 'none' },
      { name: 'Execute final purchase agreement', state: 'none', milestone: true },
    ],
  },
  {
    num: 4,
    name: 'Regulatory & Approvals',
    state: 'locked',
    prog: '0 of 4 complete',
    items: [
      { name: 'Landlord consent to lease assignment (if applicable)', state: 'locked' },
      { name: 'License & permit transfer applications filed', state: 'locked' },
      { name: 'Employee notification plan (WARN Act review)', state: 'locked' },
      { name: 'Customer & vendor notification plan drafted', state: 'locked' },
    ],
  },
  {
    num: 5,
    name: 'Escrow & Funding',
    state: 'locked',
    prog: '0 of 4 complete',
    items: [
      { name: 'Escrow agreement executed', state: 'locked' },
      { name: 'Buyer provides proof of funds', state: 'locked' },
      { name: 'Title & asset transfer documents prepared', state: 'locked' },
      { name: 'Final closing statement reviewed & approved', state: 'locked' },
    ],
  },
  {
    num: 6,
    name: 'Close',
    state: 'locked',
    prog: 'Target: April 15, 2026',
    items: [
      { name: 'Closing meeting scheduled with all parties', state: 'locked' },
      { name: 'Wire transfer confirmed & funds received', state: 'locked' },
      { name: 'Transition period begins', state: 'locked' },
      { name: 'Congratulations — you\'ve exited!', state: 'none', celebrate: true },
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckIcon({ state }: { state: CheckState }) {
  if (state === 'done') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (state === 'prog') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
      </svg>
    )
  }
  return null
}

function CheckBoxEl({ state }: { state: CheckState }) {
  const cls = `${styles.checkBox} ${
    state === 'done' ? styles.checkBoxDone :
    state === 'prog' ? styles.checkBoxProg :
    state === 'none' ? styles.checkBoxNone :
    styles.checkBoxLocked
  }`
  return (
    <div className={cls}>
      <CheckIcon state={state} />
    </div>
  )
}

function CheckItemRow({ item }: { item: CheckItem }) {
  if (item.celebrate) {
    return (
      <div className={`${styles.checkItem} ${styles.checkItemCelebrate}`}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--green-light)', border: '2px dashed var(--green)', flexShrink: 0, marginTop: 1 }} />
        <div className={styles.checkBody}>
          <div className={styles.celebrateName}>{item.name}</div>
          <div className={styles.celebrateNote}>Reynolds HVAC Services successfully sold. Time to celebrate.</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.checkItem}>
      <CheckBoxEl state={item.state} />
      <div className={styles.checkBody}>
        <div className={`${styles.checkName} ${item.state === 'done' ? styles.checkNameDone : ''}`}>
          {item.name}
        </div>
        {item.note && (
          <div className={`${styles.checkNote} ${item.noteType === 'coach' ? styles.checkNoteCoach : item.noteType === 'inprog' ? styles.checkNoteInprog : ''}`}>
            {item.note}
          </div>
        )}
        {item.date && (
          <div className={`${styles.checkDate} ${item.dateDone ? styles.checkDateDone : ''}`}>
            {item.date}
          </div>
        )}
        {item.milestone && (
          <div className={styles.milestoneTag}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Milestone
          </div>
        )}
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClosingChecklistPage() {
  return (
    <>
      <TrackPageView page="deal-room-closing" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/deal-room">Deal Room</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <Link href="/dashboard/deal-room">ServiceMaster PE</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Closing</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Closing Checklist</h1>
          <p>Target close: April 15, 2026</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Timeline
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Schedule Closing Meeting
          </button>
        </div>
      </div>

      {/* Timeline Hero */}
      <div className={styles.timelineHero}>
        <div className={styles.tlHeader}>
          <div className={styles.tlCountdown}>
            <span className={styles.tlDays}>56</span>
            <span className={styles.tlDaysLabel}>days to target close</span>
          </div>
          <span className={styles.tlTarget}>Target: April 15, 2026</span>
        </div>

        {/* Phase Strip */}
        <div className={styles.phaseStrip}>

          {/* Phase 1: LOI Signed — done */}
          <div className={`${styles.phStep} ${styles.phStepDone}`}>
            <div className={styles.phDotRow}>
              <div className={styles.phLine} style={{ visibility: 'hidden' }} />
              <div className={styles.phDot}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className={`${styles.phLine} ${styles.phLineDone}`} />
            </div>
            <div className={styles.phLabel}>LOI Signed</div>
            <div className={styles.phPct}>Jan 5</div>
          </div>

          {/* Phase 2: DD Complete — done */}
          <div className={`${styles.phStep} ${styles.phStepDone}`}>
            <div className={styles.phDotRow}>
              <div className={`${styles.phLine} ${styles.phLineDone}`} />
              <div className={styles.phDot}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className={`${styles.phLine} ${styles.phLinePartial}`} />
            </div>
            <div className={styles.phLabel}>DD Complete</div>
            <div className={styles.phPct}>Mar 1</div>
          </div>

          {/* Phase 3: Purchase Agreement — current */}
          <div className={`${styles.phStep} ${styles.phStepCurrent}`}>
            <div className={styles.phDotRow}>
              <div className={`${styles.phLine} ${styles.phLinePartial}`} />
              <div className={styles.phDot}>3</div>
              <div className={styles.phLine} />
            </div>
            <div className={styles.phLabel}>Purchase Agreement</div>
            <div className={styles.phPct}>60% done</div>
          </div>

          {/* Phase 4: Regulatory */}
          <div className={styles.phStep}>
            <div className={styles.phDotRow}>
              <div className={styles.phLine} />
              <div className={styles.phDot}>4</div>
              <div className={styles.phLine} />
            </div>
            <div className={styles.phLabel}>Regulatory</div>
            <div className={styles.phPct}>Not started</div>
          </div>

          {/* Phase 5: Escrow & Funding */}
          <div className={styles.phStep}>
            <div className={styles.phDotRow}>
              <div className={styles.phLine} />
              <div className={styles.phDot}>5</div>
              <div className={styles.phLine} />
            </div>
            <div className={styles.phLabel}>Escrow &amp; Funding</div>
            <div className={styles.phPct}>Not started</div>
          </div>

          {/* Phase 6: Close */}
          <div className={styles.phStep}>
            <div className={styles.phDotRow}>
              <div className={styles.phLine} />
              <div className={styles.phDot}>6</div>
              <div className={styles.phLine} style={{ visibility: 'hidden' }} />
            </div>
            <div className={styles.phLabel}>Close</div>
            <div className={styles.phPct}>Apr 15</div>
          </div>

        </div>
      </div>

      {/* Current Phase Detail Bar */}
      <div className={styles.phaseDetailBar}>
        <div className={styles.pdbIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <div className={styles.pdbInfo}>
          <div className={styles.pdbPhase}>Current Phase: Purchase Agreement</div>
          <div className={styles.pdbProgress}>4 of 7 items complete &mdash; Deadline March 20, 2026</div>
        </div>
        <div className={styles.pdbBarWrap}>
          <div className={styles.pdbBarTrack}>
            <div className={styles.pdbBarFill} />
          </div>
        </div>
        <span className={styles.pdbDeadline}>Due Mar 20</span>
      </div>

      {/* Two-column layout */}
      <div className={styles.twoCol}>
        <div>

          {/* AI Coach */}
          <div className={styles.coachCard}>
            <div className={styles.coachIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <div className={styles.coachEyebrow}>AI Coach Insight</div>
              <div className={styles.coachText}>
                The most common closing delay for HVAC businesses is <strong>landlord consent</strong> &mdash; start this process now even though it&apos;s in a later phase. It typically takes 2&ndash;3 weeks and buyers won&apos;t close without it.
              </div>
            </div>
          </div>

          {/* Phase Groups */}
          {PHASE_GROUPS.map((group) => (
            <div
              key={group.num}
              className={`${styles.phaseGroup} ${group.state === 'locked' ? styles.phaseGroupLocked : ''}`}
            >
              <div className={`${styles.phaseGroupHead} ${group.state === 'current' ? styles.phaseGroupHeadCurrent : ''}`}>
                <div className={styles.pghLeft}>
                  <div className={`${styles.phaseNum} ${group.state === 'done' ? styles.phaseNumDone : group.state === 'current' ? styles.phaseNumCurrent : ''}`}>
                    {group.state === 'done' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : group.num}
                  </div>
                  <div>
                    <div className={styles.phaseName}>{group.name}</div>
                    <div className={styles.phaseProg}>{group.prog}</div>
                  </div>
                </div>
                <div className={styles.pghRight}>
                  {group.state === 'locked' ? (
                    <div className={styles.lockIcon}><LockIcon /></div>
                  ) : group.barPct !== undefined ? (
                    <>
                      <div className={styles.phaseBarTrack}>
                        <div
                          className={`${styles.phaseBarFill} ${group.state === 'done' ? styles.pfGreen : styles.pfAccent}`}
                          style={{ width: `${group.barPct}%` }}
                        />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: group.state === 'done' ? 'var(--green)' : 'var(--accent)' }}>
                        {group.barPct}%
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {group.items.map((item, i) => (
                <CheckItemRow key={i} item={item} />
              ))}
            </div>
          ))}

        </div>

        {/* Right Panel */}
        <div className={styles.panelCol}>

          {/* Your Team */}
          <div className={styles.panelCard}>
            <div className={styles.panelTitle}>Your Team</div>

            <div className={styles.teamSection}>
              <div className={styles.teamSectionLabel}>Seller&apos;s Side</div>
              {[
                { initials: 'JW', name: 'Jennifer Walsh', role: "Attorney — Walsh & Partners", color: 'var(--teal)' },
                { initials: 'SC', name: 'Sarah Chen', role: "CPA — Chen & Associates", color: 'var(--orange)' },
                { initials: 'TB', name: 'Tom Brooks', role: "M&A Advisor — Brooks Capital", color: 'var(--purple)' },
              ].map((m) => (
                <div key={m.initials} className={styles.teamMember}>
                  <div className={styles.tmAvatar} style={{ background: m.color }}>{m.initials}</div>
                  <div>
                    <div className={styles.tmName}>{m.name}</div>
                    <div className={styles.tmRole}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.teamSection}>
              <div className={styles.teamSectionLabel}>Buyer&apos;s Side</div>
              {[
                { initials: 'JM', name: 'James Morrison', role: "VP Acquisitions, ServiceMaster PE", color: '#3A3A3C' },
                { initials: 'DK', name: 'David Kim', role: "Buyer's Counsel — Kim & Lee LLP", color: '#1D1D1F' },
              ].map((m) => (
                <div key={m.initials} className={styles.teamMember}>
                  <div className={styles.tmAvatar} style={{ background: m.color }}>{m.initials}</div>
                  <div>
                    <div className={styles.tmName}>{m.name}</div>
                    <div className={styles.tmRole}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Dates */}
          <div className={styles.panelCard}>
            <div className={styles.panelTitle}>Key Dates</div>
            <div className={styles.keyDates}>
              <div className={styles.kdRow}>
                <span className={styles.kdLabel}>LOI signed</span>
                <span className={`${styles.kdVal} ${styles.kdValDone}`}>Jan 5, 2026</span>
              </div>
              <div className={styles.kdRow}>
                <span className={styles.kdLabel}>DD target</span>
                <span className={`${styles.kdVal} ${styles.kdValDone}`}>Mar 1, 2026</span>
              </div>
              <div className={styles.kdRow}>
                <span className={styles.kdLabel}>PA target</span>
                <span className={`${styles.kdVal} ${styles.kdValUpcoming}`}>Mar 20, 2026</span>
              </div>
              <div className={styles.kdRow}>
                <span className={styles.kdLabel}>Close target</span>
                <span className={`${styles.kdVal} ${styles.kdValUpcoming}`}>Apr 15, 2026</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.panelCard}>
            <div className={styles.panelTitle}>Quick Actions</div>
            <div className={styles.panelActions}>
              <button className={`${styles.panelBtn} ${styles.panelBtnPrimary}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                Message Your Attorney
              </button>
              <button className={styles.panelBtn}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Schedule Closing Meeting
              </button>
              <button className={styles.panelBtn}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Timeline
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
