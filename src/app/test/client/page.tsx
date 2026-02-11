'use client'

import { useState } from 'react'

/**
 * TEMPORARY: Client component test OUTSIDE the (auth) route group.
 * Eliminates the (auth)/error.tsx boundary as a variable.
 * If this works but /login-safe doesn't: the (auth) error boundary is the issue.
 * If this ALSO loops: the issue is with ALL client components on this iOS version.
 */
export default function ClientTestPage() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, fontFamily: '-apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Client Component Test (outside auth)</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        This page is NOT inside the (auth) route group. No error boundary from auth/error.tsx.
      </p>
      <p style={{ fontSize: 18, marginBottom: 16 }}>Count: {count}</p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '12px 24px', background: '#2563eb',
          color: 'white', border: 'none', borderRadius: 8, fontSize: 16,
        }}
      >
        Click me
      </button>
    </div>
  )
}
