'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/help/help.module.css'

// ── Static Demo Data ────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    title: 'Getting Started',
    count: '12 articles',
    iconClass: 'iconBlue',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>,
  },
  {
    title: 'Valuation & Financials',
    count: '18 articles',
    iconClass: 'iconGreen',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  },
  {
    title: 'Assessments & Scoring',
    count: '14 articles',
    iconClass: 'iconPurple',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    title: 'Improving Value',
    count: '21 articles',
    iconClass: 'iconTeal',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    title: 'Selling Your Business',
    count: '16 articles',
    iconClass: 'iconOrange',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  },
  {
    title: 'Account & Billing',
    count: '9 articles',
    iconClass: 'iconRed',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  },
]

const ARTICLES = [
  { title: 'How to connect your accounting software (QuickBooks, Xero)', tagClass: 'tagGettingStarted', tag: 'Getting Started', time: '4 min read' },
  { title: 'Understanding your Business Readiness Index (BRI) score', tagClass: 'tagAssessments', tag: 'Assessments', time: '6 min read' },
  { title: 'What is SDE vs. EBITDA and which should I use?', tagClass: 'tagValuation', tag: 'Valuation', time: '5 min read' },
  { title: 'How to reduce owner dependence and increase transferability', tagClass: 'tagImproving', tag: 'Improving Value', time: '8 min read' },
  { title: 'Setting up your Data Room for due diligence', tagClass: 'tagSelling', tag: 'Selling', time: '7 min read' },
  { title: 'How valuation multiples are calculated in Exit OS', tagClass: 'tagValuation', tag: 'Valuation', time: '5 min read' },
  { title: 'Managing buyer conversations in the Deal Room', tagClass: 'tagSelling', tag: 'Selling', time: '6 min read' },
  { title: 'Upgrading your plan and managing billing', tagClass: 'tagAccount', tag: 'Account', time: '3 min read' },
]

const VIDEOS = [
  { title: 'Getting Started with Exit OS', desc: 'Complete walkthrough of your dashboard', duration: '4:32' },
  { title: 'Understanding Your Valuation', desc: 'How multiples and adjustments work', duration: '6:15' },
  { title: 'Completing Your BRI Assessment', desc: 'Step-by-step guide to all 8 dimensions', duration: '5:48' },
  { title: 'Preparing Your Data Room', desc: 'Organize documents for due diligence', duration: '7:22' },
]

const QUICK_LINKS = [
  { label: 'Dashboard', href: '/dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { label: 'Valuation', href: '/dashboard/valuation', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { label: 'Assessments', href: '/dashboard/assessments', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { label: 'Action Center', href: '/dashboard/action-center', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { label: 'Data Room', href: '/dashboard/data-room', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg> },
  { label: 'AI Coach', href: '/dashboard/coach', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { label: 'Settings', href: '/dashboard/settings', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
]

// ── Page Component ──────────────────────────────────────────────────────────

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      <TrackPageView page="help" />

      {/* Header */}
      <div className={styles.pageHeader}>
        <h1>Help Center</h1>
        <p>Find answers, learn features, and get support</p>
      </div>

      {/* Search Bar */}
      <div className={styles.searchWrapper}>
        <div className={styles.searchBar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search articles, guides, and FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className={styles.searchKbd}>/</kbd>
        </div>
      </div>

      {/* Category Cards */}
      <h2 className={styles.sectionTitle}>Browse by Category</h2>
      <div className={styles.categoryGrid}>
        {CATEGORIES.map((cat) => (
          <div key={cat.title} className={styles.categoryCard}>
            <div className={`${styles.categoryIcon} ${styles[cat.iconClass]}`}>
              {cat.icon}
            </div>
            <h3>{cat.title}</h3>
            <p>{cat.count}</p>
          </div>
        ))}
      </div>

      {/* Popular Articles */}
      <h2 className={styles.sectionTitle}>Popular Articles</h2>
      <div className={styles.articlesList}>
        {ARTICLES.map((article, i) => (
          <div key={i} className={styles.articleItem}>
            <div className={styles.articleInfo}>
              <div className={styles.articleTitle}>{article.title}</div>
              <div className={styles.articleMeta}>
                <span className={`${styles.articleTag} ${styles[article.tagClass]}`}>{article.tag}</span>
                <span className={styles.articleReadingTime}>{article.time}</span>
              </div>
            </div>
            <div className={styles.articleArrow}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        ))}
      </div>

      {/* Video Tutorials */}
      <h2 className={styles.sectionTitle}>Video Tutorials</h2>
      <div className={styles.videoGrid}>
        {VIDEOS.map((video, i) => (
          <div key={i} className={styles.videoCard}>
            <div className={styles.videoThumbnail}>
              <div className={styles.videoPlayBtn}>
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <span className={styles.videoDuration}>{video.duration}</span>
            </div>
            <div className={styles.videoInfo}>
              <h4>{video.title}</h4>
              <p>{video.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Still Need Help */}
      <div className={styles.needHelpCard}>
        <div className={styles.needHelpText}>
          <h2>Still Need Help?</h2>
          <p>Our support team is available Monday through Friday, 9am-6pm ET. Average response time is under 2 hours.</p>
        </div>
        <div className={styles.needHelpActions}>
          <a href="mailto:support@exitosx.com" className={styles.btnContact}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Contact Support
          </a>
          <Link href="/dashboard/coach" className={styles.btnAiCoach}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Talk to AI Coach
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <h2 className={styles.sectionTitle}>Quick Links</h2>
      <div className={styles.quickLinks}>
        {QUICK_LINKS.map((link) => (
          <Link key={link.label} href={link.href} className={styles.quickLink}>
            {link.icon}
            {link.label}
          </Link>
        ))}
      </div>
    </>
  )
}
