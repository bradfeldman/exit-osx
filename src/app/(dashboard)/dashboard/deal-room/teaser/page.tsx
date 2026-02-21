'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/deal-room/deal-room.module.css'

/* TODO: wire to API */

export default function BuyerTeaserPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [showAiSuggestion, setShowAiSuggestion] = useState(true)
  const totalPages = 2

  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/deal-room">Deal Room</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Buyer Teaser</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <div className={styles.pageHeaderTitleRow}>
            <h1>Buyer-Facing Teaser</h1>
            <span className={styles.badgeDraft}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Draft
            </span>
          </div>
          <p>Reynolds HVAC Services — anonymous overview for qualified buyers</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
          <button className={`${styles.btn} ${styles.btnOrange}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72" />
            </svg>
            Publish Teaser
          </button>
        </div>
      </div>

      {/* Draft Warning Banner */}
      <div className={styles.draftBanner}>
        <div className={styles.draftBannerLeft}>
          <div className={styles.draftBannerIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div className={styles.draftBannerTitle}>This teaser is in Draft — not visible to buyers</div>
            <div className={styles.draftBannerSubtitle}>Review the content below and publish when ready to share with NDAs</div>
          </div>
        </div>
        <div className={styles.draftBannerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>Edit Content</button>
          <button className={`${styles.btn} ${styles.btnOrange} ${styles.btnSm}`}>Publish</button>
        </div>
      </div>

      {/* AI Suggestion */}
      {showAiSuggestion && (
        <div className={styles.aiSuggestion}>
          <div className={styles.aiSuggestionIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div className={styles.aiSuggestionContent}>
            <div className={styles.aiSuggestionLabel}>AI Suggestion</div>
            <div className={styles.aiSuggestionText}>
              Your teaser mentions <span className={styles.aiSuggestionHighlight}>revenue growth</span> but doesn&apos;t include the{' '}
              <strong>recurring revenue percentage (68%)</strong>. PE buyers weight this heavily — adding it could increase buyer interest by 20-30%.
            </div>
            <div className={styles.aiSuggestionAction}>
              <a href="#">Add recurring revenue data &rarr;</a>
            </div>
          </div>
          <button className={styles.aiSuggestionDismiss} onClick={() => setShowAiSuggestion(false)} aria-label="Dismiss suggestion">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Report Viewer Bar */}
      <div className={styles.reportViewerBar}>
        <div className={styles.reportViewerInfo}>
          <div className={styles.reportViewerIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <div className={styles.reportViewerTitle}>Reynolds HVAC Services — Confidential Information Memorandum</div>
            <div className={styles.reportViewerMeta}>Draft · 2 pages · Last updated Dec 20, 2024</div>
          </div>
        </div>
        <div className={styles.reportViewerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Document Container */}
      <div className={styles.documentContainer}>
        {/* Page 1: Cover */}
        {currentPage === 1 && (
          <div className={styles.docPage}>
            <div className={styles.teaserCover}>
              <div className={styles.teaserCoverHeader}>
                <div className={styles.teaserCoverLogo}>
                  <svg viewBox="0 0 32 32" fill="none" style={{ width: 28, height: 28 }}>
                    <rect width="32" height="32" rx="8" fill="#0071E3" />
                    <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className={styles.teaserCoverLogoText}>Exit OS</span>
                </div>
                <div className={styles.teaserCoverTags}>
                  <span className={`${styles.teaserTag} ${styles.teaserTagConfidential}`}>Confidential</span>
                  <span className={`${styles.teaserTag} ${styles.teaserTagDraft}`}>Draft</span>
                  <span className={`${styles.teaserTag} ${styles.teaserTagOpportunity}`}>Acquisition Opportunity</span>
                </div>
              </div>

              <div className={styles.teaserCoverType}>Home Services · HVAC · Florida</div>
              <div className={styles.teaserCoverHeadline}>
                Established HVAC Services Company<br />Seeking Strategic Exit
              </div>
              <div className={styles.teaserCoverSub}>
                20-year-old residential and commercial HVAC business with strong recurring revenue and a loyal customer base in Southwest Florida.
              </div>

              <div className={styles.teaserDivider} />

              <div className={styles.teaserCoverMetaGrid}>
                {[
                  { label: 'Revenue', value: '$4.2M', note: 'TTM' },
                  { label: 'EBITDA', value: '$1.28M', note: '30.5% margin' },
                  { label: 'Founded', value: '2004', note: '20 years' },
                  { label: 'Employees', value: '38', note: 'Full-time' },
                ].map((cell) => (
                  <div key={cell.label} className={styles.teaserMetaCell}>
                    <div className={styles.teaserMetaLabel}>{cell.label}</div>
                    <div className={styles.teaserMetaValue}>{cell.value}</div>
                    <div className={styles.teaserMetaNote}>{cell.note}</div>
                  </div>
                ))}
              </div>

              <div className={styles.teaserFinHighlights}>
                {[
                  { label: 'Recurring Revenue', value: '68%', note: 'Service contracts', iconClass: styles.teaserFinIconBlue },
                  { label: 'Revenue Growth', value: '+12%', note: 'YoY (3-yr avg)', iconClass: styles.teaserFinIconGreen },
                  { label: 'Customer Retention', value: '91%', note: 'Annual service', iconClass: styles.teaserFinIconTeal },
                  { label: 'Asking Multiple', value: '6.5–7.5x', note: 'EBITDA', iconClass: styles.teaserFinIconPurple },
                ].map((item) => (
                  <div key={item.label} className={styles.teaserFinItem}>
                    <div className={`${styles.teaserFinIcon} ${item.iconClass}`}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                    </div>
                    <div>
                      <div className={styles.teaserFinLabel}>{item.label}</div>
                      <div className={styles.teaserFinValue}>{item.value}</div>
                      <div className={styles.teaserFinNote}>{item.note}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.teaserDisclaimerCover}>
                <div className={styles.teaserDisclaimerText}>
                  This document is strictly confidential and is being provided solely for informational purposes. No representations or warranties are made regarding the accuracy of the information herein.
                </div>
                <div className={styles.teaserPageNum}>Page 1 of 2</div>
              </div>
            </div>
          </div>
        )}

        {/* Page 2: Body */}
        {currentPage === 2 && (
          <div className={styles.docPage}>
            <div className={styles.teaserBody}>
              <div className={styles.teaserHeader}>
                <span className={styles.teaserHeaderLeft}>Reynolds HVAC Services — Confidential</span>
                <span className={styles.teaserHeaderRight}>Draft · For discussion purposes only</span>
              </div>

              {/* Investment Thesis */}
              <div className={styles.teaserSection}>
                <div className={styles.teaserSectionTitle}>Investment Thesis</div>
                <div className={styles.teaserSectionHeading}>A platform-ready HVAC services business with recurring revenue and strong operational infrastructure</div>
                <ul className={styles.thesisList}>
                  {[
                    'Dominant market position in a high-growth Florida coastal market with limited seasonal risk',
                    '68% recurring revenue from service contracts provides predictable cash flow and customer retention',
                    'Fully documented SOPs and trained management team ready for ownership transition',
                    'Proven add-on acquisition playbook — 3 bolt-on acquisitions completed in last 5 years',
                  ].map((item, i) => (
                    <li key={i} className={styles.thesisItem}>
                      <span className={styles.thesisNum}>{i + 1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Growth Opportunities */}
              <div className={styles.teaserSection}>
                <div className={styles.teaserSectionTitle}>Growth Opportunities</div>
                <div className={styles.growthGrid}>
                  {[
                    { title: 'Commercial Expansion', desc: 'Current commercial revenue is 22%. Market studies show 40%+ commercial mix is achievable with existing crew capabilities.' },
                    { title: 'Geographic Expansion', desc: 'Adjacent markets in Sarasota and Port Charlotte represent $15M+ addressable revenue with minimal capex.' },
                    { title: 'Smart Home Integration', desc: 'Nest / Ecobee partnerships and smart thermostat installs represent a high-margin add-on opportunity.' },
                    { title: 'Fleet Optimization', desc: 'Route density analysis shows 15% efficiency gain possible with dispatch software upgrade.' },
                  ].map((item) => (
                    <div key={item.title} className={styles.growthItem}>
                      <div className={styles.growthItemTitle}>{item.title}</div>
                      <div className={styles.growthItemDesc}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction Overview */}
              <div className={styles.teaserSection}>
                <div className={styles.teaserSectionTitle}>Transaction Overview</div>
                <div className={styles.transactionBox}>
                  {[
                    { label: 'Deal Structure', value: 'Asset Sale or Stock Sale' },
                    { label: 'Asking Price', value: '$8.3M – $9.6M (6.5–7.5x EBITDA)' },
                    { label: 'Seller Financing', value: 'Open to 20–30% seller note' },
                    { label: 'Transition Period', value: '12–24 months (flexible)' },
                    { label: 'Target Close', value: 'Q2 2025' },
                  ].map((row) => (
                    <div key={row.label} className={styles.transactionRow}>
                      <span className={styles.transactionLabel}>{row.label}</span>
                      <span className={styles.transactionValue}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Steps */}
              <div className={styles.teaserSection}>
                <div className={styles.teaserSectionTitle}>Next Steps</div>
                <div className={styles.nextStepsBox}>
                  <div className={styles.nextStepsTitle}>Process Overview</div>
                  <ul className={styles.nextStepsList}>
                    {[
                      'Execute mutual NDA to receive full Confidential Information Memorandum',
                      'Management presentation and facility tour (by invitation)',
                      'Submit indication of interest (IOI) with preliminary valuation',
                      'Data room access granted to qualified buyers with executed NDA',
                    ].map((step, i) => (
                      <li key={i} className={styles.nextStepsItem}>
                        <span className={styles.nextStepsItemNum}>{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Contact */}
              <div className={styles.teaserSection}>
                <div className={styles.teaserSectionTitle}>Contact</div>
                <div className={styles.teaserContactBlock}>
                  <div className={styles.teaserContactAvatar}>SR</div>
                  <div>
                    <div className={styles.teaserContactName}>Sarah Reynolds</div>
                    <div className={styles.teaserContactTitle}>M&A Advisor · Reynolds HVAC Services</div>
                    <div className={styles.teaserContactDetails}>
                      <span className={styles.teaserContactDetail}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        sarah@advisorgroup.com
                      </span>
                      <span className={styles.teaserContactDetail}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07" />
                        </svg>
                        +1 (813) 555-0192
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.teaserFooter}>
                <div className={styles.teaserFooterLeft}>
                  Confidential — prepared by Exit OS for discussion purposes only.<br />
                  Not an offer to sell securities. Subject to change without notice.
                </div>
                <div className={styles.teaserFooterRight}>Page 2 of 2</div>
              </div>
            </div>
          </div>
        )}

        {/* Page Navigation */}
        <div className={styles.pageNav}>
          <button
            className={styles.pageNavBtn}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </button>
          <span className={styles.pageNavInfo}>
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            className={styles.pageNavBtn}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
