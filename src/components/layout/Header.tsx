'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/contexts/CompanyContext'
import { useProgression } from '@/contexts/ProgressionContext'
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
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
}

function getBriColor(score: number) {
  if (score >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' }
  if (score >= 60) return { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200' }
  if (score >= 40) return { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' }
  return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200' }
}

export function Header({ user }: HeaderProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { companies, selectedCompanyId } = useCompany()
  const { progressionData } = useProgression()
  const selectedCompany = companies.find(c => c.id === selectedCompanyId)
  const briScoreRaw = progressionData?.briScore ?? null
  // briScore is stored as Decimal(5,4) in 0-1 range; convert to 0-100 for display
  const briScore = briScoreRaw !== null ? Math.round(briScoreRaw * 100) : null

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
        {/* Company name + BRI score (BF-006) */}
        <div className="hidden lg:flex items-center gap-3 flex-1 min-w-0">
          {selectedCompany && (
            <>
              <span className="text-sm font-semibold text-foreground truncate">
                {selectedCompany.name}
              </span>
              {briScore !== null && briScore !== undefined && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${getBriColor(briScore).bg} ${getBriColor(briScore).text} ${getBriColor(briScore).ring}`}>
                  BRI {briScore}
                </span>
              )}
            </>
          )}
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
