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

interface AdminHeaderProps {
  user: {
    email: string
    name: string | null
  }
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-6">
      {/* Mobile menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 p-2">
          <AdminNav />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-semibold">Admin</span>
      </div>

      <div className="flex-1" />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {user.name?.[0] || user.email[0].toUpperCase()}
            </div>
            <span className="hidden md:inline-block">{user.name || user.email}</span>
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
