'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Mail, X, Lock, Send } from 'lucide-react'

interface EmailVerificationBannerProps {
  emailVerified: boolean
}

export function EmailVerificationBanner({ emailVerified }: EmailVerificationBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (emailVerified || dismissed) return null

  async function handleResend() {
    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/resend-verification', { method: 'POST' })
      const data = await response.json()

      if (data.alreadyVerified) {
        // Refresh the page to pick up the verified state
        window.location.reload()
        return
      }

      if (!response.ok) {
        setError(data.error || 'Failed to send verification email')
        return
      }

      setSent(true)
    } catch {
      setError('Failed to send verification email')
    } finally {
      setSending(false)
    }
  }

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
          <div className="relative p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="flex-shrink-0 mt-0.5">
                <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">
                  Verify your email to unlock full access
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-300/80 space-y-0.5 mb-3">
                  <li className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 flex-shrink-0" />
                    Team invites &amp; task delegation
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 flex-shrink-0" />
                    Weekly digests &amp; signal alerts
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 flex-shrink-0" />
                    Shareable reports for advisors
                  </li>
                </ul>

                {sent ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400">
                      Verification email sent! Check your inbox.
                    </p>
                    <button
                      onClick={() => { setSent(false); handleResend() }}
                      disabled={sending}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                    >
                      {sending ? 'Sending...' : 'Didn\u2019t receive it? Resend'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    {sending ? 'Sending...' : 'Send Verification Email'}
                  </button>
                )}

                {error && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
