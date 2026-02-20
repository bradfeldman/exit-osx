import { Scale, TrendingUp, Calculator, SlidersHorizontal, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import styles from '@/components/admin/admin-misc.module.css'

const tools = [
  {
    title: 'BRI Weights',
    description: 'Configure Business Readiness Index category weights for scoring',
    icon: Scale,
    href: '/admin/tools/bri-weights',
  },
  {
    title: 'Industry Multiples',
    description: 'Manage valuation multiples by industry sector',
    icon: TrendingUp,
    href: '/admin/tools/industry-multiples',
  },
  {
    title: 'Multiple Adjustment',
    description: 'Configure adjustments to valuation multiples',
    icon: Calculator,
    href: '/admin/tools/multiple-adjustment',
  },
  {
    title: 'Global BRI Weighting',
    description: 'System-wide BRI configuration and defaults',
    icon: SlidersHorizontal,
    href: '/admin/tools/bri-weighting',
  },
]

export default function VariablesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Variable Management</h1>
        <p className={styles.pageSubtitle}>
          Configure BRI weights, industry multiples, and valuation adjustments
        </p>
      </div>

      {/* Info Banner */}
      <div className={`${styles.bannerCard} ${styles.bannerCardPurple}`}>
        <div className={styles.bannerHeader}>
          <div className={styles.bannerHeaderInner}>
            <div className={`${styles.bannerIconWrap} ${styles.bannerIconPurple}`}>
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div>
              <p className={styles.bannerTitle}>System Variables</p>
              <p className={styles.bannerDescription}>
                These settings affect valuation calculations and BRI scores across all companies
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className={styles.sectionHeading}>Configuration Tools</h2>
        <div className={`${styles.toolsGrid} ${styles.toolsGrid2}`}>
          {tools.map((tool) => (
            <Link key={tool.title} href={tool.href} className={styles.toolCard}>
              <div className={styles.toolCardHeader}>
                <div className={styles.toolCardIconRow}>
                  <tool.icon className={`h-8 w-8 ${styles.toolCardIconPurple}`} />
                  <ArrowRight className={`h-5 w-5 ${styles.toolCardIconGray}`} />
                </div>
                <p className={styles.toolCardTitle}>{tool.title}</p>
                <p className={styles.toolCardDescription}>{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Documentation */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderInner}>
            <p className={styles.cardTitle}>How Variables Affect Calculations</p>
          </div>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.docSection}>
            <div className={styles.docItem}>
              <h3 className={styles.docItemTitle}>BRI Weights</h3>
              <p>
                Define how each category (Financial Health, Growth, Operations, etc.) contributes to the overall
                Business Readiness Index score. Weights must sum to 100%.
              </p>
            </div>
            <div className={styles.docItem}>
              <h3 className={styles.docItemTitle}>Industry Multiples</h3>
              <p>
                Set baseline valuation multiples (revenue, EBITDA, etc.) for each industry sector.
                These form the foundation of company valuations.
              </p>
            </div>
            <div className={styles.docItem}>
              <h3 className={styles.docItemTitle}>Multiple Adjustments</h3>
              <p>
                Configure how various factors (growth rate, profitability, risk) adjust the base
                industry multiple up or down.
              </p>
            </div>
            <div className={styles.docItem}>
              <h3 className={styles.docItemTitle}>Global BRI Weighting</h3>
              <p>
                System-wide settings that affect how BRI scores are calculated and displayed
                across all companies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
