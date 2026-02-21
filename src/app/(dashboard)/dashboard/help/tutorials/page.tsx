'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/help/help.module.css'

// TODO: wire to API — fetch video tutorials list

const FEATURED_VIDEO = {
  slug: 'getting-started-overview',
  title: 'Getting Started with Exit OSx — Full Platform Walkthrough',
  desc: 'A complete overview of the Exit OSx platform: how to set up your company, understand your valuation, complete your exit readiness assessment, and use playbooks to increase your business value.',
  duration: '18:42',
  views: '4,200',
  date: 'Jan 10, 2026',
  category: 'Getting Started',
  chapters: [
    { time: '0:00', name: 'Introduction & Platform Overview' },
    { time: '2:15', name: 'Creating Your Company Profile' },
    { time: '4:30', name: 'Connecting Your Accounting Software' },
    { time: '7:10', name: 'Understanding Your BRI Score', active: true },
    { time: '10:45', name: 'Reading Your Valuation Report' },
    { time: '14:22', name: 'Using Playbooks to Improve Value' },
    { time: '17:00', name: 'Next Steps' },
  ],
  transcript: `Welcome to Exit OSx. In this walkthrough, I'll show you everything you need to get started with the platform and understand how to use it to maximize your exit value. Exit OSx is designed to give business owners and their advisors a clear, data-driven picture of what their business is worth today — and what it could be worth with the right improvements. Let's start by creating your company profile...`,
}

const MORE_VIDEOS = [
  { slug: 'valuation-deep-dive', title: 'Valuation Deep Dive: Multiples, DCF & Comparables', duration: '12:18', category: 'Valuation' },
  { slug: 'deal-room-walkthrough', title: 'Setting Up Your Deal Room', duration: '9:45', category: 'Deal Room' },
  { slug: 'playbook-overview', title: 'How to Use Exit Playbooks', duration: '7:22', category: 'Playbooks' },
  { slug: 'financial-modeling', title: 'Financial Modeling for Exit Planning', duration: '15:04', category: 'Financials' },
]

export default function VideoTutorialsPage() {
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  // TODO: wire to API — fetch video data, chapter timestamps, transcript

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/help">Help</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Video Tutorials</span>
      </nav>

      <div className={styles.videoLayout}>
        {/* Main video column */}
        <main>
          <div className={styles.videoPlayerCard}>
            {/* Video player */}
            <div
              className={styles.videoPlayer}
              role="region"
              aria-label={`Video: ${FEATURED_VIDEO.title}`}
            >
              {/* Play button */}
              <button
                className={styles.videoPlayerPlayBtn}
                aria-label={`Play ${FEATURED_VIDEO.title}`}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </button>

              {/* Duration badge */}
              <div className={styles.videoPlayerDuration} aria-label={`Duration: ${FEATURED_VIDEO.duration}`}>
                {FEATURED_VIDEO.duration}
              </div>

              {/* Progress bar */}
              <div className={styles.videoProgressBar} role="progressbar" aria-valuenow={32} aria-valuemin={0} aria-valuemax={100} aria-label="Video progress">
                <div className={styles.videoProgressFill} style={{ width: '32%' }} />
              </div>
            </div>

            {/* Video meta bar */}
            <div className={styles.videoMetaBar}>
              <h1 className={styles.videoTitle}>{FEATURED_VIDEO.title}</h1>
              <div className={styles.videoMetaRow}>
                <span className={styles.videoMetaItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {FEATURED_VIDEO.duration}
                </span>
                <span className={styles.videoMetaItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {FEATURED_VIDEO.views} views
                </span>
                <span className={styles.videoMetaItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {FEATURED_VIDEO.date}
                </span>
                <span className={styles.videoMetaItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  {FEATURED_VIDEO.category}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className={styles.videoBodyContent}>
              <p className={styles.videoDesc}>{FEATURED_VIDEO.desc}</p>

              {/* Chapters */}
              <h2 className={styles.chapterTitle}>Chapters</h2>
              <nav className={styles.chapterList} aria-label="Video chapters">
                {FEATURED_VIDEO.chapters.map((chapter) => (
                  <button
                    key={chapter.time}
                    className={`${styles.chapterItem} ${chapter.active ? styles.chapterItemActive : ''}`}
                    type="button"
                    aria-label={`Jump to ${chapter.name} at ${chapter.time}`}
                  >
                    <span className={styles.chapterTime}>{chapter.time}</span>
                    <span className={styles.chapterDot} aria-hidden="true" />
                    <span className={styles.chapterName}>{chapter.name}</span>
                  </button>
                ))}
              </nav>

              {/* Transcript */}
              <div className={styles.transcriptSection}>
                <button
                  className={`${styles.transcriptToggle} ${transcriptOpen ? styles.transcriptOpen : ''}`}
                  onClick={() => setTranscriptOpen(!transcriptOpen)}
                  aria-expanded={transcriptOpen}
                  type="button"
                >
                  Transcript
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div
                  className={`${styles.transcriptContent} ${transcriptOpen ? styles.open : ''}`}
                  aria-hidden={!transcriptOpen}
                >
                  {FEATURED_VIDEO.transcript}
                </div>
              </div>
            </div>

            {/* Feedback row */}
            <div className={styles.feedbackRow}>
              <span>Was this helpful?</span>
              <button className={styles.feedbackBtn} type="button" aria-label="This video was helpful">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                  <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
                Yes
              </button>
              <button className={styles.feedbackBtn} type="button" aria-label="This video was not helpful">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                  <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
                </svg>
                No
              </button>
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside>
          <div className={styles.videoSidePanel}>
            <div className={styles.videoSidePanelTitle}>More Tutorials</div>
            {MORE_VIDEOS.map((vid) => (
              <Link
                key={vid.slug}
                href={`/dashboard/help/tutorials/${vid.slug}`}
                className={styles.sideVidCard}
              >
                <div className={styles.sideVidThumb} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div className={styles.sideVidInfo}>
                  <h5>{vid.title}</h5>
                  <span>{vid.duration} · {vid.category}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Need help card */}
          <div className={styles.needHelpSideCard}>
            <h3>Need live help?</h3>
            <p>Book a 30-minute onboarding call with an Exit OSx specialist.</p>
            <Link href="/dashboard/help/contact" className={styles.btnContact}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.06 2.06 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
              </svg>
              Book a Call
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
