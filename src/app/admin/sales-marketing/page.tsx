import { TrendingUp, Users, Mail, BarChart3, Megaphone, Target } from 'lucide-react'
import styles from '@/components/admin/admin-misc.module.css'

const upcomingFeatures = [
  {
    title: 'Marketing Dashboard',
    description: 'Track campaign performance, conversion rates, and ROI',
    icon: BarChart3,
  },
  {
    title: 'User Acquisition',
    description: 'Monitor signups, activation rates, and user sources',
    icon: Users,
  },
  {
    title: 'Email Campaigns',
    description: 'Create and manage email marketing campaigns',
    icon: Mail,
  },
  {
    title: 'Conversion Funnels',
    description: 'Analyze user journey and identify drop-off points',
    icon: Target,
  },
  {
    title: 'A/B Testing',
    description: 'Run experiments to optimize conversion rates',
    icon: TrendingUp,
  },
  {
    title: 'Announcements',
    description: 'Manage in-app announcements and feature promotions',
    icon: Megaphone,
  },
]

export default function SalesMarketingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Sales & Marketing</h1>
        <p className={styles.pageSubtitle}>
          Marketing tools, analytics, and campaign management
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className={`${styles.bannerCard} ${styles.bannerCardGreen}`}>
        <div className={styles.bannerHeader}>
          <div className={styles.bannerHeaderInner}>
            <div className={`${styles.bannerIconWrap} ${styles.bannerIconGreen}`}>
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className={styles.bannerTitle}>Coming Soon</p>
              <p className={styles.bannerDescription}>
                Marketing tools are under development and will be available soon
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Planned Features */}
      <div>
        <h2 className={styles.sectionHeading}>Planned Features</h2>
        <div className={`${styles.toolsGrid} ${styles.toolsGrid3}`}>
          {upcomingFeatures.map((feature) => (
            <div key={feature.title} className={`${styles.toolCard} ${styles.toolCardDimmed}`}>
              <div className={styles.toolCardHeader}>
                <feature.icon className={`h-8 w-8 ${styles.toolCardIconGreen}`} style={{ marginBottom: 8 }} />
                <p className={styles.toolCardTitle}>{feature.title}</p>
                <p className={styles.toolCardDescription}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
