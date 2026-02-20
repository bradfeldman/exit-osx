'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Building,
  Building2,
  Activity,
  Ticket,
  Home,
  LogOut,
  Shield,
  ChevronDown,
  Calculator,
  Scale,
  Camera,
  TrendingUp,
  ListTodo,
  Headset,
  SlidersHorizontal,
  FlaskConical,
  MonitorCheck,
  Server,
  BarChart3,
  Radio,
} from 'lucide-react'
import styles from '@/components/admin/admin.module.css'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Analytics',
    icon: BarChart3,
    items: [
      { label: 'Live Activity', href: '/admin/analytics/activity', icon: Radio },
      { label: 'Users', href: '/admin/analytics/users', icon: Users },
    ],
  },
  {
    label: 'Customer Service',
    icon: Headset,
    href: '/admin/customer-service',
    items: [
      { label: 'Support Tickets', href: '/admin/tickets', icon: Ticket },
      { label: 'Activity Log', href: '/admin/activity', icon: Activity },
    ],
  },
  {
    label: 'Sales & Marketing',
    icon: TrendingUp,
    href: '/admin/sales-marketing',
    items: [],
  },
  {
    label: 'Variable Management',
    icon: SlidersHorizontal,
    href: '/admin/variables',
    items: [
      { label: 'BRI Weights', href: '/admin/tools/bri-weights', icon: Scale },
      { label: 'Industry Multiples', href: '/admin/tools/industry-multiples', icon: TrendingUp },
      { label: 'Multiple Adjustment', href: '/admin/tools/multiple-adjustment', icon: Calculator },
      { label: 'Global BRI Weighting', href: '/admin/tools/bri-weighting', icon: SlidersHorizontal },
    ],
  },
  {
    label: 'User Management',
    icon: Users,
    href: '/admin/users',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Companies', href: '/admin/companies', icon: Building },
      { label: 'Workspaces', href: '/admin/workspaces', icon: Building2 },
    ],
  },
  {
    label: 'R&D',
    icon: FlaskConical,
    href: '/admin/rd',
    items: [
      { label: 'Snapshot', href: '/admin/tools/snapshot', icon: Camera },
      { label: 'Task Viewer', href: '/admin/tools/task-viewer', icon: ListTodo },
    ],
  },
  {
    label: 'System',
    icon: Server,
    items: [
      { label: 'Site Monitoring', href: '/admin/monitoring', icon: MonitorCheck },
    ],
  },
]

export function AdminNav() {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Analytics': true,
    'Customer Service': true,
    'Variable Management': true,
    'User Management': true,
    'R&D': true,
    'System': true,
  })

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }))
  }

  const isSectionActive = (section: NavSection) => {
    if (section.href && pathname === section.href) return true
    return section.items.some(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    )
  }

  return (
    <nav className={styles.adminNav}>
      {/* Dashboard link */}
      <Link
        href="/admin"
        className={`${styles.adminNavLink} ${pathname === '/admin' ? styles.adminNavLinkActive : ''}`}
      >
        <Home className="h-4 w-4" />
        Dashboard
      </Link>

      {/* Module sections */}
      {navSections.map((section) => {
        const isExpanded = expandedSections[section.label]
        const hasItems = section.items.length > 0
        const isActive = isSectionActive(section)

        return (
          <div key={section.label} className={styles.adminNavSection}>
            {hasItems ? (
              <button
                onClick={() => toggleSection(section.label)}
                className={`${styles.adminNavSectionToggle} ${isActive ? styles.adminNavSectionToggleActive : ''}`}
              >
                <span className={styles.adminNavSectionToggleInner}>
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </span>
                <ChevronDown
                  className={`${styles.adminNavChevron} ${isExpanded ? styles.adminNavChevronOpen : ''}`}
                />
              </button>
            ) : (
              <Link
                href={section.href || '/admin'}
                className={`${styles.adminNavLink} ${pathname === section.href ? styles.adminNavLinkActive : ''}`}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </Link>
            )}

            {hasItems && isExpanded && (
              <div className={styles.adminNavSubList}>
                {section.items.map((item) => {
                  const isItemActive =
                    pathname === item.href || pathname.startsWith(item.href + '/')

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${styles.adminNavSubLink} ${isItemActive ? styles.adminNavSubLinkActive : ''}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function AdminSidebar() {
  return (
    <aside className={styles.adminSidebar}>
      <div className={styles.adminSidebarBrand}>
        <Shield className={styles.adminSidebarBrandIcon} />
        <span className={styles.adminSidebarBrandText}>Admin Panel</span>
      </div>

      <div className={styles.adminSidebarScroll}>
        <AdminNav />
      </div>

      <div className={styles.adminSidebarFooter}>
        <Link href="/dashboard" className={styles.adminSidebarBackLink}>
          <LogOut className="h-4 w-4" />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
