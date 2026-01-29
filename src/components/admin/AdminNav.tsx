'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Users,
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
} from 'lucide-react'

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
      { label: 'Organizations', href: '/admin/organizations', icon: Building2 },
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
]

export function AdminNav() {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Customer Service': true,
    'Variable Management': true,
    'User Management': true,
    'R&D': true,
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
    <nav className="flex flex-col gap-1">
      {/* Dashboard link */}
      <Link
        href="/admin"
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/admin'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
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
          <div key={section.label} className="mt-2">
            {hasItems ? (
              <button
                onClick={() => toggleSection(section.label)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded ? 'rotate-180' : ''
                  )}
                />
              </button>
            ) : (
              <Link
                href={section.href || '/admin'}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === section.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </Link>
            )}

            {hasItems && isExpanded && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l pl-3">
                {section.items.map((item) => {
                  const isItemActive =
                    pathname === item.href || pathname.startsWith(item.href + '/')

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isItemActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
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
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-background lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Shield className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Admin Panel</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AdminNav />
      </div>

      <div className="border-t p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
