'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CompanyAvatar } from '@/components/ui/company-avatar'
import { GraduationCap, ClipboardCheck, ChevronRight, Mail, BarChart3 } from 'lucide-react'

interface Alert {
  id: string
  type: 'NO_ASSESSMENT' | 'STALE_ASSESSMENT' | 'QUARTERLY_REMINDER' | 'OPEN_ASSESSMENT' | 'ASSESSMENT_AVAILABLE'
    | 'ACCESS_REQUEST' | 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'STAFF_PAUSED' | 'OWNERSHIP_TRANSFER'
    | 'TRIAL_ENDING' | 'TRIAL_EXPIRED' | 'ACTION_PLAN_UPDATED' | 'ONBOARDING_TOUR' | 'ONBOARDING_ASSESSMENT'
    | 'ONBOARDING_VERIFY_EMAIL' | 'ONBOARDING_BASELINE'
  title: string
  message: string
  actionUrl: string | null
  companyId?: string
  companyName?: string
  severity: 'info' | 'warning' | 'urgent'
  isRead?: boolean
  persistent?: boolean
  createdAt: string
}

export function NotificationBell() {
  const router = useRouter()
  const pathname = usePathname()
  const { setSelectedCompanyId } = useCompany()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch('/api/alerts')
        if (response.ok) {
          const data = await response.json()
          setAlerts(data.alerts)
          setCount(data.unreadCount)
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [pathname])

  const handleAlertClick = (alert: Alert) => {
    if (alert.companyId) {
      setSelectedCompanyId(alert.companyId)
    }
    if (alert.actionUrl) {
      router.push(alert.actionUrl)
    }
  }

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-amber-600 bg-amber-50'
      case 'info': return 'text-blue-600 bg-blue-50'
    }
  }

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'urgent':
        return (
          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        )
    }
  }

  // Separate onboarding alerts from regular alerts
  const onboardingTypes = ['ONBOARDING_TOUR', 'ONBOARDING_ASSESSMENT', 'ONBOARDING_VERIFY_EMAIL', 'ONBOARDING_BASELINE'] as const
  const onboardingAlerts = alerts.filter(
    a => (onboardingTypes as readonly string[]).includes(a.type) && !a.isRead
  )
  const regularAlerts = alerts.filter(
    a => !(onboardingTypes as readonly string[]).includes(a.type)
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <span className="sr-only">View notifications</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white ring-2 ring-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {count > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              {count} alert{count !== 1 ? 's' : ''}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-6 text-center">
            <svg className="mx-auto h-8 w-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="mt-2 text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground/70">No pending alerts</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {/* GET STARTED section for onboarding alerts */}
            {onboardingAlerts.length > 0 && (
              <>
                <div className="px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Get Started
                  </p>
                </div>
                {onboardingAlerts.map((alert) => (
                  <DropdownMenuItem
                    key={alert.id}
                    className="flex items-start gap-3 p-3 cursor-pointer focus:bg-accent border-l-2 border-primary mx-1 rounded-r-lg bg-primary/5"
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {alert.type === 'ONBOARDING_TOUR' ? (
                        <GraduationCap className="h-4 w-4 text-primary" />
                      ) : alert.type === 'ONBOARDING_VERIFY_EMAIL' ? (
                        <Mail className="h-4 w-4 text-primary" />
                      ) : alert.type === 'ONBOARDING_BASELINE' ? (
                        <BarChart3 className="h-4 w-4 text-primary" />
                      ) : (
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </DropdownMenuItem>
                ))}
                {regularAlerts.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Notifications
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Regular alerts */}
            {regularAlerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-accent"
                onClick={() => handleAlertClick(alert)}
              >
                {alert.companyName && (
                  <div className="flex items-center gap-2 w-full mb-1">
                    <CompanyAvatar name={alert.companyName} size="xs" />
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {alert.companyName}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2 w-full">
                  <div className="shrink-0 mt-0.5">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity === 'urgent' ? 'Action Required' : alert.severity === 'warning' ? 'Update Needed' : 'Reminder'}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
