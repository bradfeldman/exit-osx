'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils/currency'
import styles from '@/components/report/report.module.css'

interface ReportData {
  companyName: string
  industry: string | null
  briScore: number
  currentValue: number
  potentialValue: number
  valueGap: number
  categoryScores: Array<{ category: string; score: number }>
  topTasks: Array<{
    title: string
    description: string
    category: string
    estimatedValue: number
  }>
  generatedAt: string
}

function getBriLabel(score: number) {
  if (score >= 80) return { label: 'Strong', scoreClass: styles.scoreStrong, barClass: styles.briBarStrong }
  if (score >= 60) return { label: 'Good', scoreClass: styles.scoreGood, barClass: styles.briBarGood }
  if (score >= 40) return { label: 'Moderate', scoreClass: styles.scoreModerate, barClass: styles.briBarModerate }
  return { label: 'Needs Work', scoreClass: styles.scoreWeak, barClass: styles.briBarWeak }
}

function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    'Financial': '💰',
    'Transferability': '🔄',
    'Operational': '⚙️',
    'Market': '📊',
    'Legal & Tax': '⚖️',
    'Personal': '👤',
  }
  return icons[category] || '📋'
}

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/report/${token}`)
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error || 'Failed to load report')
        }
        setData(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    if (token) loadReport()
  }, [token])

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingInner}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.errorScreen}>
        <div className={styles.errorInner}>
          <h1 className={styles.errorTitle}>Report Not Available</h1>
          <p className={styles.errorMessage}>{error || 'This report link is invalid or has expired.'}</p>
          <a href="https://exitosx.com" className={styles.errorLink}>
            Learn about Exit OSx
          </a>
        </div>
      </div>
    )
  }

  const bri = getBriLabel(data.briScore)
  const strengths = data.categoryScores.filter(c => c.score >= 60).sort((a, b) => b.score - a.score)
  const risks = data.categoryScores.filter(c => c.score < 60).sort((a, b) => a.score - b.score)

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerBrand}>
            <Image src="/logo.webp" alt="Exit OSx" width={28} height={28} />
            <span className={styles.headerBrandName}>
              Exit OS<span className={styles.headerBrandAccent}>x</span>
            </span>
          </div>
          <span className={styles.headerLabel}>Exit Readiness Report</span>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero */}
        <div className={styles.hero}>
          <p className={styles.heroEyebrow}>Exit Readiness Report</p>
          <h1 className={styles.heroTitle}>{data.companyName}</h1>
          {data.industry && (
            <p className={styles.heroIndustry}>{data.industry}</p>
          )}

          <div className={styles.heroMetrics}>
            <div className={styles.heroMetric}>
              <p className={styles.heroMetricLabel}>Estimated Value</p>
              <p className={styles.heroMetricValue}>{formatCurrency(data.currentValue)}</p>
            </div>
            <div className={styles.heroMetric}>
              <p className={styles.heroMetricLabel}>Potential Value</p>
              <p className={styles.heroMetricValueGreen}>{formatCurrency(data.potentialValue)}</p>
            </div>
            <div className={styles.heroMetricGap}>
              <p className={styles.heroMetricLabelGap}>Value Gap</p>
              <p className={styles.heroMetricValueAmber}>{formatCurrency(data.valueGap)}</p>
            </div>
          </div>
        </div>

        {/* BRI Score */}
        <div className={styles.card}>
          <div className={styles.briRow}>
            <div>
              <p className={styles.briLabel}>Buyer Readiness Index</p>
              <p className={styles.briSubLabel}>How attractive this business is to potential buyers</p>
            </div>
            <div className={styles.briScore}>
              <span className={`${styles.briScoreValue} ${bri.scoreClass}`}>{data.briScore}</span>
              <span className={styles.briScoreTotal}>/100</span>
              <p className={`${styles.briScoreLabel} ${bri.scoreClass}`}>{bri.label}</p>
            </div>
          </div>
          <div className={styles.briTrack}>
            <div
              className={`${styles.briBar} ${bri.barClass}`}
              style={{ width: `${data.briScore}%` }}
            />
          </div>
        </div>

        {/* Category Breakdown */}
        <div className={styles.categoryGrid}>
          {/* Strengths */}
          <div className={styles.card}>
            <h3 className={`${styles.categoryGroupTitle} ${styles.categoryGroupTitleStrengths}`}>
              <span className={`${styles.categoryDot} ${styles.categoryDotGreen}`} />
              Strengths
            </h3>
            {strengths.length === 0 ? (
              <p className={styles.categoryEmpty}>No areas scoring above 60 yet</p>
            ) : (
              <div className={styles.categoryList}>
                {strengths.map(cat => (
                  <div key={cat.category} className={styles.categoryItem}>
                    <div className={styles.categoryItemRow}>
                      <span className={styles.categoryName}>
                        {getCategoryIcon(cat.category)} {cat.category}
                      </span>
                      <span className={styles.categoryScoreStrength}>{cat.score}</span>
                    </div>
                    <div className={`${styles.categoryTrack} ${styles.categoryTrackGreen}`}>
                      <div
                        className={`${styles.categoryBar} ${styles.categoryBarGreen}`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Risks */}
          <div className={styles.card}>
            <h3 className={`${styles.categoryGroupTitle} ${styles.categoryGroupTitleRisks}`}>
              <span className={`${styles.categoryDot} ${styles.categoryDotRed}`} />
              Areas to Improve
            </h3>
            {risks.length === 0 ? (
              <p className={styles.categoryEmpty}>All areas scoring above 60</p>
            ) : (
              <div className={styles.categoryList}>
                {risks.map(cat => (
                  <div key={cat.category} className={styles.categoryItem}>
                    <div className={styles.categoryItemRow}>
                      <span className={styles.categoryName}>
                        {getCategoryIcon(cat.category)} {cat.category}
                      </span>
                      <span className={styles.categoryScoreRisk}>{cat.score}</span>
                    </div>
                    <div className={`${styles.categoryTrack} ${styles.categoryTrackRed}`}>
                      <div
                        className={`${styles.categoryBar} ${styles.categoryBarRed}`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Priority Actions */}
        {data.topTasks.length > 0 && (
          <div className={styles.card}>
            <h3 className={styles.actionsTitle}>Top Priority Actions</h3>
            <div className={styles.actionsList}>
              {data.topTasks.map((task, i) => (
                <div key={i} className={styles.actionItem}>
                  <span className={styles.actionNumber}>{i + 1}</span>
                  <div className={styles.actionBody}>
                    <p className={styles.actionTitle}>{task.title}</p>
                    {task.estimatedValue > 0 && (
                      <p className={styles.actionImpact}>
                        Potential impact: {formatCurrency(task.estimatedValue)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className={styles.cta}>
          <h3 className={styles.ctaTitle}>Ready to close the value gap?</h3>
          <p className={styles.ctaBody}>
            Exit OSx helps business owners systematically increase their company&apos;s value and prepare for a successful exit.
          </p>
          <a href="https://exitosx.com" className={styles.ctaLink}>
            Get Started Free
          </a>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p>Generated {new Date(data.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p className={styles.footerLine}>&copy; {new Date().getFullYear()} Exit OSx. All rights reserved.</p>
        </div>
      </main>
    </div>
  )
}
