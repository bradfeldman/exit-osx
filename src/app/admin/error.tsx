'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import styles from '@/components/admin/admin.module.css'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin panel error:', error)
  }, [error])

  return (
    <div className={styles.adminErrorPage}>
      <div className={styles.adminErrorCard}>
        <div className={styles.adminErrorIconWrap}>
          <AlertTriangle className={styles.adminErrorIcon} />
        </div>

        <h2 className={styles.adminErrorTitle}>
          Admin Error
        </h2>

        <p className={styles.adminErrorMessage}>
          An error occurred in the admin panel. This has been logged.
        </p>

        {error.digest && (
          <p className={styles.adminErrorDigest}>
            Error ID: {error.digest}
          </p>
        )}

        <div className={styles.adminErrorActions}>
          <button
            onClick={reset}
            className={styles.adminErrorRetryBtn}
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>

          <Link
            href="/admin"
            className={styles.adminErrorBackLink}
          >
            <ArrowLeft className="w-4 h-4" />
            Admin Home
          </Link>
        </div>
      </div>
    </div>
  )
}
