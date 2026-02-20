'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Bell, X, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'

interface SinceLastVisitEvent {
  type: string
  message: string
  date: string
}

interface SinceLastVisitBannerProps {
  events: SinceLastVisitEvent[]
  lastVisitAt: string | null
}

function getEventIcon(type: string) {
  switch (type) {
    case 'market': return <TrendingUp className="w-3.5 h-3.5 text-primary" />
    case 'valuation': return <BarChart3 className="w-3.5 h-3.5 text-primary" />
    case 'drift': return <AlertTriangle className="w-3.5 h-3.5 text-orange" />
    default: return <Bell className="w-3.5 h-3.5 text-primary" />
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'earlier today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export function SinceLastVisitBanner({ events, lastVisitAt }: SinceLastVisitBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (!events || events.length === 0 || dismissed) return null

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="relative p-4 rounded-lg bg-primary/5 border border-primary/15">
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Since your last visit{lastVisitAt ? ` (${formatTimeAgo(lastVisitAt)})` : ''}:
              </span>
            </div>

            <ul className="space-y-1.5 pr-6">
              {events.map((event, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex-shrink-0">{getEventIcon(event.type)}</span>
                  <span>{event.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
