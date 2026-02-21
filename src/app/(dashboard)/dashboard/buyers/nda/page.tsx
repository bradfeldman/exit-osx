'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/buyers/buyers.module.css'

/* TODO: wire to API */

const NDA_ROWS = [
  {
    initials: 'SM',
    bg: 'linear-gradient(135deg, #1a1a2e, #3A3A3C)',
    name: 'ServiceMaster PE Group',
    type: 'Private Equity',
    status: 'executed',
    statusLabel: 'Executed',
    sent: 'Nov 28, 2024',
    executed: 'Nov 29, 2024',
    expiry: 'Nov 29, 2026',
    actions: ['view', 'renew'],
  },
  {
    initials: 'BC',
    bg: 'linear-gradient(135deg, var(--accent), #4DA3FF)',
    name: 'Brightcore Capital',
    type: 'Strategic Buyer',
    status: 'pending',
    statusLabel: 'Pending',
    sent: 'Dec 10, 2024',
    executed: '—',
    expiry: '—',
    actions: ['remind', 'view'],
  },
  {
    initials: 'GF',
    bg: 'linear-gradient(135deg, var(--green), #5DD57A)',
    name: 'Greg Forsythe',
    type: 'Individual Buyer',
    status: 'executed',
    statusLabel: 'Executed',
    sent: 'Oct 05, 2024',
    executed: 'Oct 06, 2024',
    expiry: 'Oct 06, 2026',
    actions: ['view', 'renew'],
  },
  {
    initials: 'MV',
    bg: 'linear-gradient(135deg, var(--purple), #C77DFF)',
    name: 'Madison Ventures',
    type: 'Family Office',
    status: 'expired',
    statusLabel: 'Expired',
    sent: 'Jun 12, 2024',
    executed: 'Jun 14, 2024',
    expiry: 'Jun 14, 2024',
    actions: ['renew', 'view'],
  },
  {
    initials: 'AP',
    bg: 'linear-gradient(135deg, var(--teal), #80D8F5)',
    name: 'Apex Partners LLC',
    type: 'Private Equity',
    status: 'pending',
    statusLabel: 'Pending',
    sent: 'Dec 18, 2024',
    executed: '—',
    expiry: '—',
    actions: ['remind', 'view'],
  },
]

type FilterType = 'all' | 'executed' | 'pending' | 'expired'

export default function BuyerNdaPage() {
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = filter === 'all' ? NDA_ROWS : NDA_ROWS.filter((r) => r.status === filter)

  const statusCounts = {
    executed: NDA_ROWS.filter((r) => r.status === 'executed').length,
    pending: NDA_ROWS.filter((r) => r.status === 'pending').length,
    expired: NDA_ROWS.filter((r) => r.status === 'expired').length,
  }
  const avgDays = 1.4

  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/buyers">Buyers</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>NDA Management</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>NDA Management</h1>
          <p>Reynolds HVAC Services — track confidentiality agreements with all prospective buyers</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
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
            Send NDA
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.ndaStatsRow}>
        <div className={styles.ndaStatCard}>
          <div className={styles.ndaStatLabel}>Executed NDAs</div>
          <div className={`${styles.ndaStatValue} ${styles.ndaStatValueGreen}`}>{statusCounts.executed}</div>
          <div className={styles.ndaStatDesc}>Active confidentiality agreements</div>
        </div>
        <div className={styles.ndaStatCard}>
          <div className={styles.ndaStatLabel}>Pending Signature</div>
          <div className={`${styles.ndaStatValue} ${styles.ndaStatValueOrange}`}>{statusCounts.pending}</div>
          <div className={styles.ndaStatDesc}>Awaiting buyer signature</div>
        </div>
        <div className={styles.ndaStatCard}>
          <div className={styles.ndaStatLabel}>Expired / Lapsed</div>
          <div className={`${styles.ndaStatValue} ${styles.ndaStatValueRed}`}>{statusCounts.expired}</div>
          <div className={styles.ndaStatDesc}>Need renewal before sharing</div>
        </div>
        <div className={styles.ndaStatCard}>
          <div className={styles.ndaStatLabel}>Avg. Days to Sign</div>
          <div className={`${styles.ndaStatValue} ${styles.ndaStatValueBlue}`}>{avgDays}</div>
          <div className={styles.ndaStatDesc}>Faster than industry avg (3.2 days)</div>
        </div>
      </div>

      {/* Data Room Banner */}
      <div className={styles.dataRoomBanner}>
        <div className={styles.dataRoomBannerIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </div>
        <div className={styles.dataRoomBannerText}>
          <div className={styles.dataRoomBannerTitle}>Data Room Access is NDA-Gated</div>
          <div className={styles.dataRoomBannerDesc}>Buyers must have an executed NDA before accessing your confidential documents. 2 buyers currently have data room access.</div>
        </div>
        <Link href="/dashboard/deal-room/data-room" className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: 12, padding: '7px 14px', whiteSpace: 'nowrap' }}>
          Manage Access
        </Link>
      </div>

      {/* NDA Table */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>All NDAs</div>
          <div className={styles.filterGroup}>
            {(['all', 'executed', 'pending', 'expired'] as FilterType[]).map((f) => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: 'capitalize' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className={styles.ndaTable}>
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Status</th>
                <th>Date Sent</th>
                <th>Executed</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i}>
                  <td>
                    <div className={styles.buyerCell}>
                      <div className={styles.buyerMiniAvatar} style={{ background: row.bg }}>
                        {row.initials}
                      </div>
                      <div>
                        <div className={styles.buyerMiniName}>{row.name}</div>
                        <div className={styles.buyerMiniType}>{row.type}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.statusBadgeNda} ${styles[`status${row.status.charAt(0).toUpperCase() + row.status.slice(1)}`]}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.sent}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.executed}</td>
                  <td style={{ color: row.status === 'expired' ? 'var(--red)' : 'var(--text-secondary)', fontWeight: row.status === 'expired' ? 600 : 400 }}>{row.expiry}</td>
                  <td className={styles.ndaActionsCell}>
                    {row.actions.includes('view') && (
                      <button className={styles.tblBtn}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View
                      </button>
                    )}
                    {row.actions.includes('remind') && (
                      <button className={`${styles.tblBtn} ${styles.tblBtnWarning}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81" />
                        </svg>
                        Remind
                      </button>
                    )}
                    {row.actions.includes('renew') && (
                      <button className={`${styles.tblBtn} ${row.status === 'expired' ? styles.tblBtnRenew : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                        </svg>
                        {row.status === 'expired' ? 'Renew' : 'Resend'}
                      </button>
                    )}
                    {row.status !== 'expired' && (
                      <button className={`${styles.tblBtn} ${styles.tblBtnDanger}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                        </svg>
                        Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NDA Template Section */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>NDA Template</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: 12, padding: '6px 14px' }}>Upload New Template</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: 12, padding: '6px 14px' }}>Edit Template</button>
          </div>
        </div>

        <div className={styles.templateGrid}>
          {/* Key Terms */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Key Terms</div>
            <div className={styles.termList}>
              {[
                { key: 'Agreement Type', value: 'Mutual NDA' },
                { key: 'Duration', value: '2 years from execution' },
                { key: 'Governing Law', value: 'State of Florida' },
                { key: 'Permitted Disclosures', value: 'Advisors, attorneys, lenders' },
                { key: 'Return of Materials', value: 'Required on termination' },
                { key: 'Injunctive Relief', value: 'Included' },
              ].map((term) => (
                <div key={term.key} className={styles.termRow}>
                  <span className={styles.termKey}>{term.key}</span>
                  <span className={styles.termValue}>{term.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Document Preview */}
          <div className={styles.docPreview}>
            <div className={styles.docPreviewHeader}>
              <div className={styles.docPreviewTitle}>Mutual Non-Disclosure Agreement</div>
              <div className={styles.docPreviewSubtitle}>Reynolds HVAC Services · Confidential</div>
            </div>
            <div className={`${styles.docLine} ${styles.docLineFull}`} />
            <div className={`${styles.docLine} ${styles.docLineMedium}`} />
            <div className={`${styles.docLine} ${styles.docLineFull}`} />
            <div className={`${styles.docLine} ${styles.docLineShort}`} />
            <div style={{ height: 12 }} />
            <div className={`${styles.docLine} ${styles.docLineFull}`} />
            <div className={`${styles.docLine} ${styles.docLineFull}`} />
            <div className={`${styles.docLine} ${styles.docLineMedium}`} />
            <div style={{ height: 12 }} />
            <div className={`${styles.docLine} ${styles.docLineFull}`} />
            <div className={`${styles.docLine} ${styles.docLineShort}`} />
            <div className={styles.docWatermark}>TEMPLATE</div>
          </div>
        </div>
      </div>
    </div>
  )
}
