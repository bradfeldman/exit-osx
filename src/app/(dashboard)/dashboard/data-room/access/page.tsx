'use client'

import Link from 'next/link'
import styles from '@/components/deal-room/deal-room.module.css'

// TODO: wire to API — GET /api/companies/[id]/data-room/access
const STATIC_DATA = {
  stats: [
    {
      icon: 'users',
      color: 'blue' as const,
      value: '3',
      label: 'Active Users',
      sub: '+1 pending invitation',
    },
    {
      icon: 'eye',
      color: 'green' as const,
      value: '147',
      label: 'Documents Viewed',
      sub: 'Across all users',
    },
    {
      icon: 'download',
      color: 'orange' as const,
      value: '23',
      label: 'Downloads',
      sub: 'All time',
    },
    {
      icon: 'clock',
      color: 'purple' as const,
      value: '2h ago',
      label: 'Last Activity',
      sub: 'Jennifer Walsh',
    },
  ],
  activeUsers: [
    {
      initials: 'JW',
      avatarColor: 'blue' as const,
      name: 'Jennifer Walsh',
      email: 'j.walsh@servicemaster.pe',
      org: 'ServiceMaster PE',
      roleTitle: 'Buyer',
      roleDetail: 'Lead contact',
      accessLevel: 'full' as const,
      accessLabel: 'Full Access',
      added: 'Jan 8, 2026',
      lastVisit: '2 hours ago',
      lastVisitClass: 'recent' as const,
    },
    {
      initials: 'TL',
      avatarColor: 'green' as const,
      name: 'Tom Liu',
      email: 'tom.liu@servicemaster.pe',
      org: 'ServiceMaster PE',
      roleTitle: 'Buyer',
      roleDetail: 'Technical DD',
      accessLevel: 'partial' as const,
      accessLabel: 'Financial + Ops',
      added: 'Jan 15, 2026',
      lastVisit: 'Yesterday',
      lastVisitClass: 'normal' as const,
    },
    {
      initials: 'JK',
      avatarColor: 'purple' as const,
      name: 'Jeff Kim',
      email: 'jeff@reynoldsadvisory.com',
      org: 'Reynolds Advisory',
      roleTitle: 'Broker',
      roleDetail: 'M&A Advisor',
      accessLevel: 'full' as const,
      accessLabel: 'Full Access',
      added: 'Dec 1, 2025',
      lastVisit: '3 days ago',
      lastVisitClass: 'normal' as const,
    },
  ],
  pendingInvitations: [
    {
      email: 'sarah.chen@comfortsystems.com',
      org: 'Comfort Systems USA',
      type: 'Prospective Buyer',
      sentDate: 'Feb 14, 2026',
      daysAgo: '4 days ago',
    },
  ],
  activityFeed: [
    { type: 'view' as const, user: 'Jennifer Walsh', action: 'viewed', doc: 'Employee Roster 2025.xlsx', time: '2 hours ago' },
    { type: 'download' as const, user: 'Tom Liu', action: 'downloaded', doc: '2025 Annual P&L Statement.pdf', time: 'Yesterday, 3:42 PM' },
    { type: 'view' as const, user: 'Jennifer Walsh', action: 'viewed', doc: 'Customer Concentration Analysis.pdf', time: 'Yesterday, 11:15 AM' },
    { type: 'download' as const, user: 'Jennifer Walsh', action: 'downloaded', doc: 'Articles of Incorporation.pdf', time: 'Feb 15, 2026, 9:08 AM' },
    { type: 'login' as const, user: 'Tom Liu', action: 'accessed the data room for the first time', doc: null, time: 'Feb 14, 2026, 2:31 PM' },
    { type: 'view' as const, user: 'Tom Liu', action: 'viewed', doc: 'Fleet & Equipment Schedule.xlsx', time: 'Feb 14, 2026, 2:45 PM' },
    { type: 'view' as const, user: 'Jeff Kim', action: 'viewed', doc: '2025 Annual P&L Statement.pdf', time: 'Feb 13, 2026, 10:22 AM' },
    { type: 'download' as const, user: 'Jeff Kim', action: 'downloaded', doc: 'EBITDA Adjustments.pdf', time: 'Feb 12, 2026, 4:17 PM' },
    { type: 'view' as const, user: 'Jennifer Walsh', action: 'viewed', doc: 'Top 20 Customer List.xlsx', time: 'Feb 12, 2026, 1:55 PM' },
    { type: 'share' as const, user: 'Mike Reynolds', action: 'added', doc: 'Jennifer Walsh', time: 'Jan 8, 2026, 9:00 AM', isShare: true },
  ],
  permissions: [
    {
      icon: 'check',
      iconClass: 'full' as const,
      name: 'Full Access',
      desc: 'All categories: financials, operations, legal, HR, customer data, and corporate documents.',
    },
    {
      icon: 'dollar',
      iconClass: 'fin' as const,
      name: 'Financial Only',
      desc: 'P&L, balance sheet, tax returns, EBITDA workpapers. Excludes HR, legal, and customer lists.',
    },
    {
      icon: 'monitor',
      iconClass: 'ops' as const,
      name: 'Operations Only',
      desc: 'Fleet schedules, equipment lists, employee roster, vendor contracts. Excludes financials and legal.',
    },
    {
      icon: 'file',
      iconClass: 'legal' as const,
      name: 'Legal Only',
      desc: 'Articles of incorporation, operating agreements, permits, and licenses. No financial or HR access.',
    },
  ],
  security: [
    { label: 'Watermarking', desc: 'All documents display viewer name and timestamp', type: 'toggle' as const, value: true, iconClass: 'on' as const },
    { label: 'Download Tracking', desc: 'Logs every file download with user identity', type: 'toggle' as const, value: true, iconClass: 'on' as const },
    { label: 'Screenshot Prevention', desc: 'Blocks screen capture in the online viewer', type: 'toggle' as const, value: true, iconClass: 'on' as const },
    { label: 'Link Expiration', desc: 'Access links auto-expire after set period', type: 'value' as const, value: '30 days', iconClass: 'neutral' as const },
  ],
}

function ActivityIcon({ type }: { type: 'view' | 'download' | 'login' | 'share' }) {
  if (type === 'view') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  )
  if (type === 'download') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
  )
  if (type === 'login') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
  )
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
  )
}

function PermissionIconSvg({ icon }: { icon: string }) {
  if (icon === 'check') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
  if (icon === 'dollar') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
  if (icon === 'monitor') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
}

function SecurityIconSvg({ label }: { label: string }) {
  if (label === 'Watermarking') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
  if (label === 'Download Tracking') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
  if (label === 'Screenshot Prevention') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
}

export default function AccessManagementPage() {
  const d = STATIC_DATA

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/data-room">Data Room</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
        <span>Access Management</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Access Management</h1>
          <p>Control who can view your Data Room and what they can see &mdash; Reynolds HVAC Services</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export Access Report
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Invite Someone
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.amStatsRow}>
        {d.stats.map((stat) => (
          <div key={stat.label} className={styles.amStatCard}>
            <div className={`${styles.amStatCardIcon} ${stat.color === 'blue' ? styles.amStatIconBlue : stat.color === 'green' ? styles.amStatIconGreen : stat.color === 'orange' ? styles.amStatIconOrange : styles.amStatIconPurple}`}>
              {stat.icon === 'users' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}
              {stat.icon === 'eye' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
              {stat.icon === 'download' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
              {stat.icon === 'clock' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
            </div>
            <div className={styles.amStatCardValue} style={stat.icon === 'clock' ? { fontSize: '20px', paddingTop: '4px' } : undefined}>{stat.value}</div>
            <div className={styles.amStatCardLabel}>{stat.label}</div>
            <div className={styles.amStatCardSub}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Active Access Table */}
      <div className={styles.card}>
        <div className={styles.amCardHeader}>
          <div>
            <div className={styles.amCardTitle}>Active Access</div>
            <div className={styles.amCardSubtitle}>{d.activeUsers.length} users with data room access</div>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Invite Someone
          </button>
        </div>
        <div className={styles.amTableWrap}>
          <table className={styles.amAccessTable}>
            <thead>
              <tr>
                <th>User</th>
                <th>Organization</th>
                <th>Role</th>
                <th>Access Level</th>
                <th>Added</th>
                <th>Last Visit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {d.activeUsers.map((user) => (
                <tr key={user.email}>
                  <td>
                    <div className={styles.amUserCell}>
                      <div className={`${styles.amUserAvatar} ${user.avatarColor === 'blue' ? styles.amAvatarBlue : user.avatarColor === 'green' ? styles.amAvatarGreen : styles.amAvatarPurple}`} aria-hidden="true">
                        {user.initials}
                      </div>
                      <div>
                        <div className={styles.amUserName}>{user.name}</div>
                        <div className={styles.amUserEmail}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.amOrgCell}>{user.org}</td>
                  <td>
                    <div className={styles.amRoleCell}>
                      <strong>{user.roleTitle}</strong>
                      {user.roleDetail}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.amAccessLevelPill} ${user.accessLevel === 'full' ? styles.amAccessFull : styles.amAccessPartial}`}>
                      {user.accessLevel === 'full' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                      )}
                      {user.accessLabel}
                    </span>
                  </td>
                  <td className={styles.amDateCell}>{user.added}</td>
                  <td className={`${styles.amLastVisitCell} ${user.lastVisitClass === 'recent' ? styles.amLastVisitRecent : styles.amLastVisitNormal}`}>
                    {user.lastVisit}
                  </td>
                  <td>
                    <span className={`${styles.amBadge} ${styles.amBadgeGreen}`}>
                      <span className={styles.amStatusDotActive} aria-hidden="true" />
                      Active
                    </span>
                  </td>
                  <td>
                    <div className={styles.amRowActions}>
                      <button className={`${styles.amBtnGhost} ${styles.btnSm}`} type="button">Edit</button>
                      <button className={`${styles.amBtnDangerGhost} ${styles.btnSm}`} type="button">Revoke</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      <div className={styles.card}>
        <div className={styles.amCardHeader}>
          <div>
            <div className={styles.amCardTitle}>Pending Invitations</div>
            <div className={styles.amCardSubtitle}>{d.pendingInvitations.length} invitation awaiting acceptance</div>
          </div>
        </div>
        <table className={styles.amPendingTable}>
          <tbody>
            {d.pendingInvitations.map((inv) => (
              <tr key={inv.email}>
                <td style={{ width: '50%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className={styles.amPendingAvatar} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                    <div>
                      <div className={styles.amPendingEmail}>{inv.email}</div>
                      <div className={styles.amPendingOrg}>{inv.org} &mdash; {inv.type}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`${styles.amBadge} ${styles.amBadgeOrange}`}>
                    <span className={styles.amStatusDotPending} aria-hidden="true" />
                    Pending
                  </span>
                </td>
                <td className={styles.amPendingSince}>Sent {inv.sentDate} &mdash; {inv.daysAgo}</td>
                <td style={{ textAlign: 'right' }}>
                  <div className={styles.amRowActions}>
                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                      Resend
                    </button>
                    <button className={`${styles.amBtnDangerGhost} ${styles.btnSm}`} type="button">Revoke</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Activity + Permissions + Security (two-column) */}
      <div className={styles.amTwoColGrid}>

        {/* Activity Feed */}
        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.amCardHeader}>
            <div>
              <div className={styles.amCardTitle}>Recent Activity</div>
              <div className={styles.amCardSubtitle}>Last 10 access events</div>
            </div>
          </div>
          <ul className={styles.amActivityList}>
            {d.activityFeed.map((event, i) => (
              <li key={i} className={styles.amActivityItem}>
                <div className={`${styles.amActivityIcon} ${event.type === 'view' ? styles.amActivityIconView : event.type === 'download' ? styles.amActivityIconDownload : event.type === 'login' ? styles.amActivityIconLogin : styles.amActivityIconShare}`}>
                  <ActivityIcon type={event.type} />
                </div>
                <div className={styles.amActivityBody}>
                  <div className={styles.amActivityText}>
                    <strong>{event.user}</strong>{' '}
                    {event.isShare
                      ? <>added <strong>{event.doc}</strong> to the data room</>
                      : event.doc
                        ? <>{event.action} <Link href="/dashboard/data-room/doc-1" className={styles.amDocLink}>{event.doc}</Link></>
                        : event.action
                    }
                  </div>
                  <div className={styles.amActivityTime}>{event.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right column: Permissions + Security stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Permission Levels */}
          <div className={styles.card} style={{ marginBottom: 0 }}>
            <div className={styles.amCardHeader}>
              <div>
                <div className={styles.amCardTitle}>Permission Levels</div>
                <div className={styles.amCardSubtitle}>What each access level includes</div>
              </div>
            </div>
            <div className={styles.amPermissionGrid}>
              {d.permissions.map((perm) => (
                <div key={perm.name} className={styles.amPermissionRow}>
                  <div className={`${styles.amPermissionIcon} ${perm.iconClass === 'full' ? styles.amPermIconFull : perm.iconClass === 'fin' ? styles.amPermIconFin : perm.iconClass === 'ops' ? styles.amPermIconOps : styles.amPermIconLegal}`}>
                    <PermissionIconSvg icon={perm.icon} />
                  </div>
                  <div>
                    <div className={styles.amPermissionName}>{perm.name}</div>
                    <div className={styles.amPermissionDesc}>{perm.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Settings */}
          <div className={styles.card} style={{ marginBottom: 0 }}>
            <div className={styles.amCardHeader}>
              <div>
                <div className={styles.amCardTitle}>Security Settings</div>
                <div className={styles.amCardSubtitle}>Active protections on your data room</div>
              </div>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">Manage</button>
            </div>
            <ul className={styles.amSecurityList}>
              {d.security.map((item) => (
                <li key={item.label} className={styles.amSecurityItem}>
                  <div className={styles.amSecurityItemLeft}>
                    <div className={`${styles.amSecurityItemIcon} ${item.iconClass === 'on' ? styles.amSecIconOn : styles.amSecIconNeutral}`}>
                      <SecurityIconSvg label={item.label} />
                    </div>
                    <div>
                      <div className={styles.amSecurityItemLabel}>{item.label}</div>
                      <div className={styles.amSecurityItemDesc}>{item.desc}</div>
                    </div>
                  </div>
                  {item.type === 'toggle' ? (
                    <div className={styles.amSecurityToggle}>
                      <div
                        className={styles.amToggleOn}
                        role="switch"
                        aria-checked="true"
                        aria-label={`${item.label} enabled`}
                        tabIndex={0}
                      />
                      <span style={{ color: 'var(--green)', fontSize: '12px', fontWeight: 600 }}>On</span>
                    </div>
                  ) : (
                    <span className={styles.amSecurityValue}>{item.value}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}
