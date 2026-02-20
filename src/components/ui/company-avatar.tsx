'use client'

import { cn } from '@/lib/utils'

interface CompanyAvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

// Generate a consistent color based on company name
function getCompanyColor(name: string): { bg: string; text: string } {
  // Hash the company name to get a consistent number
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Use predefined color palette for better aesthetics
  const colors = [
    { bg: 'bg-primary', text: 'text-white' },
    { bg: 'bg-green', text: 'text-white' },
    { bg: 'bg-purple', text: 'text-white' },
    { bg: 'bg-orange', text: 'text-white' },
    { bg: 'bg-red', text: 'text-white' },
    { bg: 'bg-teal', text: 'text-white' },
    { bg: 'bg-primary', text: 'text-white' },
    { bg: 'bg-orange', text: 'text-white' },
    { bg: 'bg-teal', text: 'text-white' },
    { bg: 'bg-red', text: 'text-white' },
    { bg: 'bg-green-dark', text: 'text-white' },
    { bg: 'bg-purple', text: 'text-white' },
  ]

  const index = Math.abs(hash) % colors.length
  return colors[index]
}

// Get initials from company name (up to 2 characters)
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}

const sizeClasses = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
}

export function CompanyAvatar({ name, size = 'sm', className }: CompanyAvatarProps) {
  const colors = getCompanyColor(name)
  const initials = getInitials(name)

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold shrink-0',
        colors.bg,
        colors.text,
        sizeClasses[size],
        className
      )}
      title={name}
    >
      {initials}
    </div>
  )
}
