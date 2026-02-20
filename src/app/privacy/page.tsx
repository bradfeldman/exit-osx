import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import styles from '@/components/public/public-legal.module.css'

export const metadata = {
  title: 'Privacy Policy | Exit OSx',
  description: 'Privacy Policy for Exit OSx - Learn how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  const lastUpdated = 'January 19, 2026'

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <a href="https://exitosx.com" className={styles.logoLink}>
            <Image
              src="/logo.webp"
              alt="Exit OSx"
              width={32}
              height={32}
              className={styles.logoIcon}
            />
            <Image
              src="/wordmark.svg"
              alt="Exit OSx"
              width={100}
              height={28}
              className={styles.logoWordmark}
            />
          </a>
          <div className={styles.headerActions}>
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className={styles.main}>
          <div className={styles.prose}>
            <h1 className={styles.pageTitle}>Privacy Policy</h1>
            <p className={styles.lastUpdated}>Last updated: {lastUpdated}</p>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>1. Introduction</h2>
              <p className={styles.sectionText}>
                Exit OSx (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our exit planning platform and services.
              </p>
              <p className={styles.sectionText}>
                We comply with the General Data Protection Regulation (GDPR) and other applicable data protection laws. By using Exit OSx, you consent to the data practices described in this policy.
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>2. Information We Collect</h2>

              <h3 className={styles.sectionSubtitle}>2.1 Personal Information</h3>
              <p className={styles.sectionText}>We collect the following personal information:</p>
              <ul className={styles.bulletList}>
                <li><strong>Account Information:</strong> Email address, full name, and profile picture (via OAuth or Gravatar)</li>
                <li><strong>Authentication Data:</strong> Encrypted passwords and session tokens</li>
                <li><strong>Organization Data:</strong> Company name, role, and team membership</li>
                <li><strong>Usage Data:</strong> Actions taken within the platform, timestamps, and preferences</li>
              </ul>

              <h3 className={styles.sectionSubtitle}>2.2 Financial Information</h3>
              <p className={styles.sectionText}>
                If you connect financial integrations (e.g., QuickBooks), we may access:
              </p>
              <ul className={styles.bulletList}>
                <li>Revenue and expense data</li>
                <li>Financial statements and reports</li>
                <li>Business valuation metrics</li>
              </ul>

              <h3 className={styles.sectionSubtitle}>2.3 Automatically Collected Information</h3>
              <ul className={styles.bulletList}>
                <li>IP address and browser type</li>
                <li>Device information and operating system</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>3. How We Use Your Information</h2>
              <p className={styles.sectionText}>We use your information to:</p>
              <ul className={styles.bulletList}>
                <li>Provide and maintain our exit planning services</li>
                <li>Authenticate and secure your account</li>
                <li>Send transactional emails (invitations, notifications)</li>
                <li>Improve our platform and develop new features</li>
                <li>Comply with legal obligations</li>
                <li>Protect against fraud and abuse</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>4. Legal Basis for Processing (GDPR)</h2>
              <p className={styles.sectionText}>Under GDPR, we process your data based on:</p>
              <ul className={styles.bulletList}>
                <li><strong>Contract:</strong> To provide services you&apos;ve requested</li>
                <li><strong>Consent:</strong> For marketing communications and cookies</li>
                <li><strong>Legitimate Interest:</strong> To improve our services and prevent fraud</li>
                <li><strong>Legal Obligation:</strong> To comply with applicable laws</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>5. Data Sharing and Third Parties</h2>
              <p className={styles.sectionText}>We share your data with:</p>

              <h3 className={styles.sectionSubtitle}>5.1 Service Providers</h3>
              <ul className={styles.bulletList}>
                <li><strong>Supabase:</strong> Database hosting and authentication (EU/US)</li>
                <li><strong>Resend:</strong> Email delivery service</li>
                <li><strong>Vercel:</strong> Application hosting</li>
              </ul>

              <h3 className={styles.sectionSubtitle}>5.2 Integrations (With Your Consent)</h3>
              <ul className={styles.bulletList}>
                <li><strong>QuickBooks:</strong> Financial data synchronization</li>
                <li><strong>Google/GitHub:</strong> OAuth authentication</li>
              </ul>

              <p className={styles.sectionText}>
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>6. Cookies and Tracking</h2>
              <p className={styles.sectionText}>We use the following types of cookies:</p>
              <ul className={styles.bulletList}>
                <li><strong>Essential Cookies:</strong> Required for authentication and security</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how you use our platform (with consent)</li>
              </ul>
              <p className={styles.sectionText}>
                You can manage your cookie preferences through our cookie consent banner or your browser settings.
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>7. Data Retention</h2>
              <p className={styles.sectionText}>We retain your data as follows:</p>
              <ul className={styles.bulletList}>
                <li><strong>Account Data:</strong> Until you delete your account, plus 30 days for recovery</li>
                <li><strong>Financial Data:</strong> Until you disconnect integrations or delete your account</li>
                <li><strong>Deleted Companies:</strong> 30-day soft delete period before permanent removal</li>
                <li><strong>Audit Logs:</strong> 2 years for security and compliance</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>8. Your Rights (GDPR)</h2>
              <p className={styles.sectionText}>Under GDPR, you have the right to:</p>
              <ul className={styles.bulletList}>
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
                <li><strong>Erasure:</strong> Request deletion of your data (&quot;right to be forgotten&quot;)</li>
                <li><strong>Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Restriction:</strong> Limit how we process your data</li>
                <li><strong>Objection:</strong> Object to certain types of processing</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
              </ul>
              <p className={styles.sectionText}>
                To exercise these rights, visit your{' '}
                <Link href="/dashboard/settings?tab=account" className={styles.link}>
                  account settings
                </Link>{' '}
                or contact us at{' '}
                <a href="mailto:privacy@exitosx.com" className={styles.link}>
                  privacy@exitosx.com
                </a>.
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>9. Data Security</h2>
              <p className={styles.sectionText}>We protect your data through:</p>
              <ul className={styles.bulletList}>
                <li>Encryption in transit (TLS/SSL) and at rest</li>
                <li>Secure authentication with Supabase Auth</li>
                <li>Regular security audits and monitoring</li>
                <li>Access controls and role-based permissions</li>
                <li>Secure data centers with SOC 2 compliance</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>10. International Data Transfers</h2>
              <p className={styles.sectionText}>
                Your data may be transferred to and processed in countries outside your jurisdiction. We ensure appropriate safeguards through:
              </p>
              <ul className={styles.bulletList}>
                <li>Standard Contractual Clauses (SCCs) with service providers</li>
                <li>Data processing agreements with all third parties</li>
                <li>Privacy Shield certifications where applicable</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>11. Children&apos;s Privacy</h2>
              <p className={styles.sectionText}>
                Exit OSx is not intended for users under 16 years of age. We do not knowingly collect personal information from children. If you believe we have collected data from a child, please contact us immediately.
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>12. Changes to This Policy</h2>
              <p className={styles.sectionText}>
                We may update this Privacy Policy periodically. We will notify you of material changes via email or through the platform. Continued use after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>13. Contact Us</h2>
              <p className={styles.sectionText}>
                For privacy-related questions or to exercise your rights:
              </p>
              <ul className={styles.plainList}>
                <li><strong>Email:</strong> <a href="mailto:privacy@exitosx.com" className={styles.link}>privacy@exitosx.com</a></li>
                <li><strong>Data Protection Officer:</strong> <a href="mailto:dpo@exitosx.com" className={styles.link}>dpo@exitosx.com</a></li>
              </ul>
              <p className={styles.sectionText}>
                If you are unsatisfied with our response, you have the right to lodge a complaint with your local data protection authority.
              </p>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <p className={styles.footerCopy}>&copy; {new Date().getFullYear()} Exit OSx. All rights reserved.</p>
            <nav className={styles.footerNav}>
              <Link href="/privacy" className={styles.footerNavLinkActive}>Privacy</Link>
              <Link href="/terms" className={styles.footerNavLink}>Terms</Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  )
}
