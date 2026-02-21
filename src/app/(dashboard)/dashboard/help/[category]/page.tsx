'use client'

import Link from 'next/link'
import styles from '@/components/help/help.module.css'

// TODO: wire to API — fetch category + articles by slug
const CATEGORY = {
  slug: 'getting-started',
  title: 'Getting Started',
  description: 'Learn the basics of Exit OSx, set up your account, and connect your data sources.',
  articleCount: 12,
}

const ARTICLES = [
  { slug: 'create-company-profile', title: 'Creating Your Company Profile', desc: 'Set up your business details, ownership structure, and key financial metrics to get your first valuation estimate.', difficulty: 'beginner', readTime: '3 min', date: 'Jan 15, 2026' },
  { slug: 'connect-accounting', title: 'How to Connect Your Accounting Software', desc: 'Link QuickBooks, Xero, or upload a CSV to automatically import your financials and keep your valuation up to date.', difficulty: 'beginner', readTime: '5 min', date: 'Jan 12, 2026' },
  { slug: 'understanding-bri-score', title: 'Understanding Your BRI Score', desc: 'Learn what the Business Readiness Index measures, how it\'s calculated, and what you can do to improve it.', difficulty: 'beginner', readTime: '4 min', date: 'Jan 10, 2026' },
  { slug: 'complete-assessment', title: 'Completing Your Exit Readiness Assessment', desc: 'Walk through the 8-question QuickScan and deeper DeepDive questions that power your personalized exit plan.', difficulty: 'intermediate', readTime: '6 min', date: 'Jan 8, 2026' },
  { slug: 'invite-advisor', title: 'Inviting Your Financial Advisor or M&A Attorney', desc: 'Share secure access with your trusted advisors so they can review your data, add notes, and collaborate on your exit plan.', difficulty: 'beginner', readTime: '3 min', date: 'Jan 5, 2026' },
  { slug: 'deal-room-intro', title: 'Introduction to the Deal Room', desc: 'Understand how the buyer pipeline works, how to manage NDAs and documents, and how to track deal progress.', difficulty: 'intermediate', readTime: '7 min', date: 'Dec 28, 2025' },
  { slug: 'playbooks-overview', title: 'How Exit Playbooks Work', desc: 'Discover how playbooks give you step-by-step guidance to increase your business value and exit readiness.', difficulty: 'beginner', readTime: '4 min', date: 'Dec 20, 2025' },
  { slug: 'valuation-methods', title: 'Understanding Your Three Valuation Methods', desc: 'Learn how the Multiples, DCF, and Comparables methods each contribute to your overall estimated enterprise value.', difficulty: 'intermediate', readTime: '8 min', date: 'Dec 18, 2025' },
  { slug: 'user-roles', title: 'User Roles and Permissions Explained', desc: 'See what each role (Owner, Admin, Member, Viewer, Advisor) can access and how to assign the right permissions.', difficulty: 'beginner', readTime: '3 min', date: 'Dec 15, 2025' },
  { slug: 'action-center', title: 'Using the Action Center', desc: 'Create tasks, delegate to team members, track progress, and connect actions directly to your improvement playbooks.', difficulty: 'beginner', readTime: '4 min', date: 'Dec 10, 2025' },
  { slug: 'signals-overview', title: 'What Are Signals and How to Act on Them', desc: 'Signals alert you to changes in your business health, market conditions, and exit readiness — and suggest what to do next.', difficulty: 'intermediate', readTime: '5 min', date: 'Dec 5, 2025' },
  { slug: 'data-room', title: 'Setting Up Your Virtual Data Room', desc: 'Organize and securely share due diligence documents with potential buyers. Learn what to include and when.', difficulty: 'advanced', readTime: '9 min', date: 'Nov 28, 2025' },
]

const OTHER_CATEGORIES = [
  { slug: 'valuation', title: 'Valuation & Financials', count: 15 },
  { slug: 'exit-planning', title: 'Exit Planning', count: 11 },
  { slug: 'deal-room', title: 'Deal Room & Buyers', count: 9 },
  { slug: 'improving-value', title: 'Improving Business Value', count: 14 },
  { slug: 'account', title: 'Account & Billing', count: 7 },
]

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const DIFFICULTY_CLASSES: Record<string, string> = {
  beginner: styles.diffBeginner,
  intermediate: styles.diffIntermediate,
  advanced: styles.diffAdvanced,
}

export default function HelpCategoryPage({
  params,
}: {
  params: { category: string }
}) {
  // TODO: wire to API — fetch category by params.category slug

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/help">Help</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>{CATEGORY.title}</span>
      </nav>

      <div className={styles.helpLayout}>
        {/* Main column */}
        <main>
          {/* Category header */}
          <div className={styles.categoryHeaderCard}>
            <div className={`${styles.categoryHeaderIcon} ${styles.iconBlue}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className={styles.categoryHeaderInfo}>
              <h1>{CATEGORY.title}</h1>
              <p>{CATEGORY.description}</p>
            </div>
          </div>

          {/* Article list */}
          <div className={styles.catArticleList} role="list">
            {ARTICLES.map((article, i) => (
              <Link
                key={article.slug}
                href={`/dashboard/help/${params.category}/${article.slug}`}
                className={styles.catArticleItem}
                role="listitem"
              >
                <div className={styles.catArticleNum} aria-hidden="true">{i + 1}</div>
                <div className={styles.catArticleBody}>
                  <div className={styles.catArticleTitle}>{article.title}</div>
                  <p className={styles.catArticleDesc}>{article.desc}</p>
                  <div className={styles.catArticleMeta}>
                    <span className={`${styles.diffBadge} ${DIFFICULTY_CLASSES[article.difficulty]}`}>
                      {DIFFICULTY_LABELS[article.difficulty]}
                    </span>
                    <span className={styles.catMetaItem}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {article.readTime} read
                    </span>
                    <span className={styles.catMetaItem}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {article.date}
                    </span>
                  </div>
                </div>
                <div className={styles.catArticleArrow} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </main>

        {/* Sidebar */}
        <aside>
          {/* Other categories */}
          <div className={styles.helpSidebarPanel}>
            <div className={styles.helpSidebarTitle}>Other Categories</div>
            {OTHER_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/dashboard/help/${cat.slug}`}
                className={styles.helpCatLink}
              >
                {cat.title}
                <span className={styles.helpCatCount}>{cat.count}</span>
              </Link>
            ))}
          </div>

          {/* Need help card */}
          <div className={styles.needHelpSideCard}>
            <h3>Still need help?</h3>
            <p>Can't find what you're looking for? Our support team typically responds within 2 hours.</p>
            <Link href="/dashboard/help/contact" className={styles.btnContact}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              Contact Support
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
