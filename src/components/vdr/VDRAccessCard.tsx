'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { VDR_ACCESS_LABELS } from '@/lib/contact-system/constants'
import { cn } from '@/lib/utils'
import {
  Lock,
  Unlock,
  Key,
  Shield,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

interface VDRAccessCardProps {
  accessLevel: string | null
  accessGrantedAt: string | null
  maxStage?: string
  expiresAt?: string | null
  contactCount: number
  activeContacts: number
  className?: string
}

// Access level progression
const ACCESS_LEVELS = ['NONE', 'TEASER', 'POST_NDA', 'LEVEL_2', 'LEVEL_3', 'FULL']

// Access level colors
const ACCESS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NONE: {
    bg: 'bg-muted dark:bg-muted',
    text: 'text-muted-foreground dark:text-muted-foreground',
    border: 'border-border',
  },
  TEASER: {
    bg: 'bg-accent-light dark:bg-primary/30',
    text: 'text-primary dark:text-primary',
    border: 'border-primary/20',
  },
  POST_NDA: {
    bg: 'bg-green-light dark:bg-green-dark/30',
    text: 'text-green-dark dark:text-green',
    border: 'border-green/20',
  },
  LEVEL_2: {
    bg: 'bg-orange-light dark:bg-orange-dark/30',
    text: 'text-orange-dark dark:text-orange',
    border: 'border-orange/20',
  },
  LEVEL_3: {
    bg: 'bg-orange-light dark:bg-orange-dark/30',
    text: 'text-orange-dark dark:text-orange',
    border: 'border-orange/20',
  },
  FULL: {
    bg: 'bg-purple-light dark:bg-purple-dark/30',
    text: 'text-purple-dark dark:text-purple',
    border: 'border-purple/20',
  },
}

export function VDRAccessCard({
  accessLevel,
  accessGrantedAt,
  maxStage,
  expiresAt,
  contactCount,
  activeContacts,
  className,
}: VDRAccessCardProps) {
  const level = accessLevel || 'NONE'
  const colors = ACCESS_COLORS[level] || ACCESS_COLORS.NONE
  const levelIndex = ACCESS_LEVELS.indexOf(level)
  const progressPercent = ((levelIndex + 1) / ACCESS_LEVELS.length) * 100

  const isExpired = expiresAt && new Date(expiresAt) < new Date()
  const label = VDR_ACCESS_LABELS[level as keyof typeof VDR_ACCESS_LABELS] || 'No Access'

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className={cn('h-1', colors.bg)} />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {level === 'NONE' ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Unlock className={cn('h-4 w-4', colors.text)} />
            )}
            VDR Access
          </div>
          <Badge className={cn(colors.bg, colors.text, 'font-medium')}>
            {label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Access Level</span>
            <span>{levelIndex + 1} of {ACCESS_LEVELS.length}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {ACCESS_LEVELS.map((lvl, idx) => (
              <span
                key={lvl}
                className={cn(
                  idx <= levelIndex && 'font-medium',
                  idx === levelIndex && colors.text
                )}
              >
                {idx + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Status indicators */}
        <div className="grid grid-cols-2 gap-3">
          {/* Contact access */}
          <div className="flex items-center gap-2 text-sm">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
              <Key className={cn('h-4 w-4', colors.text)} />
            </div>
            <div>
              <p className="font-medium">{activeContacts}</p>
              <p className="text-xs text-muted-foreground">of {contactCount} with access</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              isExpired
                ? 'bg-red-light dark:bg-red-dark/30'
                : level !== 'NONE'
                  ? 'bg-green-light dark:bg-green-dark/30'
                  : 'bg-muted dark:bg-muted'
            )}>
              {isExpired ? (
                <AlertCircle className="h-4 w-4 text-red-dark" />
              ) : level !== 'NONE' ? (
                <CheckCircle className="h-4 w-4 text-green-dark" />
              ) : (
                <Shield className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {isExpired ? 'Expired' : level !== 'NONE' ? 'Active' : 'Pending'}
              </p>
              <p className="text-xs text-muted-foreground">
                {accessGrantedAt
                  ? `Since ${new Date(accessGrantedAt).toLocaleDateString()}`
                  : 'Not granted'}
              </p>
            </div>
          </div>
        </div>

        {/* VDR Stage */}
        {maxStage && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">VDR Stage Access</span>
              <Badge variant="outline">{maxStage.replace(/_/g, ' ')}</Badge>
            </div>
          </div>
        )}

        {/* Expiration warning */}
        {expiresAt && !isExpired && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-orange-dark">
              <AlertCircle className="h-3.5 w-3.5" />
              Expires {new Date(expiresAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
