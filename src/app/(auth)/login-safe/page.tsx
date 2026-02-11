'use client'

import { useState, useCallback, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { secureLogin } from '@/app/actions/auth'

/**
 * TEMPORARY: Incremental rebuild of login page for iOS debugging.
 * Round 2: useRouter + form + server action import.
 * If this loops: one of useRouter / form / secureLogin import is the culprit.
 */

function SearchParamsReader({ onChange }: {
  onChange: (params: string) => void
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    onChange(searchParams.toString() || '(none)')
  }, [searchParams, onChange])

  return null
}

export default function LoginSafePage() {
  const [params, setParams] = useState('loading...')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('Ready')
  const router = useRouter()

  const handleParams = useCallback((p: string) => {
    setParams(p)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('Logging in...')

    try {
      const result = await secureLogin(email, password)
      if (result.success) {
        setStatus('Success! Redirecting...')
        router.replace('/dashboard')
      } else {
        setStatus(`Error: ${result.error || 'Unknown'}`)
      }
    } catch (err) {
      setStatus(`Caught: ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, fontFamily: '-apple-system, sans-serif' }}>
      <Suspense fallback={null}>
        <SearchParamsReader onChange={handleParams} />
      </Suspense>

      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Login Safe (Round 2)</h1>
      <p style={{ color: '#666', marginBottom: 8, fontSize: 14 }}>
        useRouter + form + secureLogin server action.
      </p>
      <p style={{ fontSize: 12, marginBottom: 16, fontFamily: 'monospace', background: '#f0f0f0', padding: 8 }}>
        Params: {params} | Status: {status}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, fontSize: 16 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, fontSize: 16 }}
        />
        <button
          type="submit"
          style={{
            padding: '12px 24px', background: '#2563eb',
            color: 'white', border: 'none', borderRadius: 8, fontSize: 16,
          }}
        >
          Sign In
        </button>
      </form>
    </div>
  )
}
