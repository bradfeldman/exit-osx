'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCompany } from '@/contexts/CompanyContext'
import { Calculator, TrendingUp, Clock, Percent, DollarSign, BarChart3 } from 'lucide-react'
import styles from '@/components/financials/financials-pages.module.css'

export default function DCFPage() {
  const { selectedCompanyId } = useCompany()

  if (!selectedCompanyId) {
    return (
      <div className={styles.dcfPageEmpty}>
        <div className={styles.pageHeader}>
          <div>
            <h1>DCF Analysis</h1>
            <p>Select a company to view DCF analysis</p>
          </div>
        </div>
        <div className={styles.dcfEmptyCard}>
          <p>No company selected. Please select a company from the dropdown above.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dcfPage}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>DCF Analysis</h1>
          <p>Discounted Cash Flow valuation model</p>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className={styles.dcfComingSoonCard}>
        <div className={styles.dcfComingSoonInner}>
          <div className={styles.dcfComingSoonIcon}>
            <Clock />
          </div>
          <div>
            <p className={styles.dcfComingSoonTitle}>Coming Soon</p>
            <p className={styles.dcfComingSoonDesc}>
              DCF Analysis is under development. This feature will provide a comprehensive
              discounted cash flow valuation model for your business.
            </p>
          </div>
        </div>
      </div>

      {/* WACC Calculator Preview (Disabled) */}
      <div className={styles.dcfWaccCard}>
        <div className={styles.dcfWaccCardHeader}>
          <div className={styles.dcfWaccCardTitleRow}>
            <Calculator />
            WACC Calculator
          </div>
          <div className={styles.dcfWaccCardSubtitle}>
            Weighted Average Cost of Capital
          </div>
        </div>
        <div className={styles.dcfWaccCardBody}>
          <div className={styles.dcfWaccGrid}>
            <div className={styles.dcfWaccFieldGroup}>
              <Label htmlFor="riskFreeRate" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Risk-Free Rate
              </Label>
              <Input
                id="riskFreeRate"
                type="number"
                placeholder="4.5%"
                disabled
              />
              <span className={styles.dcfFieldHint}>10-year Treasury yield</span>
            </div>
            <div className={styles.dcfWaccFieldGroup}>
              <Label htmlFor="marketRiskPremium" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Market Risk Premium
              </Label>
              <Input
                id="marketRiskPremium"
                type="number"
                placeholder="5.5%"
                disabled
              />
              <span className={styles.dcfFieldHint}>Historical equity premium</span>
            </div>
            <div className={styles.dcfWaccFieldGroup}>
              <Label htmlFor="beta" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Beta
              </Label>
              <Input
                id="beta"
                type="number"
                placeholder="1.2"
                disabled
              />
              <span className={styles.dcfFieldHint}>Industry beta or company-specific</span>
            </div>
            <div className={styles.dcfWaccFieldGroup}>
              <Label htmlFor="sizeRiskPremium" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Size Risk Premium
              </Label>
              <Input
                id="sizeRiskPremium"
                type="number"
                placeholder="3.0%"
                disabled
              />
              <span className={styles.dcfFieldHint}>Small company premium</span>
            </div>
          </div>

          <hr className={styles.dcfDivider} />

          <div className={styles.dcfDebtGrid}>
            <div className={styles.dcfWaccFieldGroup}>
              <Label htmlFor="costOfDebt">Cost of Debt</Label>
              <Input
                id="costOfDebt"
                type="number"
                placeholder="6.0%"
                disabled
              />
            </div>
            <div className={styles.dcfWaccFieldGroup}>
              <Label htmlFor="taxRate">Tax Rate</Label>
              <Input
                id="taxRate"
                type="number"
                placeholder="25%"
                disabled
              />
            </div>
          </div>
        </div>

        <div className={styles.dcfWaccResult}>
          <div>
            <p className={styles.dcfWaccResultLabel}>Calculated WACC</p>
            <p className={styles.dcfWaccResultValue}>--.-%</p>
          </div>
          <Button disabled>
            Calculate
          </Button>
        </div>
      </div>

      {/* Features Preview */}
      <div className={styles.dcfFeaturesCard}>
        <div className={styles.dcfFeaturesCardHeader}>
          <p className={styles.dcfFeaturesCardTitle}>What&apos;s Coming</p>
          <p className={styles.dcfFeaturesCardSubtitle}>
            Features planned for the DCF Analysis module
          </p>
        </div>
        <ul className={styles.dcfFeatureList}>
          {[
            {
              n: '1',
              title: 'WACC Calculator',
              desc: 'Calculate your cost of capital using CAPM with size and industry adjustments',
            },
            {
              n: '2',
              title: 'Cash Flow Projections',
              desc: '5-year free cash flow projections based on your P&L and growth assumptions',
            },
            {
              n: '3',
              title: 'Terminal Value',
              desc: 'Gordon Growth Model or exit multiple approach for terminal value calculation',
            },
            {
              n: '4',
              title: 'Sensitivity Analysis',
              desc: 'See how changes in growth rate and discount rate affect your valuation',
            },
            {
              n: '5',
              title: 'Enterprise Value Integration',
              desc: 'DCF-derived enterprise value will replace EBITDA multiple valuation when available',
            },
          ].map((item) => (
            <li key={item.n} className={styles.dcfFeatureItem}>
              <div className={styles.dcfFeatureBullet}>
                <span>{item.n}</span>
              </div>
              <div>
                <p className={styles.dcfFeatureTitle}>{item.title}</p>
                <p className={styles.dcfFeatureDesc}>{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Why DCF Info Card */}
      <div className={styles.dcfInfoCard}>
        <div className={styles.dcfInfoInner}>
          <div className={styles.dcfInfoIcon}>
            <Calculator />
          </div>
          <div>
            <p className={styles.dcfInfoTitle}>Why DCF Matters</p>
            <p className={styles.dcfInfoText}>
              Discounted Cash Flow analysis provides a more rigorous valuation methodology
              compared to simple multiple-based approaches. It considers the time value of money,
              growth projections, and risk factors specific to your business. When completed,
              the DCF enterprise value will be prioritized over the EBITDA multiple-based valuation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
