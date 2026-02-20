'use client'

import { useState } from 'react'
import { motion } from '@/lib/motion'
import { RefreshCw } from 'lucide-react'

export function DashboardLoadError() {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setIsRetrying(true)
    // Hard reload to clear any stale state
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-foreground via-foreground to-foreground flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-md text-center space-y-6"
      >
        {/* Rocket illustration */}
        <div className="flex justify-center mb-2">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Stars */}
            <circle cx="15" cy="25" r="2" fill="#0071E3" opacity="0.6">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="105" cy="35" r="1.5" fill="#0071E3" opacity="0.4">
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="25" cy="85" r="1" fill="white" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="95" cy="90" r="1.5" fill="white" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="80" cy="15" r="1" fill="white" opacity="0.5">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" />
            </circle>

            {/* Rocket body */}
            <g transform="translate(60, 60) rotate(-45) translate(-12, -24)">
              {/* Nose cone */}
              <path d="M12 0 C12 0 4 12 4 20 L20 20 C20 12 12 0 12 0Z" fill="#0071E3" />
              {/* Body */}
              <rect x="4" y="20" width="16" height="24" rx="2" fill="white" opacity="0.9" />
              {/* Window */}
              <circle cx="12" cy="30" r="4" fill="#1e293b" stroke="#0071E3" strokeWidth="1.5" />
              <circle cx="12" cy="30" r="2" fill="#0071E3" opacity="0.3" />
              {/* Fins */}
              <path d="M4 38 L-2 48 L4 44Z" fill="#0071E3" opacity="0.8" />
              <path d="M20 38 L26 48 L20 44Z" fill="#0071E3" opacity="0.8" />
              {/* Exhaust */}
              <path d="M6 44 L12 56 L18 44Z" fill="#0071E3" opacity="0.5">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="0.5s" repeatCount="indefinite" />
              </path>
              <path d="M8 44 L12 52 L16 44Z" fill="#fbbf24" opacity="0.6">
                <animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.4s" repeatCount="indefinite" />
              </path>
            </g>
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight">
          We&apos;re growing fast &mdash; hang tight!
        </h1>

        <p className="text-muted text-base leading-relaxed">
          We hit a temporary snag loading your dashboard. This usually resolves itself in a moment.
        </p>

        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all hover:scale-105 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:hover:scale-100"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </button>

        {retryCount >= 2 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground"
          >
            Still not working? Email us at{' '}
            <a href="mailto:support@exitosx.com" className="text-primary hover:underline">
              support@exitosx.com
            </a>
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}
