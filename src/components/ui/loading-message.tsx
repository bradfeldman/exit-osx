'use client'

import { useState, useEffect } from 'react'

const MODE_MESSAGES: Record<string, string[]> = {
  value: [
    'Calculating your valuation...',
    'Analyzing market multiples...',
    'Building your value bridge...',
  ],
  diagnosis: [
    'Loading risk categories...',
    'Analyzing buyer readiness...',
    'Identifying top risk drivers...',
  ],
  actions: [
    'Loading your action plan...',
    'Prioritizing by value impact...',
    'Checking task progress...',
  ],
  evidence: [
    'Loading your evidence vault...',
    'Checking document status...',
    'Calculating readiness score...',
  ],
  'deal-room': [
    'Loading your deal room...',
    'Checking pipeline status...',
    'Preparing buyer activity...',
  ],
}

export function LoadingMessage({ mode }: { mode: string }) {
  const messages = MODE_MESSAGES[mode] || ['Loading...']
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (messages.length <= 1) return
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % messages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [messages.length])

  return (
    <p className="text-sm text-muted-foreground text-center mt-6 animate-pulse">
      {messages[index]}
    </p>
  )
}
