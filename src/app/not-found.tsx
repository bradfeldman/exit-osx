import Link from 'next/link'
import styles from './not-found.module.css'

/**
 * 404 Not Found page — standalone layout (no sidebar).
 *
 * Matches the mocksite design at mocksite/error-404.html exactly:
 * - Centered top bar with logo only
 * - Large decorative "404" in light gray
 * - Alert icon circle
 * - Heading + subtitle
 * - Primary / secondary CTA buttons
 * - Divider + decorative search input
 * - Popular Pages helpful-links section
 */
export default function NotFound() {
  return (
    <div className={styles.pageRoot}>
      {/* ===== TOP BAR ===== */}
      <header className={styles.topBar}>
        <Link href="/dashboard" className={styles.logo}>
          {/* Exit OS logomark — blue rounded square with checkmark */}
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#0071E3" />
            <path
              d="M8 16L14 22L24 10"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.logoText}>Exit OS</span>
        </Link>
      </header>

      {/* ===== CENTERED ERROR CARD ===== */}
      <main className={styles.centerWrap}>
        <div className={styles.errorCard}>

          {/* Large decorative 404 */}
          <div className={styles.errorNumber} aria-hidden="true">404</div>

          {/* Alert / info icon circle */}
          <div className={styles.errorIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className={styles.errorHeading}>Page not found</h1>
          <p className={styles.errorSubtitle}>
            The page you&rsquo;re looking for doesn&rsquo;t exist or may have been moved.
            Let&rsquo;s get you back on track.
          </p>

          {/* Primary action buttons */}
          <div className={styles.btnGroup}>
            <Link href="/dashboard" className={`${styles.btn} ${styles.btnPrimary}`}>
              {/* Home icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Go to Dashboard
            </Link>

            <Link href="/dashboard/help" className={`${styles.btn} ${styles.btnSecondary}`}>
              {/* Help / question-circle icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Help Center
            </Link>
          </div>

          {/* Divider */}
          <div className={styles.divider}>or search for what you need</div>

          {/* Search — decorative; no JS handler needed */}
          <div>
            <div className={styles.searchLabel}>Try searching Exit OS</div>
            <div className={styles.searchWrap}>
              {/* Magnifying glass icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search pages, tasks, signals..."
                aria-label="Search Exit OS"
              />
            </div>
          </div>

          {/* Popular Pages */}
          <nav className={styles.helpfulLinks} aria-label="Popular pages">
            <div className={styles.helpfulLinksLabel}>Popular Pages</div>
            <ul className={styles.helpfulLinksList}>

              <li className={styles.helpfulLinksItem}>
                <Link href="/dashboard">
                  {/* Home icon */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  Dashboard
                </Link>
              </li>

              <li className={styles.helpfulLinksItem}>
                <Link href="/dashboard/valuation">
                  {/* Dollar-sign / valuation icon */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                  Valuation
                </Link>
              </li>

              <li className={styles.helpfulLinksItem}>
                <Link href="/dashboard/action-center">
                  {/* Clock icon */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Action Center
                </Link>
              </li>

              <li className={styles.helpfulLinksItem}>
                <Link href="/dashboard/reports">
                  {/* File / reports icon */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Reports
                </Link>
              </li>

            </ul>
          </nav>

        </div>
      </main>
    </div>
  )
}
