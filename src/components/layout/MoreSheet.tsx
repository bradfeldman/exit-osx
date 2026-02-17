'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/contexts/CompanyContext'
import { useProgression } from '@/contexts/ProgressionContext'
import { cn } from '@/lib/utils'
import { DealRoomIcon } from './nav-icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  X,
  Banknote,
  BarChart3,
  Calculator,
  Wallet,
  Landmark,
  Settings,
  LogOut,
  Building2,
  Monitor,
} from 'lucide-react'
import packageJson from '../../../package.json'

interface MoreSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function MoreSheet({ isOpen, onClose }: MoreSheetProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { companies, selectedCompanyId, setSelectedCompanyId, isLoading } = useCompany()
  const { progressionData } = useProgression()
  const [signingOut, setSigningOut] = useState(false)

  const selectedCompany = companies.find(c => c.id === selectedCompanyId)
  const isOnSetupPage = pathname === '/dashboard/company/setup'

  const handleCompanyChange = (companyId: string) => {
    if (companyId === '___add_new___') {
      router.push('/dashboard/company/setup')
      onClose()
      return
    }
    setSelectedCompanyId(companyId)
    router.refresh()
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleLinkClick = () => {
    onClose()
  }

  const isActive = (href: string, exactMatch?: boolean) => {
    if (exactMatch) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 lg:hidden animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl shadow-xl lg:hidden max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom)]">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-lg font-semibold text-foreground">More</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Company Selector */}
        {!isLoading && companies.length > 0 && (
          <div className="px-5 pb-4">
            <Select
              value={isOnSetupPage ? '___add_new___' : (selectedCompanyId || undefined)}
              onValueChange={handleCompanyChange}
            >
              <SelectTrigger className="w-full h-12">
                <div className="flex items-center gap-2 truncate">
                  {isOnSetupPage ? (
                    <>
                      <Building2 className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-primary">New Company</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <SelectValue placeholder="Select company">
                        {selectedCompany?.name || 'Select company'}
                      </SelectValue>
                    </>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
                <div className="border-t border-border my-1" />
                <SelectItem value="___add_new___" className="text-primary">
                  + Add Company
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="px-5 space-y-5 pb-6">
          {/* Core */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Core</p>
            <nav className="space-y-0.5">
              <Link
                href="/dashboard/deal-room"
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-base font-medium transition-colors active:scale-[0.98]',
                  isActive('/dashboard/deal-room')
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <DealRoomIcon className="h-5 w-5 shrink-0" />
                Deal Room
              </Link>
            </nav>
          </div>

          {/* Financial Tools */}
          {progressionData && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Financial Tools</p>
              <nav className="space-y-0.5">
                <Link
                  href="/dashboard/financials"
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-base font-medium transition-colors active:scale-[0.98]',
                    isActive('/dashboard/financials', true) || pathname.startsWith('/dashboard/financials/statements')
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Banknote className="h-5 w-5 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span>Business Financials</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      Best on desktop
                    </span>
                  </div>
                </Link>
                <Link
                  href="/dashboard/valuation"
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-base font-medium transition-colors active:scale-[0.98]',
                    isActive('/dashboard/valuation')
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <BarChart3 className="h-5 w-5 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span>DCF Valuation</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      Best on desktop
                    </span>
                  </div>
                </Link>
                <Link
                  href="/dashboard/financials/personal"
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-base font-medium transition-colors active:scale-[0.98]',
                    isActive('/dashboard/financials/personal')
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Wallet className="h-5 w-5 shrink-0" />
                  Personal Financial Statement
                </Link>
                <Link
                  href="/dashboard/financials/retirement"
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-base font-medium transition-colors active:scale-[0.98]',
                    isActive('/dashboard/financials/retirement')
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Calculator className="h-5 w-5 shrink-0" />
                  Retirement Calculator
                </Link>
              </nav>
            </div>
          )}

          {/* Capital */}
          {progressionData && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Capital</p>
              <nav className="space-y-0.5">
                <Link
                  href="/dashboard/loans/business"
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-base font-medium transition-colors active:scale-[0.98]',
                    isActive('/dashboard/loans')
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Landmark className="h-5 w-5 shrink-0" />
                  Business Loans
                </Link>
              </nav>
            </div>
          )}

          {/* Settings + Sign Out */}
          <div className="border-t border-border pt-4 space-y-0.5">
            <Link
              href="/dashboard/settings"
              onClick={handleLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-base font-medium transition-colors active:scale-[0.98]',
                isActive('/dashboard/settings')
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-base font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>

          {/* Version */}
          <p className="text-xs text-muted-foreground text-center pb-2">
            Exit OSx v{packageJson.version}
          </p>
        </div>
      </div>
    </>
  )
}
