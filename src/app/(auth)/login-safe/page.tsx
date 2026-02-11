'use client'

import { useState } from 'react'

/**
 * TEMPORARY: Absolute minimal client component for iOS debugging.
 * If this page loops: the issue is with ANY client component on this iOS version.
 * If this page works: the issue is with forms, server actions, or useRouter.
 */
export default function LoginSafePage() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, fontFamily: '-apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Client Component Test</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
        If you can see this AND click the button, client components work on your device.
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
