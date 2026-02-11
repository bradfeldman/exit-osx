'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { secureLogin } from '@/app/actions/auth'

/**
 * TEMPORARY: Minimal login page for iOS debugging.
 * Strips out useSearchParams, analytics, captcha, images, and complex state
 * to isolate what's causing the reload loop on iOS WebKit.
 */
export default function LoginSafePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await secureLogin(email, password)

      if (!result.success) {
        setError(result.error || 'Invalid email or password')
        return
      }

      router.replace('/dashboard')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, fontFamily: '-apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Sign In (Safe Mode)</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        Minimal login page for iOS debugging
      </p>

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '12px', background: loading ? '#9ca3af' : '#2563eb',
            color: 'white', border: 'none', borderRadius: 8, fontSize: 16, cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#999' }}>
        <span style={{ color: '#2563eb', cursor: 'pointer' }} onClick={() => window.location.href = '/login'}>Back to normal login</span>
      </p>
    </div>
  )
}
