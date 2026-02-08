import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Terms of Service | Exit OSx',
  description: 'Terms of Service for Exit OSx - Rules and conditions for using our exit planning platform.',
}

export default function TermsPage() {
  const lastUpdated = 'January 19, 2026'

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.webp"
              alt="Exit OSx"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <Image
              src="/wordmark.svg"
              alt="Exit OSx"
              width={100}
              height={28}
              className="h-6 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="py-12">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
            <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Agreement to Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing or using Exit OSx (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service.
              </p>
              <p className="text-muted-foreground mb-4">
                These Terms constitute a legally binding agreement between you and Exit OSx (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground mb-4">
                Exit OSx is a business exit planning platform that provides:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Business readiness assessments and scoring</li>
                <li>Exit planning task management and playbooks</li>
                <li>Financial analysis and valuation tools</li>
                <li>Document management (data room)</li>
                <li>Team collaboration features</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Accounts</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">3.1 Account Creation</h3>
              <p className="text-muted-foreground mb-4">
                To use the Service, you must create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mb-3">3.2 Account Requirements</h3>
              <p className="text-muted-foreground mb-4">
                You must be at least 18 years old and have the legal capacity to enter into these Terms. If using the Service on behalf of an organization, you represent that you have authority to bind that organization.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Acceptable Use</h2>
              <p className="text-muted-foreground mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Use the Service for fraudulent purposes</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Scrape, harvest, or collect data without permission</li>
                <li>Impersonate others or misrepresent your affiliation</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Subscription and Payments</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">5.1 Pricing Plans</h3>
              <p className="text-muted-foreground mb-4">
                The Service offers various subscription plans as described on our{' '}
                <Link href="/pricing" className="text-primary hover:underline">pricing page</Link>.
                Prices are subject to change with 30 days notice.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3">5.2 Billing</h3>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Subscriptions are billed in advance on a monthly or annual basis</li>
                <li>All fees are non-refundable except as required by law</li>
                <li>You authorize us to charge your payment method automatically</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mb-3">5.3 Free Trial</h3>
              <p className="text-muted-foreground mb-4">
                We may offer a free trial period. At the end of the trial, your subscription will automatically convert to a paid plan unless cancelled.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3">5.4 Cancellation</h3>
              <p className="text-muted-foreground mb-4">
                You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial months.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Your Content</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">6.1 Ownership</h3>
              <p className="text-muted-foreground mb-4">
                You retain ownership of all content you upload to the Service (&quot;Your Content&quot;). We do not claim ownership of Your Content.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3">6.2 License Grant</h3>
              <p className="text-muted-foreground mb-4">
                By uploading content, you grant us a limited license to store, display, and process Your Content solely to provide the Service to you.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3">6.3 Responsibility</h3>
              <p className="text-muted-foreground mb-4">
                You are solely responsible for Your Content and represent that you have all necessary rights to upload it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground mb-4">
                The Service, including its design, features, and content (excluding Your Content), is owned by Exit OSx and protected by intellectual property laws. You may not:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Copy, modify, or distribute our software</li>
                <li>Reverse engineer or decompile the Service</li>
                <li>Use our trademarks without permission</li>
                <li>Remove any proprietary notices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Privacy and Data Protection</h2>
              <p className="text-muted-foreground mb-4">
                Your use of the Service is also governed by our{' '}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>,
                which describes how we collect, use, and protect your personal information.
              </p>
              <p className="text-muted-foreground mb-4">
                We comply with GDPR and other applicable data protection laws. You have rights regarding your personal data as described in our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground mb-4">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>MERCHANTABILITY</li>
                <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                <li>NON-INFRINGEMENT</li>
                <li>ACCURACY OR RELIABILITY OF RESULTS</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                <strong>Exit OSx does not provide financial, legal, or tax advice.</strong> The valuations, assessments, and recommendations provided are for informational purposes only. Consult qualified professionals before making business decisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, EXIT OSx SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Indirect, incidental, special, or consequential damages</li>
                <li>Loss of profits, data, or business opportunities</li>
                <li>Damages exceeding the fees paid in the 12 months preceding the claim</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                Some jurisdictions do not allow limitation of liability, so these limitations may not apply to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Indemnification</h2>
              <p className="text-muted-foreground mb-4">
                You agree to indemnify and hold harmless Exit OSx, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your Content</li>
                <li>Your violation of any third-party rights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Termination</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">12.1 By You</h3>
              <p className="text-muted-foreground mb-4">
                You may terminate your account at any time through your account settings or by contacting support.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3">12.2 By Us</h3>
              <p className="text-muted-foreground mb-4">
                We may suspend or terminate your account if you violate these Terms, with or without notice depending on the severity of the violation.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3">12.3 Effect of Termination</h3>
              <p className="text-muted-foreground mb-4">
                Upon termination, your right to use the Service ceases. We may delete Your Content after a 30-day grace period. Sections that by their nature should survive termination will remain in effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Modifications to Terms</h2>
              <p className="text-muted-foreground mb-4">
                We may modify these Terms at any time. We will notify you of material changes via email or through the Service at least 30 days before they take effect. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">14. Governing Law and Disputes</h2>
              <p className="text-muted-foreground mb-4">
                These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law principles.
              </p>
              <p className="text-muted-foreground mb-4">
                Any disputes arising from these Terms or the Service shall be resolved through binding arbitration, except that either party may seek injunctive relief in court for intellectual property violations.
              </p>
              <p className="text-muted-foreground mb-4">
                For EU users: You may also have rights under the laws of your country of residence, and nothing in these Terms limits those rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">15. General Provisions</h2>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and Exit OSx.</li>
                <li><strong>Severability:</strong> If any provision is found invalid, the remaining provisions remain in effect.</li>
                <li><strong>Waiver:</strong> Failure to enforce a provision does not waive our right to enforce it later.</li>
                <li><strong>Assignment:</strong> You may not assign these Terms without our consent. We may assign these Terms freely.</li>
                <li><strong>Force Majeure:</strong> We are not liable for failures due to circumstances beyond our reasonable control.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">16. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                For questions about these Terms:
              </p>
              <ul className="list-none text-muted-foreground mb-4 space-y-2">
                <li><strong>Email:</strong> <a href="mailto:legal@exitosx.com" className="text-primary hover:underline">legal@exitosx.com</a></li>
                <li><strong>Support:</strong> <a href="mailto:support@exitosx.com" className="text-primary hover:underline">support@exitosx.com</a></li>
              </ul>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-border">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Exit OSx. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="text-foreground font-medium">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
