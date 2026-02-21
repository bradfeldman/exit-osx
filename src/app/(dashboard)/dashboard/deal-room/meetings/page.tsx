'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/deal-room/deal-room.module.css'

/* TODO: wire to API */

const PAST_MEETINGS = [
  {
    id: 1,
    date: 'Dec 18, 2024',
    duration: '60 min',
    title: 'ServiceMaster PE — LOI Discussion',
    attendees: 'Mark Chen, Sarah Reynolds (Advisor), You',
    org: 'ServiceMaster PE',
    type: 'Negotiation',
    dotAccent: true,
    notes: 'Discussed LOI terms in detail. Mark confirmed they have flexibility on the seller note duration. Agreed to push close timeline to Q2 2025. Action: counter with 7.0x EBITDA and 30-month note.',
  },
  {
    id: 2,
    date: 'Dec 10, 2024',
    duration: '30 min',
    title: 'Brightcore Capital — Preliminary Call',
    attendees: 'David Park (Brightcore), Sarah Reynolds (Advisor)',
    org: 'Brightcore Capital',
    type: 'Intro Call',
    dotAccent: false,
    notes: 'David expressed strong strategic interest — wants to integrate our commercial HVAC capabilities into their portfolio. Submitted LOI at $7.5M. Earnout structure is concerning — need to push back.',
  },
  {
    id: 3,
    date: 'Nov 28, 2024',
    duration: '45 min',
    title: 'ServiceMaster PE — Management Presentation',
    attendees: 'Mark Chen, Jennifer Wu (ServiceMaster), You, Sarah Reynolds (Advisor)',
    org: 'ServiceMaster PE',
    type: 'Presentation',
    dotAccent: true,
    notes: 'Full management presentation completed. They toured the facility and met the operations team. Very positive reaction to our service contract renewal rates. Mark indicated they would submit LOI within 2 weeks.',
  },
  {
    id: 4,
    date: 'Nov 14, 2024',
    duration: '45 min',
    title: 'ServiceMaster PE — Initial Introduction',
    attendees: 'Mark Chen (ServiceMaster), You',
    org: 'ServiceMaster PE',
    type: 'Intro Call',
    dotAccent: false,
    notes: 'First call initiated via M&A advisor referral. Covered company overview, deal timeline, and seller goals. Mark is very interested in the recurring revenue model. Agreed to send blind teaser.',
  },
  {
    id: 5,
    date: 'Nov 02, 2024',
    duration: '30 min',
    title: 'Greg Forsythe — Initial Call',
    attendees: 'Greg Forsythe, Sarah Reynolds (Advisor)',
    org: 'Individual Buyer',
    type: 'Intro Call',
    dotAccent: false,
    notes: 'Greg is a former HVAC business owner looking to re-enter via acquisition. Has financing pre-approval from First National. Lower offer but very motivated. Sent teaser doc.',
  },
]

const AGENDA_ITEMS = [
  'Review ServiceMaster PE counter-offer response (7.0x EBITDA)',
  'Discuss earnout structure with Brightcore — ask for no-earnout revision',
  'Timeline alignment — confirm Q2 2025 close is feasible with both PE buyers',
  'Data room completeness check — 4 documents still pending upload',
]

export default function MeetingLogPage() {
  const [expandedIds, setExpandedIds] = useState<number[]>([1])

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/deal-room">Deal Room</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Meeting Log</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Meeting Log</h1>
          <p>Reynolds HVAC Services — all buyer meetings and calls</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log Meeting
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.meetingStatsRow}>
        {[
          { num: '5', label: 'Total Meetings' },
          { num: '3', label: 'Unique Buyers' },
          { num: '3.5h', label: 'Total Time' },
          { num: '1', label: 'Upcoming' },
        ].map((stat) => (
          <div key={stat.label} className={styles.meetingStatCard}>
            <div className={styles.meetingStatNum}>{stat.num}</div>
            <div className={styles.meetingStatLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* AI Meeting Prep Card */}
      <div className={styles.prepCard}>
        <div className={styles.prepHeader}>
          <div className={styles.prepIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div>
            <div className={styles.prepTitle}>AI Meeting Prep — Next Meeting</div>
            <div className={styles.prepSubtitle}>Dec 23, 2024 · ServiceMaster PE Counter Discussion</div>
          </div>
        </div>
        <ul className={styles.agendaList}>
          {AGENDA_ITEMS.map((item, i) => (
            <li key={i} className={styles.agendaItem}>
              <span className={styles.agendaNum}>{i + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Upcoming Meeting Card */}
      <div className={styles.upcomingCard}>
        <div className={styles.upcomingHeader}>
          <span className={styles.upcomingBadge}>Upcoming</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>In 3 days</span>
        </div>
        <div className={styles.upcomingMeetingRow}>
          <div className={styles.upcomingDateBlock}>
            <div className={styles.upcomingDateMonth}>DEC</div>
            <div className={styles.upcomingDateDay}>23</div>
            <div className={styles.upcomingDateDow}>Mon</div>
          </div>
          <div className={styles.upcomingInfo}>
            <div className={styles.upcomingTitle}>ServiceMaster PE — Counter Offer Discussion</div>
            <div className={styles.upcomingMeta}>
              2:00 PM EST · 60 min · Zoom<br />
              Mark Chen (ServiceMaster), Sarah Reynolds (Advisor), You
            </div>
          </div>
          <div className={styles.upcomingActions}>
            <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Join Zoom
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
              View Prep
            </button>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className={styles.sectionHeader} style={{ marginBottom: 16 }}>
        <div className={styles.sectionTitle}>Past Meetings</div>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{PAST_MEETINGS.length} meetings</span>
      </div>

      {/* Meeting Timeline */}
      <div className={styles.meetingTimeline}>
        {PAST_MEETINGS.map((meeting) => {
          const isOpen = expandedIds.includes(meeting.id)
          return (
            <div key={meeting.id} className={styles.meetingEntry}>
              <div className={`${styles.meetingDot} ${meeting.dotAccent ? styles.meetingDotAccent : ''}`}>
                {meeting.dotAccent && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>

              <div className={styles.meetingCard}>
                {/* Card Header (clickable) */}
                <button
                  className={styles.meetingCardHeader}
                  onClick={() => toggleExpand(meeting.id)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  aria-expanded={isOpen}
                >
                  <div className={styles.meetingDateCol}>
                    <div className={styles.meetingDate}>{meeting.date}</div>
                    <span className={styles.meetingDurationPill}>{meeting.duration}</span>
                  </div>
                  <div className={styles.meetingCardMain}>
                    <div className={styles.meetingTitleCol}>
                      <div className={styles.meetingTitle}>{meeting.title}</div>
                      <div className={styles.meetingAttendees}>{meeting.attendees}</div>
                    </div>
                    <span className={styles.meetingOrgPill}>{meeting.org}</span>
                    <span className={styles.meetingTypePill}>{meeting.type}</span>
                    <div className={`${styles.expandIcon} ${isOpen ? styles.expandIconOpen : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expandable Notes */}
                {isOpen && (
                  <div className={styles.meetingNotes}>
                    <div className={styles.meetingNotesLabel}>Meeting Notes</div>
                    <div className={styles.meetingNotesText}>{meeting.notes}</div>
                    <div className={styles.meetingNotesActions}>
                      <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>Edit Notes</button>
                      <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        Create Action
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
