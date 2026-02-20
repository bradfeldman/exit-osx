'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, Shield, LogOut, Settings } from 'lucide-react'
import { AdminNav } from './AdminNav'
import styles from '@/components/admin/admin.module.css'

interface AdminHeaderProps {
  user: {
    email: string
    name: string | null
  }
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className={styles.adminHeader}>
      {/* Mobile menu — DropdownMenu kept as shadcn interactive */}
      <div className={styles.adminHeaderMobileMenu}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-2">
            <AdminNav />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile logo */}
      <div className={styles.adminHeaderMobileBrand}>
        <Shield className={styles.adminHeaderMobileBrandIcon} />
        <span className={styles.adminHeaderMobileBrandText}>Admin</span>
      </div>

      <div className={styles.adminHeaderSpacer} />

      {/* User menu — DropdownMenu kept as shadcn interactive */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <div className={styles.adminHeaderAvatar}>
              {user.name?.[0] || user.email[0].toUpperCase()}
            </div>
            <span className={styles.adminHeaderUserName}>{user.name || user.email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Back to App
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
