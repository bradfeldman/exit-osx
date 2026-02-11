'use client'

import { useState, useCallback, Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * TEMPORARY: Incremental rebuild of login page for iOS debugging.
 * Round 1: useSearchParams + Suspense pattern (most likely iOS culprit).
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
  const [count, setCount] = useState(0)
  const [params, setParams] = useState('loading...')

  const handleParams = useCallback((p: string) => {
    setParams(p)
  }, [])

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, fontFamily: '-apple-system, sans-serif' }}>
      <Suspense fallback={null}>
        <SearchParamsReader onChange={handleParams} />
      </Suspense>

      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Search Params Test</h1>
      <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
        Testing useSearchParams + Suspense pattern on iOS.
      </p>
      <p style={{ fontSize: 14, marginBottom: 16, fontFamily: 'monospace', background: '#f0f0f0', padding: 8 }}>
        Params: {params}
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
