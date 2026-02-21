'use client'

import Link from 'next/link'
import styles from '@/components/help/help.module.css'

// TODO: wire to API — fetch article by params.category + params.article slug

const ARTICLE = {
  title: 'How to Connect Your Accounting Software',
  category: 'Getting Started',
  categorySlug: 'getting-started',
  difficulty: 'Beginner',
  readTime: '5 min',
  updatedAt: 'Jan 12, 2026',
  author: 'Exit OSx Team',
}

const RELATED_ARTICLES = [
  { slug: 'create-company-profile', title: 'Creating Your Company Profile', categorySlug: 'getting-started' },
  { slug: 'understanding-bri-score', title: 'Understanding Your BRI Score', categorySlug: 'getting-started' },
  { slug: 'valuation-methods', title: 'Understanding Your Three Valuation Methods', categorySlug: 'getting-started' },
  { slug: 'data-room', title: 'Setting Up Your Virtual Data Room', categorySlug: 'getting-started' },
]

export default function HelpArticlePage({
  params,
}: {
  params: { category: string; article: string }
}) {
  // TODO: wire to API — fetch article by params.category + params.article

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/help">Help</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <Link href={`/dashboard/help/${params.category}`}>{ARTICLE.category}</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>{ARTICLE.title}</span>
      </nav>

      <div className={styles.articleLayout}>
        {/* Article main */}
        <main>
          <article className={styles.articleCard}>
            {/* Header */}
            <header className={styles.articleHeader}>
              <h1>{ARTICLE.title}</h1>
              <div className={styles.articleHeaderMeta}>
                <span className={`${styles.diffBadge} ${styles.diffBeginner}`}>{ARTICLE.difficulty}</span>
                <span className={styles.articleHeaderMetaItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {ARTICLE.readTime} read
                </span>
                <span className={styles.articleHeaderMetaItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Updated {ARTICLE.updatedAt}
                </span>
                <span className={styles.articleHeaderMetaItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {ARTICLE.author}
                </span>
              </div>
            </header>

            {/* Body */}
            <div className={styles.articleBody}>
              <p className={styles.articleBodyText}>
                Connecting your accounting software is the fastest way to get accurate financials into Exit OSx. When you link QuickBooks Online or Xero, we automatically import your P&L, balance sheet, and cash flow statements — and keep them updated in real time.
              </p>

              {/* Prerequisites */}
              <div className={styles.prereqBox}>
                <strong>Before you start</strong>
                <ul>
                  <li>You must be the Owner or Admin of your Exit OSx account</li>
                  <li>You need admin access to your QuickBooks or Xero account</li>
                  <li>Your accounting data should cover at least 12 months of history</li>
                </ul>
              </div>

              {/* Steps */}
              <h2 className={styles.articleSectionTitle}>Step-by-Step Instructions</h2>
              <div className={styles.stepList}>
                {[
                  { title: 'Navigate to Integrations', body: 'Go to Settings → Integrations from the left sidebar. You\'ll see the available accounting connections at the top of the page.' },
                  { title: 'Choose your accounting platform', body: 'Click Connect next to QuickBooks Online or Xero. If you use a different system, select "Upload CSV" to manually import your financials.' },
                  { title: 'Authorize the connection', body: 'You\'ll be redirected to your accounting provider\'s login screen. Sign in and grant Exit OSx read-only access to your financial data.' },
                  { title: 'Review the data import', body: 'Once connected, we\'ll pull in the last 3 years of data. Review the summary to confirm everything looks accurate before proceeding.' },
                  { title: 'Set your fiscal year end', body: 'Confirm your fiscal year end date so our valuation engine uses the correct trailing 12-month figures in all calculations.' },
                ].map((step, i) => (
                  <div key={i} className={styles.stepItem}>
                    <div className={styles.stepNum} aria-hidden="true">{i + 1}</div>
                    <div className={styles.stepBody}>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Screenshot placeholder */}
              <div className={styles.screenshotPlaceholder} aria-label="Screenshot placeholder: Integrations settings screen">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ marginLeft: 10 }}>Screenshot: Integrations settings page</span>
              </div>

              {/* Data table */}
              <h2 className={styles.articleSectionTitle}>What Data Gets Imported</h2>
              <div className={styles.dataTableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Data Type</th>
                      <th>QuickBooks</th>
                      <th>Xero</th>
                      <th>CSV Upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Profit & Loss', 'Auto', 'Auto', 'Manual'],
                      ['Balance Sheet', 'Auto', 'Auto', 'Manual'],
                      ['Cash Flow Statement', 'Auto', 'Auto', 'Manual'],
                      ['Revenue by Category', 'Auto', 'Auto', '—'],
                      ['Real-time Sync', 'Yes', 'Yes', 'No'],
                    ].map(([type, qb, xero, csv]) => (
                      <tr key={type}>
                        <td>{type}</td>
                        <td>{qb}</td>
                        <td>{xero}</td>
                        <td>{csv}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Troubleshooting */}
              <h2 className={styles.articleSectionTitle}>Troubleshooting</h2>
              <div>
                {[
                  {
                    q: 'The connection keeps failing — what should I do?',
                    a: 'Make sure you\'re logging into the correct company account in QuickBooks or Xero. If you manage multiple companies, the wrong account is the most common cause of connection errors.',
                  },
                  {
                    q: 'My financial data looks incorrect after import.',
                    a: 'Check that your chart of accounts is properly categorized in your accounting software. Exit OSx maps standard account categories, but custom categories may need manual review.',
                  },
                  {
                    q: 'How often does my data sync?',
                    a: 'QuickBooks and Xero connections sync automatically every 24 hours. You can also trigger a manual sync from the Integrations settings page at any time.',
                  },
                ].map((item, i) => (
                  <div key={i} className={styles.troubleshootItem}>
                    <div>
                      <p className={styles.troubleshootQ}>{item.q}</p>
                      <p className={styles.troubleshootA}>{item.a}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Security callout */}
              <div className={styles.securityCallout}>
                <div className={styles.securityCalloutIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <h4>Your data is secure</h4>
                  <p>Exit OSx uses read-only OAuth 2.0 connections. We never store your accounting credentials, and you can revoke access at any time from your accounting provider's connected apps settings.</p>
                </div>
              </div>
            </div>

            {/* Feedback row */}
            <div className={styles.feedbackRow}>
              <span>Was this article helpful?</span>
              <button className={styles.feedbackBtn} type="button" aria-label="This article was helpful">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                  <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
                Yes
              </button>
              <button className={styles.feedbackBtn} type="button" aria-label="This article was not helpful">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                  <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
                </svg>
                No
              </button>
            </div>

            {/* Next article */}
            <Link
              href={`/dashboard/help/${params.category}/understanding-bri-score`}
              className={styles.nextArticle}
            >
              <div>
                <div className={styles.nextArticleLabel}>Next Article</div>
                <div className={styles.nextArticleTitle}>Understanding Your BRI Score</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </article>
        </main>

        {/* Sidebar */}
        <aside className={styles.articleSidebar}>
          <div className={styles.articleSidePanel}>
            <div className={styles.articleSidePanelTitle}>Related Articles</div>
            {RELATED_ARTICLES.map((a) => (
              <Link
                key={a.slug}
                href={`/dashboard/help/${a.categorySlug}/${a.slug}`}
                className={styles.relatedLink}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>{a.title}</span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
