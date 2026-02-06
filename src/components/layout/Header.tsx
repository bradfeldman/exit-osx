'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from './NotificationBell'
import { MobileNav } from './MobileNav'
import { useSubscription } from '@/contexts/SubscriptionContext'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
}

// Format plan tier for display
function formatPlanTier(tier: string): string {
  switch (tier) {
    case 'exit-ready':
      return 'Exit-Ready'
    case 'growth':
      return 'Growth'
    case 'foundation':
    default:
      return 'Foundation'
  }
}

// Get badge color based on plan tier
function getPlanBadgeClass(tier: string): string {
  switch (tier) {
    case 'exit-ready':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'growth':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    case 'foundation':
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function Header({ user }: HeaderProps) {
  const [loading, setLoading] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { planTier, isTrialing, trialDaysRemaining, isLoading: subscriptionLoading } = useSubscription()

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
        {/* Mobile menu button - opens on hover */}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          onMouseEnter={() => setMobileNavOpen(true)}
          className="lg:hidden -m-2.5 p-2.5 text-muted-foreground hover:text-foreground"
        >
          <span className="sr-only">Open sidebar</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <Image
            src="/logo.webp"
            alt="Exit OSx"
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <span className="text-lg font-semibold text-foreground">Exit OSx</span>
        </div>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1" />

        {/* Subscription badge and User menu */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Subscription Status */}
          {!subscriptionLoading && (
            <div className="hidden sm:flex flex-col items-center gap-0.5">
              <a
                href="/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium hover:opacity-80 transition-opacity ${getPlanBadgeClass(planTier)}`}
              >
                {formatPlanTier(planTier)}
              </a>
              <span className="text-[10px] text-muted-foreground text-center w-full">
                {isTrialing && trialDaysRemaining !== null
                  ? `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'day' : 'days'} left`
                  : 'member'}
              </span>
            </div>
          )}
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                <UserAvatar
                  email={user.email || ''}
                  name={user.user_metadata?.name}
                  size="md"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {user.user_metadata?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings?tab=account')}>
                User Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} disabled={loading}>
                {loading ? 'Signing out...' : 'Sign out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
    </>
  )
}
