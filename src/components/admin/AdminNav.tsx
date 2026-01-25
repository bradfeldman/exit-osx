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
  Code,
  Settings,
  ChevronDown,
  Calculator,
  Scale,
  Camera,
  TrendingUp,
  ListTodo,
  Cog,
} from 'lucide-react'

const navItems = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: Home,
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    label: 'Organizations',
    href: '/admin/organizations',
    icon: Building2,
  },
  {
    label: 'Support Tickets',
    href: '/admin/tickets',
    icon: Ticket,
  },
  {
    label: 'Activity Log',
    href: '/admin/activity',
    icon: Activity,
  },
]

const developerTools = [
  {
    label: 'Multiple Adjustment',
    href: '/admin/tools/multiple-adjustment',
    icon: Calculator,
    description: 'Adjust valuation multiples',
  },
  {
    label: 'BRI Weights',
    href: '/admin/tools/bri-weights',
    icon: Scale,
    description: 'Configure BRI category weights',
  },
  {
    label: 'Snapshot',
    href: '/admin/tools/snapshot',
    icon: Camera,
    description: 'Create valuation snapshots',
  },
  {
    label: 'Industry Multiples',
    href: '/admin/tools/industry-multiples',
    icon: TrendingUp,
    description: 'Manage industry multiple data',
  },
  {
    label: 'Task Viewer',
    href: '/admin/tools/task-viewer',
    icon: ListTodo,
    description: 'View and debug tasks',
  },
]

const globalSettings = [
  {
    label: 'Global BRI Weighting',
    href: '/admin/tools/bri-weighting',
    icon: Cog,
    description: 'System-wide BRI configuration',
  },
]

export function AdminNav() {
  const pathname = usePathname()
  const [developerExpanded, setDeveloperExpanded] = useState(true)
  const [globalExpanded, setGlobalExpanded] = useState(true)

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== '/admin' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}

      {/* Developer Tools Section */}
      <div className="mt-4">
        <button
          onClick={() => setDeveloperExpanded(!developerExpanded)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <div className="flex items-center gap-3">
            <Code className="h-4 w-4" />
            Developer Tools
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              developerExpanded ? 'rotate-180' : ''
            )}
          />
        </button>
        {developerExpanded && (
          <div className="ml-4 mt-1 flex flex-col gap-1 border-l pl-3">
            {developerTools.map((tool) => {
              const isActive = pathname === tool.href ||
                pathname.startsWith(tool.href)

              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <tool.icon className="h-4 w-4" />
                  {tool.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Global Settings Section */}
      <div className="mt-2">
        <button
          onClick={() => setGlobalExpanded(!globalExpanded)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4" />
            Global Settings
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              globalExpanded ? 'rotate-180' : ''
            )}
          />
        </button>
        {globalExpanded && (
          <div className="ml-4 mt-1 flex flex-col gap-1 border-l pl-3">
            {globalSettings.map((setting) => {
              const isActive = pathname === setting.href ||
                pathname.startsWith(setting.href)

              return (
                <Link
                  key={setting.href}
                  href={setting.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <setting.icon className="h-4 w-4" />
                  {setting.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
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
