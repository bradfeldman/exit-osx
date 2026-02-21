'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/buyers/buyers.module.css'

/* TODO: wire to API */
export default function AddBuyerPage() {
  const [buyerType, setBuyerType] = useState('pe')

  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/buyers">Buyers</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Add New Buyer</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Add New Buyer</h1>
          <p>Add a prospective buyer to your pipeline and configure matching criteria</p>
        </div>
      </div>

      <div className={styles.formLayout}>
        {/* Main Form Column */}
        <div>
          {/* Company Info Card */}
          <div className={styles.card}>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Company Information</div>
              <div className={styles.formSectionDesc}>Basic details about the prospective buyer organization</div>

              <div className={`${styles.formGrid} ${styles.formGrid2}`}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Company Name <span className={styles.required}>*</span>
                  </label>
                  <input className={styles.formInput} type="text" placeholder="e.g. Apex Capital Partners" />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Buyer Type <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.radioGroup}>
                    {[
                      { value: 'pe', label: 'Private Equity' },
                      { value: 'strategic', label: 'Strategic' },
                      { value: 'individual', label: 'Individual' },
                      { value: 'family', label: 'Family Office' },
                    ].map((opt) => (
                      <label key={opt.value} className={styles.radioOption}>
                        <input
                          type="radio"
                          name="buyerType"
                          value={opt.value}
                          checked={buyerType === opt.value}
                          onChange={() => setBuyerType(opt.value)}
                        />
                        <span className={styles.radioLabel}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <hr className={styles.formDivider} />

              <div className={`${styles.formGrid} ${styles.formGrid3}`}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Industry Focus</label>
                  <div className={styles.selectWrap}>
                    <select className={styles.formSelect}>
                      <option>Select industry</option>
                      <option>HVAC / Home Services</option>
                      <option>Business Services</option>
                      <option>Healthcare</option>
                      <option>Technology</option>
                      <option>Manufacturing</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>AUM / Fund Size</label>
                  <div className={styles.inputGroup}>
                    <span className={styles.inputPrefix}>$</span>
                    <input className={`${styles.formInput} ${styles.hasPrefix} ${styles.hasSuffix}`} type="text" placeholder="250M" />
                    <span className={styles.inputSuffix}>USD</span>
                  </div>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>HQ Location</label>
                  <input className={styles.formInput} type="text" placeholder="e.g. Chicago, IL" />
                </div>
              </div>

              <hr className={styles.formDivider} />

              <div className={`${styles.formGrid} ${styles.formGrid2}`}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Website</label>
                  <input className={styles.formInput} type="url" placeholder="https://apexcapital.com" />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>LinkedIn</label>
                  <input className={styles.formInput} type="url" placeholder="https://linkedin.com/company/..." />
                </div>
              </div>
            </div>
          </div>

          {/* Primary Contact Card */}
          <div className={styles.card}>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Primary Contact</div>
              <div className={styles.formSectionDesc}>The main person you'll be communicating with at this firm</div>

              <div className={`${styles.formGrid} ${styles.formGrid2}`}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>First Name <span className={styles.required}>*</span></label>
                  <input className={styles.formInput} type="text" placeholder="First name" />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Last Name <span className={styles.required}>*</span></label>
                  <input className={styles.formInput} type="text" placeholder="Last name" />
                </div>
              </div>

              <div className={`${styles.formGrid} ${styles.formGrid2}`} style={{ marginTop: 16 }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Title / Role</label>
                  <input className={styles.formInput} type="text" placeholder="e.g. Managing Director" />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Email Address <span className={styles.required}>*</span></label>
                  <input className={styles.formInput} type="email" placeholder="contact@apexcapital.com" />
                </div>
              </div>

              <div className={`${styles.formGrid} ${styles.formGrid2}`} style={{ marginTop: 16 }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Phone</label>
                  <input className={styles.formInput} type="tel" placeholder="+1 (312) 555-0100" />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>LinkedIn Profile</label>
                  <input className={styles.formInput} type="url" placeholder="https://linkedin.com/in/..." />
                </div>
              </div>
            </div>
          </div>

          {/* Deal Criteria Card */}
          <div className={styles.card}>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Deal Criteria</div>
              <div className={styles.formSectionDesc}>What this buyer is typically looking for in acquisitions</div>

              <div className={`${styles.formGrid} ${styles.formGrid2}`}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Min Revenue</label>
                  <div className={styles.inputGroup}>
                    <span className={styles.inputPrefix}>$</span>
                    <input className={`${styles.formInput} ${styles.hasPrefix}`} type="text" placeholder="2M" />
                  </div>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Max Revenue</label>
                  <div className={styles.inputGroup}>
                    <span className={styles.inputPrefix}>$</span>
                    <input className={`${styles.formInput} ${styles.hasPrefix}`} type="text" placeholder="20M" />
                  </div>
                </div>
              </div>

              <div className={`${styles.formGrid} ${styles.formGrid2}`} style={{ marginTop: 16 }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Min EBITDA</label>
                  <div className={styles.inputGroup}>
                    <span className={styles.inputPrefix}>$</span>
                    <input className={`${styles.formInput} ${styles.hasPrefix}`} type="text" placeholder="500K" />
                  </div>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Preferred Geography</label>
                  <input className={styles.formInput} type="text" placeholder="e.g. Southeast US" />
                </div>
              </div>

              <div className={styles.formField} style={{ marginTop: 16 }}>
                <label className={styles.formLabel}>Acquisition Preferences</label>
                <div className={styles.radioGroup}>
                  {['Platform', 'Add-on', 'Either'].map((opt) => (
                    <label key={opt} className={styles.radioOption}>
                      <input type="radio" name="acqType" value={opt.toLowerCase()} />
                      <span className={styles.radioLabel}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Source Card */}
          <div className={styles.card}>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Notes & Source</div>
              <div className={styles.formSectionDesc}>How you found this buyer and any relevant context</div>

              <div className={styles.formField} style={{ marginBottom: 16 }}>
                <label className={styles.formLabel}>Lead Source</label>
                <div className={styles.selectWrap}>
                  <select className={styles.formSelect}>
                    <option>Select source</option>
                    <option>Referral</option>
                    <option>Conference / Event</option>
                    <option>Inbound</option>
                    <option>AI Match</option>
                    <option>Research</option>
                    <option>Broker</option>
                  </select>
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Internal Notes</label>
                <textarea className={styles.formTextarea} placeholder="Any relevant context about this buyer, how you met them, prior interactions, etc." />
                <span className={styles.formHint}>Only visible to you and your advisors</span>
              </div>

              <div className={styles.formActions}>
                <button className={`${styles.btn} ${styles.btnPrimary}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Buyer
                </button>
                <Link href="/dashboard/buyers" className={`${styles.btn} ${styles.btnSecondary}`}>
                  Cancel
                </Link>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                  <span style={{ color: 'var(--red)' }}>*</span> Required fields
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div>
          {/* AI Matching Card */}
          <div className={styles.aiCard}>
            <div className={styles.aiCardIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div className={styles.aiCardTitle}>AI Buyer Matching</div>
            <div className={styles.aiCardDesc}>
              Once saved, our AI will analyze this buyer against your company profile and generate a match score based on deal criteria, industry fit, and acquisition history.
            </div>
            <button className={styles.aiCardBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Run AI Match After Save
            </button>
          </div>

          {/* Tips Card */}
          <div className={`${styles.card} ${styles.tipsCard}`}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Tips for Better Matches</div>
            <div className={styles.tipItem}>
              <span className={`${styles.tipIcon} ${styles.tipIconBlue}`}>1</span>
              <span>Add specific revenue and EBITDA ranges for more accurate AI scoring</span>
            </div>
            <div className={styles.tipItem}>
              <span className={`${styles.tipIcon} ${styles.tipIconGreen}`}>2</span>
              <span>Strategic buyers often pay 20-30% more than financial buyers for synergistic acquisitions</span>
            </div>
            <div className={styles.tipItem}>
              <span className={`${styles.tipIcon} ${styles.tipIconOrange}`}>3</span>
              <span>Document how you met them — warm intros close 3x faster than cold outreach</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
