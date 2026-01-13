'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useCompany } from '@/contexts/CompanyContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
}

export function Header({ user }: HeaderProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { companies, selectedCompanyId, setSelectedCompanyId, isLoading } = useCompany()

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId)
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
        {/* Company Switcher */}
        <div className="flex items-center">
          {!isLoading && companies.length > 0 && (
            <Select
              value={selectedCompanyId || undefined}
              onValueChange={handleCompanyChange}
            >
              <SelectTrigger className="w-[200px] border-none bg-transparent focus:ring-0 focus:ring-offset-0">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                  </svg>
                  <SelectValue placeholder="Select company" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex flex-1" />

        {/* User menu */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
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
              <DropdownMenuItem onClick={() => router.push('/dashboard/company/setup')}>
                Company Settings
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
  )
}
