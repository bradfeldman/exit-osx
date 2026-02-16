'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/contexts/CompanyContext'
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
import { ExitCoachButton } from '@/components/ai-coach/ExitCoachButton'
import { ValuationTicker } from './ValuationTicker'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
}

export function Header({ user }: HeaderProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { companies, selectedCompanyId } = useCompany()
  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
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
        {/* Company name — prominent, personal */}
        <div className="hidden lg:flex items-center gap-6 flex-1 min-w-0">
          {selectedCompany && (
            <span className="text-lg font-bold text-foreground truncate">
              {selectedCompany.name}
            </span>
          )}
          <ValuationTicker />
        </div>
        <div className="flex flex-1 lg:hidden" />

        {/* User menu */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <ExitCoachButton />
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
              <DropdownMenuItem onClick={handleSignOut} disabled={loading}>
                {loading ? 'Signing out...' : 'Sign out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
