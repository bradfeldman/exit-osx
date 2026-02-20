'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import styles from './sidebar.module.css'
import type { User } from '@supabase/supabase-js'

// ─── Navigation Structure ───────────────────────────────────────────────
// Matches mocksite sidebar exactly

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
  children?: { label: string; href: string }[]
}

interface NavSection {
  label?: string // section header (e.g. "Improve", "Sell")
  items: NavItem[]
}

// SVG icons matching mocksite feather-style icons
const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  valuation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  ),
  financials: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  assessments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  retirement: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10"/>
      <path d="M12 20V4"/>
      <path d="M6 20v-6"/>
    </svg>
  ),
  actionCenter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  signals: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  playbook: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  ),
  buyers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  dealRoom: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  dataRoom: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    </svg>
  ),
  aiCoach: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
}

const mainSection: NavSection = {
  items: [
    { label: 'Home', href: '/dashboard', icon: icons.home },
    {
      label: 'Valuation', href: '/dashboard/valuation', icon: icons.valuation,
      children: [
        { label: 'Multiples', href: '/dashboard/valuation/multiples' },
        { label: 'DCF Analysis', href: '/dashboard/valuation/dcf' },
        { label: 'Comparables', href: '/dashboard/valuation/comparables' },
        { label: 'History', href: '/dashboard/valuation/history' },
      ],
    },
    {
      label: 'Financials', href: '/dashboard/financials', icon: icons.financials,
      children: [
        { label: 'P&L Detail', href: '/dashboard/financials/pnl' },
        { label: 'Balance Sheet', href: '/dashboard/financials/balance-sheet' },
        { label: 'Cash Flow', href: '/dashboard/financials/cash-flow' },
        { label: 'EBITDA Adjustments', href: '/dashboard/financials/ebitda-adjustments' },
      ],
    },
    { label: 'Assessments', href: '/dashboard/assessments', icon: icons.assessments },
    { label: 'Retirement', href: '/dashboard/retirement', icon: icons.retirement },
  ],
}

const improveSection: NavSection = {
  label: 'Improve',
  items: [
    { label: 'Action Center', href: '/dashboard/action-center', icon: icons.actionCenter, badge: 0 },
    { label: 'Signals', href: '/dashboard/signals', icon: icons.signals },
    { label: 'Playbook', href: '/dashboard/playbook', icon: icons.playbook },
  ],
}

const sellSection: NavSection = {
  label: 'Sell',
  items: [
    { label: 'Buyers', href: '/dashboard/buyers', icon: icons.buyers },
    {
      label: 'Deal Room', href: '/dashboard/deal-room', icon: icons.dealRoom,
      children: [
        { label: 'LOI Review', href: '/dashboard/deal-room/loi-review' },
        { label: 'Due Diligence', href: '/dashboard/deal-room/due-diligence' },
        { label: 'Closing', href: '/dashboard/deal-room/closing' },
      ],
    },
    { label: 'Data Room', href: '/dashboard/data-room', icon: icons.dataRoom },
  ],
}

const bottomItems: NavItem[] = [
  { label: 'AI Coach', href: '/dashboard/coach', icon: icons.aiCoach },
  { label: 'Reports', href: '/dashboard/reports', icon: icons.reports },
  { label: 'Notifications', href: '/dashboard/notifications', icon: icons.notifications, badge: 0 },
  { label: 'Help', href: '/dashboard/help', icon: icons.help },
  { label: 'Settings', href: '/dashboard/settings', icon: icons.settings },
]

// ─── Sidebar Component ─────────────────────────────────────────────────

interface SidebarProps {
  user: User
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { companies, selectedCompanyId } = useCompany()
  const { planTier } = useSubscription()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Auto-expand parent items when a child route is active
  useEffect(() => {
    const newExpanded = new Set<string>()
    const allSections = [mainSection, improveSection, sellSection]
    for (const section of allSections) {
      for (const item of section.items) {
        if (item.children) {
          const isChildActive = item.children.some(child =>
            pathname === child.href || pathname.startsWith(child.href + '/')
          )
          const isParentActive = pathname === item.href || pathname.startsWith(item.href + '/')
          if (isChildActive || isParentActive) {
            newExpanded.add(item.href)
          }
        }
      }
    }
    setExpandedItems(newExpanded)
  }, [pathname])

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const toggleExpand = useCallback((href: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(href)) {
        next.delete(href)
      } else {
        next.add(href)
      }
      return next
    })
  }, [])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleLinkClick = () => {
    // Close drawer on mobile when a link is clicked
    onClose?.()
  }

  // User display
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const planLabel = planTier === 'growth' ? 'Growth Plan' : planTier === 'deal-room' ? 'Deal Room Plan' : 'Foundation Plan'

  // TODO: Fetch action/notification counts from API
  const actionCount = 0
  const notificationCount = 0

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.href)
    const badge = item.label === 'Action Center' ? actionCount : item.label === 'Notifications' ? notificationCount : item.badge

    if (hasChildren) {
      return (
        <li key={item.href} className={`${styles.navParent} ${isExpanded ? styles.expanded : ''}`}>
          <a
            href={item.href}
            className={`${styles.navLink} ${active ? styles.active : ''}`}
            onClick={(e) => {
              e.preventDefault()
              toggleExpand(item.href)
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            <span className={styles.navToggle}>{icons.chevron}</span>
          </a>
          <ul className={styles.subNav}>
            {item.children!.map(child => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className={`${styles.subNavLink} ${isActive(child.href) ? styles.active : ''}`}
                  onClick={handleLinkClick}
                >
                  {child.label}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      )
    }

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={`${styles.navLink} ${active ? styles.active : ''}`}
          onClick={handleLinkClick}
        >
          {item.icon}
          <span>{item.label}</span>
          {badge !== undefined && badge > 0 && (
            <span className={styles.badge}>{badge}</span>
          )}
        </Link>
      </li>
    )
  }

  const renderSection = (section: NavSection) => (
    <div key={section.label || 'main'} className={styles.sidebarSection}>
      {section.label && (
        <div className={styles.sidebarSectionLabel}>{section.label}</div>
      )}
      <ul className={styles.sidebarNav}>
        {section.items.map(renderNavItem)}
      </ul>
    </div>
  )

  const sidebarContent = (
    <nav
      id="main-sidebar"
      className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <a href="https://exitosx.com" target="_blank" rel="noopener noreferrer" className={styles.sidebarLogo}>
        <svg viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#0071E3"/>
          <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={styles.sidebarLogoText}>Exit OS</span>
      </a>

      {/* Main navigation sections */}
      {renderSection(mainSection)}
      {renderSection(improveSection)}
      {renderSection(sellSection)}

      {/* Bottom section */}
      <div className={styles.sidebarBottom}>
        <ul className={`${styles.sidebarNav} ${styles.sidebarBottomNav}`}>
          {bottomItems.map(renderNavItem)}
        </ul>

        {/* User profile */}
        <Link href="/dashboard/settings" className={styles.sidebarUser} onClick={handleLinkClick}>
          <div className={styles.sidebarAvatar}>{userInitials}</div>
          <div className={styles.sidebarUserInfo}>
            <div className={styles.sidebarUserName}>{userName}</div>
            <div className={styles.sidebarUserPlan}>{planLabel}</div>
          </div>
        </Link>
      </div>
    </nav>
  )

  return sidebarContent
}

// ─── Mobile Header ──────────────────────────────────────────────────────

export function MobileHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <header className={styles.mobileHeader}>
      <button
        className={styles.mobileHamburger}
        aria-label="Open navigation"
        onClick={onMenuToggle}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <Link href="/dashboard" className={styles.mobileLogo}>
        <svg viewBox="0 0 32 32" fill="none" style={{ width: '24px', height: '24px' }}>
          <rect width="32" height="32" rx="8" fill="#0071E3"/>
          <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Exit OS</span>
      </Link>
      <div className={styles.mobileSpacer} />
    </header>
  )
}

// ─── Drawer Overlay ─────────────────────────────────────────────────────

export function DrawerOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <div
      className={`${styles.drawerOverlay} ${isOpen ? styles.open : ''}`}
      onClick={onClose}
      aria-hidden="true"
    />
  )
}
