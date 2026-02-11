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
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200',
  },
  TEASER: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200',
  },
  POST_NDA: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200',
  },
  LEVEL_2: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200',
  },
  LEVEL_3: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200',
  },
  FULL: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200',
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
                ? 'bg-red-100 dark:bg-red-900/30'
                : level !== 'NONE'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-gray-100 dark:bg-gray-900/30'
            )}>
              {isExpired ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : level !== 'NONE' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Shield className="h-4 w-4 text-gray-400" />
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
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Expires {new Date(expiresAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
