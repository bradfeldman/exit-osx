'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/settings/settings.module.css'

// TODO: wire to API — fetch current team members + submit invitation

type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'advisor'

const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: 'owner', label: 'Owner', desc: 'Full access including billing and company deletion' },
  { id: 'admin', label: 'Admin', desc: 'Full access except billing and company deletion' },
  { id: 'member', label: 'Member', desc: 'Can view and edit most data, cannot change settings' },
  { id: 'viewer', label: 'Viewer', desc: 'Read-only access to all shared data' },
  { id: 'advisor', label: 'Advisor', desc: 'External advisor — limited read access to key reports' },
]

const PERMISSIONS_TABLE: { feature: string; owner: boolean; admin: boolean; member: boolean; viewer: boolean; advisor: boolean }[] = [
  { feature: 'View Valuation', owner: true, admin: true, member: true, viewer: true, advisor: true },
  { feature: 'Edit Financials', owner: true, admin: true, member: true, viewer: false, advisor: false },
  { feature: 'View Deal Room', owner: true, admin: true, member: true, viewer: true, advisor: true },
  { feature: 'Manage Buyers', owner: true, admin: true, member: true, viewer: false, advisor: false },
  { feature: 'Run Assessments', owner: true, admin: true, member: true, viewer: false, advisor: false },
  { feature: 'Manage Team', owner: true, admin: true, member: false, viewer: false, advisor: false },
  { feature: 'Billing & Plans', owner: true, admin: false, member: false, viewer: false, advisor: false },
  { feature: 'Delete Company', owner: true, admin: false, member: false, viewer: false, advisor: false },
]

const CURRENT_TEAM = [
  { name: 'Sarah Chen', email: 'sarah@acmecorp.com', role: 'Owner', color: 'linear-gradient(135deg, #0071E3, #AF52DE)', initials: 'SC' },
  { name: 'Marcus Webb', email: 'marcus@acmecorp.com', role: 'Admin', color: 'linear-gradient(135deg, #34C759, #0071E3)', initials: 'MW' },
  { name: 'Julie Park', email: 'julie.park@advisors.com', role: 'Advisor', color: 'linear-gradient(135deg, #FF9500, #AF52DE)', initials: 'JP' },
]

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ width: 14, height: 14 }}>
    <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const XIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ width: 12, height: 12, color: 'var(--text-tertiary)', opacity: 0.4 }}>
    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export default function InviteTeamPage() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role>('member')
  const [note, setNote] = useState('')

  // TODO: wire to API — POST /api/invites with { email, firstName, lastName, role, note }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Sending invitation:', { email, firstName, lastName, role: selectedRole, note })
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
        <Link href="/dashboard/settings" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Settings</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }} aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <Link href="/dashboard/settings?tab=team" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Team</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }} aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Invite Member</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28, alignItems: 'start' }}>
        {/* Main form column */}
        <main>
          <form onSubmit={handleSubmit} noValidate>
            {/* Contact info */}
            <div className={styles.settingsSection}>
              <h2>Contact Information</h2>
              <p className={styles.sectionDesc}>Enter the email address of the person you'd like to invite.</p>

              <div className={styles.formGroupSpaced}>
                <label className={styles.formLabel} htmlFor="invite-email">Email Address *</label>
                <input
                  id="invite-email"
                  type="email"
                  className={styles.formInput}
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formRow2}>
                <div>
                  <label className={styles.formLabel} htmlFor="invite-first">First Name</label>
                  <input
                    id="invite-first"
                    type="text"
                    className={styles.formInput}
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.formLabel} htmlFor="invite-last">Last Name</label>
                  <input
                    id="invite-last"
                    type="text"
                    className={styles.formInput}
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Role selection */}
            <div className={styles.settingsSection}>
              <h2>Assign Role</h2>
              <p className={styles.sectionDesc}>Choose the level of access this person should have.</p>

              <div
                role="radiogroup"
                aria-label="Select role"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}
              >
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    role="radio"
                    aria-checked={selectedRole === role.id}
                    onClick={() => setSelectedRole(role.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '14px 10px',
                      border: `2px solid ${selectedRole === role.id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      background: selectedRole === role.id ? 'var(--accent-light)' : 'var(--surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: selectedRole === role.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {role.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                      {role.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions table */}
            <div className={styles.settingsSection}>
              <h2>Role Permissions</h2>
              <p className={styles.sectionDesc}>What the <strong>{ROLES.find(r => r.id === selectedRole)?.label}</strong> role can access.</p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 14px', background: 'var(--surface-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Feature
                      </th>
                      {ROLES.map((r) => (
                        <th
                          key={r.id}
                          style={{
                            padding: '8px 14px',
                            background: r.id === selectedRole ? 'var(--accent-light)' : 'var(--surface-secondary)',
                            borderBottom: '1px solid var(--border)',
                            color: r.id === selectedRole ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: r.id === selectedRole ? 700 : 600,
                            fontSize: 12,
                            textAlign: 'center',
                          }}
                        >
                          {r.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS_TABLE.map((row) => (
                      <tr key={row.feature}>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                          {row.feature}
                        </td>
                        {(['owner', 'admin', 'member', 'viewer', 'advisor'] as Role[]).map((r) => (
                          <td
                            key={r}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid var(--border-light)',
                              textAlign: 'center',
                              color: row[r] ? 'var(--green)' : undefined,
                              background: r === selectedRole ? 'rgba(0,113,227,0.03)' : undefined,
                            }}
                          >
                            {row[r] ? <CheckIcon /> : <XIcon />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Personal note */}
            <div className={styles.settingsSection}>
              <h2>Personal Note</h2>
              <p className={styles.sectionDesc}>Optionally add a note to your invitation email.</p>

              <div className={styles.formGroupSpaced}>
                <label className={styles.formLabel} htmlFor="invite-note">Message (optional)</label>
                <textarea
                  id="invite-note"
                  className={styles.formTextarea}
                  placeholder="Hi! I'd like to invite you to collaborate on our exit planning in Exit OSx..."
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ minHeight: 100 }}
                />
                <p className={styles.infoHint}>{note.length}/500 characters</p>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.formActions}>
              <Link href="/dashboard/settings?tab=team" className={styles.btnSecondary}>
                Cancel
              </Link>
              <button type="submit" className={styles.btnPrimary}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 16, height: 16 }}>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Send Invitation
              </button>
            </div>
          </form>
        </main>

        {/* Sidebar */}
        <aside>
          {/* Current team */}
          <div className={styles.settingsSection} style={{ marginBottom: 16 }}>
            <h2>Current Team</h2>
            <p className={styles.sectionDesc}>{CURRENT_TEAM.length} members</p>
            {CURRENT_TEAM.map((member) => (
              <div key={member.email} className={styles.teamRow}>
                <div
                  className={styles.teamAvatar}
                  style={{ background: member.color }}
                  aria-hidden="true"
                >
                  {member.initials}
                </div>
                <div className={styles.teamInfo}>
                  <div className={styles.teamName}>{member.name}</div>
                  <div className={styles.teamEmail}>{member.email}</div>
                </div>
                <span className={`${styles.teamRoleBadge} ${member.role === 'Owner' ? styles.teamRoleBadgeOwner : ''}`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>

          {/* Pending invitations */}
          <div className={styles.settingsSection} style={{ marginBottom: 16 }}>
            <h2>Pending Invitations</h2>
            <div className={styles.emptyState}>
              <p>No pending invitations</p>
            </div>
          </div>

          {/* Info callout */}
          <div style={{ padding: 16, background: 'var(--accent-light)', border: '1px solid rgba(0,113,227,0.15)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ display: 'block', color: 'var(--accent)', marginBottom: 6, fontSize: 13 }}>
              About invitations
            </strong>
            Invitations expire after 7 days. If your contact doesn't receive the email, ask them to check their spam folder or contact support.
          </div>
        </aside>
      </div>
    </div>
  )
}
