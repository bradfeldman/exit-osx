'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/notifications/notifications.module.css'

// ── Types ───────────────────────────────────────────────────────────────────

type NotifIconColor = 'iconGreen' | 'iconOrange' | 'iconPurple' | 'iconAccent' | 'iconGray' | 'iconTeal' | 'iconRed'
type FilterTab = 'all' | 'unread' | 'signals' | 'tasks' | 'buyers' | 'system'

interface Notification {
  id: string
  title: string
  desc: string
  time: string
  href: string
  iconColor: NotifIconColor
  icon: React.ReactNode
  action?: string
  unread?: boolean
  category: FilterTab
}

// ── Static Demo Data ────────────────────────────────────────────────────────

const NOTIFICATIONS: Record<string, Notification[]> = {
  Today: [
    {
      id: '1',
      title: 'LOI received from ServiceMaster PE',
      desc: 'A Letter of Intent has been submitted for review. The offer is at 4.4x adjusted EBITDA ($8.8M). Review the terms and consider your counter-offer strategy.',
      time: '9:42 AM',
      href: '/dashboard/deal-room',
      iconColor: 'iconGreen',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
      action: 'Review LOI',
      unread: true,
      category: 'buyers',
    },
    {
      id: '2',
      title: 'Customer concentration increased to 34%',
      desc: 'Your top customer (Henderson Properties) now accounts for 34% of trailing revenue, up from 29% last quarter. This is above the 30% threshold that concerns buyers.',
      time: '8:15 AM',
      href: '/dashboard/signals',
      iconColor: 'iconOrange',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
      action: 'View Signal',
      unread: true,
      category: 'signals',
    },
    {
      id: '3',
      title: 'ServiceMaster PE viewed your Data Room',
      desc: 'ServiceMaster PE accessed 12 documents in your Data Room including financial statements, customer contracts, and employee agreements.',
      time: '7:30 AM',
      href: '/dashboard/data-room',
      iconColor: 'iconPurple',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
      action: 'View Activity',
      unread: true,
      category: 'buyers',
    },
    {
      id: '4',
      title: 'Overdue: Document key customer relationships',
      desc: 'This task was due 3 days ago. Documenting your top 10 customer relationships will help reduce owner dependence and improve buyer confidence.',
      time: '7:00 AM',
      href: '/dashboard/action-center',
      iconColor: 'iconAccent',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      action: 'Open Task',
      unread: true,
      category: 'tasks',
    },
  ],
  Yesterday: [
    {
      id: '5',
      title: 'BRI score improved from 68 to 71',
      desc: 'Your Business Readiness Index went up 3 points after completing the financial documentation task and updating your employee handbook.',
      time: '4:30 PM',
      href: '/dashboard',
      iconColor: 'iconGreen',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
      action: 'View Score',
      category: 'signals',
    },
    {
      id: '6',
      title: 'QuickBooks sync completed',
      desc: 'January 2026 financial data has been synced successfully. Revenue: $612K, EBITDA: $178K. All accounts reconciled.',
      time: '2:00 PM',
      href: '/dashboard/financials',
      iconColor: 'iconGray',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
      category: 'system',
    },
    {
      id: '7',
      title: 'New buyer match: Comfort Systems USA',
      desc: 'A new strategic buyer has been identified with a 78% match score based on your industry, size, and geographic criteria.',
      time: '11:15 AM',
      href: '/dashboard/buyers',
      iconColor: 'iconPurple',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
      action: 'View Buyer',
      category: 'buyers',
    },
  ],
  'This Week': [
    {
      id: '8',
      title: 'Your weekly progress report is ready',
      desc: 'Week of Feb 10-16: 3 tasks completed, 2 signals detected, BRI up 3 points. You\u2019re on track for your Q1 milestones.',
      time: 'Feb 16, 9:00 AM',
      href: '/dashboard/reports',
      iconColor: 'iconTeal',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
      action: 'View Report',
      category: 'system',
    },
    {
      id: '9',
      title: 'Task completed: Update employee handbook',
      desc: 'Great work! This improves your HR documentation score. Your next priority task is documenting customer relationships.',
      time: 'Feb 15, 3:45 PM',
      href: '/dashboard/action-center',
      iconColor: 'iconGreen',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
      category: 'tasks',
    },
    {
      id: '10',
      title: 'Revenue growth slowing: 8% vs 12% target',
      desc: 'Trailing 12-month revenue growth has decelerated to 8%, below your 12% target. Seasonal adjustment suggests recovery in Q2.',
      time: 'Feb 14, 10:30 AM',
      href: '/dashboard/signals',
      iconColor: 'iconOrange',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
      action: 'View Signal',
      category: 'signals',
    },
    {
      id: '11',
      title: 'Data Room: 3 documents expiring soon',
      desc: 'Your insurance certificate, vehicle fleet lease, and fire inspection report will expire within 30 days. Upload updated versions to keep your Data Room current.',
      time: 'Feb 13, 2:15 PM',
      href: '/dashboard/data-room',
      iconColor: 'iconGray',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
      category: 'system',
    },
  ],
  Earlier: [
    {
      id: '12',
      title: 'Playbook: Phase 1 milestone reached',
      desc: 'You\u2019ve completed 8 of 10 Phase 1 tasks in your exit playbook. Two remaining: customer documentation and management team assessment.',
      time: 'Feb 10, 11:00 AM',
      href: '/dashboard/playbook',
      iconColor: 'iconAccent',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
      category: 'tasks',
    },
    {
      id: '13',
      title: 'Owner dependence score dropped to 42',
      desc: 'Your owner dependence dimension decreased 3 points after assessment reassessment. Key driver: all major customer relationships still flow through you directly.',
      time: 'Feb 8, 9:30 AM',
      href: '/dashboard/assessments',
      iconColor: 'iconRed',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
      action: 'View Assessment',
      category: 'signals',
    },
    {
      id: '14',
      title: 'Account upgraded to Professional Plan',
      desc: 'Your plan has been upgraded. You now have access to AI Coach, advanced analytics, buyer matching, and unlimited data room storage.',
      time: 'Feb 5, 10:00 AM',
      href: '/dashboard/settings',
      iconColor: 'iconGray',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
      category: 'system',
    },
  ],
}

const FILTER_TABS: { key: FilterTab; label: string; count?: number }[] = [
  { key: 'all', label: 'All', count: 14 },
  { key: 'unread', label: 'Unread', count: 5 },
  { key: 'signals', label: 'Signals' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'buyers', label: 'Buyers' },
  { key: 'system', label: 'System' },
]

// ── Page Component ──────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const allNotifications = Object.values(NOTIFICATIONS).flat()
  const unreadCount = allNotifications.filter((n) => n.unread).length

  function filterNotifications(notifications: Notification[]) {
    if (activeTab === 'all') return notifications
    if (activeTab === 'unread') return notifications.filter((n) => n.unread)
    return notifications.filter((n) => n.category === activeTab)
  }

  return (
    <>
      <TrackPageView page="notifications" />

      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.bellIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </div>
          <div className={styles.topBarTitle}>
            <h1>Notifications</h1>
            <p>{unreadCount} unread notifications</p>
          </div>
        </div>
        <div className={styles.topBarRight}>
          <button className={styles.markReadBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Mark all as read
          </button>
          <Link href="/dashboard/settings" className={styles.iconBtn} title="Notification Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ padding: '24px 0 0' }}>
        <div className={styles.filterTabs}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.filterTab} ${activeTab === tab.key ? styles.filterTabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={styles.tabCount}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Notification Groups */}
        {Object.entries(NOTIFICATIONS).map(([dateLabel, notifications]) => {
          const filtered = filterNotifications(notifications)
          if (filtered.length === 0) return null
          return (
            <div key={dateLabel} className={styles.dateGroup}>
              <div className={styles.dateLabel}>{dateLabel}</div>
              {filtered.map((notif) => (
                <Link
                  key={notif.id}
                  href={notif.href}
                  className={`${styles.notification} ${notif.unread ? styles.notificationUnread : ''}`}
                >
                  <div className={`${styles.notifIcon} ${styles[notif.iconColor]}`}>
                    {notif.icon}
                  </div>
                  <div className={styles.notifBody}>
                    <div className={`${styles.notifTitle} ${notif.unread ? styles.notifTitleUnread : ''}`}>
                      {notif.title}
                    </div>
                    <div className={styles.notifDesc}>{notif.desc}</div>
                    <div className={styles.notifTime}>{notif.time}</div>
                  </div>
                  <div className={styles.notifRight}>
                    {notif.action && (
                      <span className={styles.notifAction}>{notif.action}</span>
                    )}
                    {notif.unread && <div className={styles.unreadDot} />}
                  </div>
                </Link>
              ))}
            </div>
          )
        })}
      </div>
    </>
  )
}
