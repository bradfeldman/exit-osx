import { Camera, ListTodo, Code, Terminal, Database, Bug, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import styles from '@/components/admin/admin-misc.module.css'

const tools = [
  {
    title: 'Snapshot Tool',
    description: 'Create and manage valuation snapshots for debugging and analysis',
    icon: Camera,
    href: '/admin/tools/snapshot',
  },
  {
    title: 'Task Viewer',
    description: 'View and debug background tasks and jobs',
    icon: ListTodo,
    href: '/admin/tools/task-viewer',
  },
]

const comingSoon = [
  {
    title: 'API Playground',
    description: 'Test API endpoints with interactive documentation',
    icon: Terminal,
  },
  {
    title: 'Database Explorer',
    description: 'Browse and query database records safely',
    icon: Database,
  },
  {
    title: 'Error Tracker',
    description: 'Monitor and debug application errors',
    icon: Bug,
  },
  {
    title: 'Feature Flags',
    description: 'Toggle features for testing and rollout',
    icon: Code,
  },
]

export default function RDPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>R&D</h1>
        <p className={styles.pageSubtitle}>
          Developer tools, debugging utilities, and system diagnostics
        </p>
      </div>

      {/* Warning Banner */}
      <div className={`${styles.bannerCard} ${styles.bannerCardRed}`}>
        <div className={styles.bannerHeader}>
          <div className={styles.bannerHeaderInner}>
            <div className={`${styles.bannerIconWrap} ${styles.bannerIconRed}`}>
              <Code className="h-6 w-6" />
            </div>
            <div>
              <p className={styles.bannerTitle}>Developer Tools</p>
              <p className={styles.bannerDescription}>
                These tools are intended for development and debugging purposes. Use with caution in production.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tools */}
      <div>
        <h2 className={styles.sectionHeading}>Available Tools</h2>
        <div className={`${styles.toolsGrid} ${styles.toolsGrid2}`}>
          {tools.map((tool) => (
            <Link key={tool.title} href={tool.href} className={styles.toolCard}>
              <div className={styles.toolCardHeader}>
                <div className={styles.toolCardIconRow}>
                  <tool.icon className={`h-8 w-8 ${styles.toolCardIconRed}`} />
                  <ArrowRight className={`h-5 w-5 ${styles.toolCardIconGray}`} />
                </div>
                <p className={styles.toolCardTitle}>{tool.title}</p>
                <p className={styles.toolCardDescription}>{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className={styles.sectionHeading}>Coming Soon</h2>
        <div className={`${styles.toolsGrid} ${styles.toolsGrid2}`}>
          {comingSoon.map((tool) => (
            <div key={tool.title} className={`${styles.toolCard} ${styles.toolCardDimmed}`}>
              <div className={styles.toolCardHeader}>
                <tool.icon className={`h-8 w-8 ${styles.toolCardIconGray}`} style={{ marginBottom: 8 }} />
                <p className={styles.toolCardTitle}>{tool.title}</p>
                <p className={styles.toolCardDescription}>{tool.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
