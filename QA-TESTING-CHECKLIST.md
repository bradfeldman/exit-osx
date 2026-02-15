# Exit OSx — Pre-Launch QA Checklist

**Date:** February 15, 2026
**Tester:** Brad Feldman
**Environment:** Production (app.exitosx.com)

---

## Test 1: Public Assessment Flow (/assess) — High-Value Prospect

> This tests the full unauthenticated flow, account creation, Day 0 email, AND the prospect alert to you.

### 1.1 — Open /assess logged out

- [ ] Open an incognito/private browser window
- [ ] Go to `https://app.exitosx.com/assess`
- [ ] Confirm: Page loads with "Exit Readiness Assessment" heading, no login required
- [ ] Confirm: Progress bar shows at top

### 1.2 — Screen 1: Business Basics

Enter these exact values:

| Field | Value |
|---|---|
| Email | `bradfeldman+test1@gmail.com` |
| Company Name | `Apex Manufacturing Group` |
| Business Description | `We manufacture custom industrial components for aerospace and defense contractors. 15 employees, operating for 12 years, founder-led.` |
| Annual Revenue | `5000000` (type 5000000 — should display as $5,000,000) |

- [ ] Confirm: All 4 fields are present, email is the first field
- [ ] Confirm: Revenue input formats with dollar sign and commas as you type
- [ ] Click **Continue**
- [ ] Confirm: No errors, advances to Screen 2

### 1.3 — Screen 2: Business Profile

Select these exact options:

| Question | Selection |
|---|---|
| Revenue Model | **Project/Contract-Based** (TRANSACTIONAL) |
| Team Structure | **Team runs most things, owner still needed for key decisions** (MODERATE) |
| Operating Costs | **Significant physical assets and overhead** (ASSET_HEAVY) |
| Workforce | **Large team, labor is a major cost** (HIGH labor intensity) |
| Profit Margins | **Average for our industry** (MODERATE) |

- [ ] Confirm: No options are pre-selected (all require explicit choice)
- [ ] Confirm: All 5 questions must be answered before Continue enables
- [ ] Click **Continue**
- [ ] Confirm: Advances to Screen 3

### 1.4 — Screen 3: Buyer Confidence Scan

Answer these 8 yes/no questions:

| # | Question (approximate wording) | Answer |
|---|---|---|
| 1 | Revenue concentrated in a few customers? | **Yes** (risk) |
| 2 | Owner critical to daily operations? | **Yes** (risk) |
| 3 | Recurring/subscription revenue? | **No** (risk) |
| 4 | Documented processes/SOPs? | **No** (risk) |
| 5 | Clean financial records? | **Yes** (not a risk) |
| 6 | Legal/compliance issues? | **No** (not a risk) |
| 7 | Key employees with retention plans? | **No** (risk) |
| 8 | Growth trend in last 3 years? | **Yes** (not a risk) |

> Note: Exact question wording may differ. The goal is to answer ~5 as risks so the BRI score lands around 50-60 (Moderate).

- [ ] Confirm: 8 yes/no questions appear
- [ ] Answer all 8 per the table above
- [ ] Click **Continue**
- [ ] Confirm: Advances to Screen 4

### 1.5 — Screen 4: Review

- [ ] Confirm: Summary of all your answers is displayed
- [ ] Confirm: Email shows `bradfeldman+test1@gmail.com`
- [ ] Confirm: Company shows `Apex Manufacturing Group`
- [ ] Confirm: Revenue shows $5,000,000 (or $5M)
- [ ] Confirm: Edit buttons are present to go back to specific sections
- [ ] **Do NOT click edit** — click **Continue** (or "Calculate Results")
- [ ] Confirm: Loading/calculating state appears briefly

### 1.6 — Screen 5: Results Reveal

- [ ] Confirm: BRI score appears (should be roughly 50-60 range)
- [ ] Confirm: BRI color is amber/yellow (Moderate)
- [ ] Confirm: Current Value appears (should be a dollar amount > $0)
- [ ] Confirm: Potential Value appears (higher than Current Value)
- [ ] Confirm: Value Gap appears (difference between potential and current)
- [ ] Confirm: Category breakdown shows (colored bars or sections)
- [ ] Confirm: Top tasks appear (at least 1-3 suggested actions)
- [ ] Write down the exact numbers you see:

```
BRI Score:        ______
Current Value:    $______
Potential Value:  $______
Value Gap:        $______
```

### 1.7 — Account Creation

- [ ] Confirm: Account creation form appears (asking for password)
- [ ] Enter password: `TestPass123!`
- [ ] Click **Create Account** (or "Save My Results")
- [ ] Confirm: Success message appears
- [ ] Confirm: Instructed to check email for verification link

### 1.8 — Check Emails

Check the inbox for `bradfeldman+test1@gmail.com` (it arrives at your normal Gmail):

**Email #1 — Magic Link / Verification:**
- [ ] Confirm: Email received from Exit OSx
- [ ] Confirm: Contains a verification/login link
- [ ] **Do NOT click yet** — check for Email #2 first

**Email #2 — Day 0 Results Email:**
- [ ] Confirm: Email received with subject like "Apex Manufacturing Group's Exit Readiness Report"
- [ ] Confirm: Shows the BRI score (matches what you saw on screen)
- [ ] Confirm: Shows Current Value (matches screen)
- [ ] Confirm: Shows Value Gap with "leaving on the table" messaging
- [ ] Confirm: Shows "Your Biggest Gap" section with a risk category
- [ ] Confirm: Shows "#1 Priority" task with dollar impact
- [ ] Confirm: "Start This Task" button links to the dashboard
- [ ] Confirm: "View & Share Full Report" link is present

**Email #3 — High-Value Prospect Alert (to brad@exitosx.com):**
- [ ] Check your `brad@exitosx.com` inbox
- [ ] Confirm: Email received with subject like "High-Value Prospect: Apex Manufacturing Group ($5M revenue)"
- [ ] Confirm: Shows company name, email, revenue, BRI score, value gap, top risk
- [ ] Confirm: Includes the Day 3 outreach script suggestion at the bottom

### 1.9 — Log In via Magic Link

- [ ] Click the magic link from Email #1
- [ ] Confirm: Redirected to the dashboard
- [ ] Confirm: Dashboard loads with Apex Manufacturing Group data
- [ ] Confirm: BRI score on dashboard matches the /assess results
- [ ] Confirm: Valuation on dashboard matches the /assess results

---

## Test 2: Conversion Gates — Task Locking for Free Users

> You should now be logged in as `bradfeldman+test1@gmail.com` on the Foundation (free) plan.

### 2.1 — Navigate to Actions

- [ ] Click **Actions** in the sidebar (or navigate to `/dashboard/actions`)
- [ ] Confirm: Page loads with tasks

### 2.2 — Verify Task Locking

- [ ] Confirm: First 3 tasks in the "Up Next" queue are **unlocked** (show chevron arrow, no lock icon)
- [ ] Confirm: Tasks #4 and beyond show a **lock icon** instead of a chevron
- [ ] Confirm: Locked tasks still show the title and dollar value (not hidden)

### 2.3 — Click a Locked Task

- [ ] Click on any locked task (task #4 or later)
- [ ] Confirm: **Upgrade Modal** appears (not the task detail)
- [ ] Confirm: Modal shows "Unlock Full Action Plan" (or similar)
- [ ] Confirm: Modal shows the specific dollar amount — "This task could recover $X for your business"
- [ ] Confirm: Modal shows Growth plan pricing ($179/mo)
- [ ] Confirm: Modal shows annual option as savings ("or $149/mo billed annually")
- [ ] Confirm: CTA button says "Start Free Trial of Growth"
- [ ] Click **Maybe Later** to dismiss
- [ ] Confirm: Modal closes, back to Actions page

### 2.4 — Click an Unlocked Task

- [ ] Click on one of the first 3 unlocked tasks
- [ ] Confirm: Task expands or focuses normally (shows description, sub-steps, etc.)

---

## Test 3: Billing Settings — Monthly-First Pricing

### 3.1 — Navigate to Billing

- [ ] Go to **Settings** → **Billing** tab (or `/dashboard/settings?tab=billing`)

### 3.2 — Verify Defaults

- [ ] Confirm: Current Plan shows "Foundation"
- [ ] Confirm: Billing cycle toggle defaults to **Monthly** (not Annual)
- [ ] Confirm: Growth plan shows **$179/mo**
- [ ] Confirm: Exit-Ready plan shows **$449/mo**

### 3.3 — Toggle to Annual

- [ ] Click the Annual toggle
- [ ] Confirm: Growth shows **$149/mo** with "billed annually" note
- [ ] Confirm: Exit-Ready shows **$379/mo** with "billed annually" note
- [ ] Confirm: "Save 20%" badge visible near Annual toggle

### 3.4 — Toggle Back to Monthly

- [ ] Toggle back to Monthly
- [ ] Confirm: Prices return to $179/$449

---

## Test 4: Stripe Trial — No Credit Card Required

### 4.1 — Start Trial

- [ ] On the Billing page, with Monthly selected, click **Start 7-Day Free Trial** on the Growth plan
- [ ] Confirm: Redirected to Stripe Checkout page
- [ ] Confirm: **No credit card fields are shown** (or payment is marked optional)
- [ ] Confirm: Shows "7-day free trial" messaging
- [ ] **STOP — Do NOT complete the checkout** (unless you want to actually start a trial)
- [ ] Click back / close the Stripe page

---

## Test 5: Public Assessment Flow — Low-Value Prospect (No Alert)

> This verifies that the prospect alert does NOT fire for smaller businesses.

### 5.1 — Run a Second Assessment

- [ ] Open a new incognito window
- [ ] Go to `https://app.exitosx.com/assess`

Enter these values on Screen 1:

| Field | Value |
|---|---|
| Email | `bradfeldman+test2@gmail.com` |
| Company Name | `Brad's Consulting LLC` |
| Business Description | `Solo consulting practice specializing in small business advisory. Just me, no employees.` |
| Annual Revenue | `250000` ($250,000) |

### 5.2 — Complete Remaining Screens

Screen 2 (Business Profile):
| Question | Selection |
|---|---|
| Revenue Model | **Project/Contract-Based** |
| Team Structure | **Owner does almost everything** (HIGH owner involvement) |
| Operating Costs | **Minimal physical assets** (ASSET_LIGHT) |
| Workforce | **Just me / very small team** (LOW labor intensity) |
| Profit Margins | **Higher than average** (HIGH) |

Screen 3 (Buyer Scan) — Answer 6 as risks (to get a lower BRI):
| # | Answer |
|---|---|
| 1 | Yes (risk) |
| 2 | Yes (risk) |
| 3 | No (risk) |
| 4 | No (risk) |
| 5 | No (risk) |
| 6 | No (not a risk) |
| 7 | No (risk) |
| 8 | Yes (not a risk) |

- [ ] Complete through to Results
- [ ] Confirm: Results show (BRI should be lower, ~40s range)
- [ ] Create account with password: `TestPass123!`

### 5.3 — Verify No Prospect Alert

- [ ] Check `brad@exitosx.com` inbox
- [ ] Confirm: **No** prospect alert email for "Brad's Consulting LLC" (revenue $250K is below $3M threshold, and value gap should be below $1M)
- [ ] Confirm: Day 0 results email DID arrive at `bradfeldman+test2@gmail.com`

---

## Test 6: Value Home — Free User CTA

### 6.1 — Check Dashboard

- [ ] Log in as `bradfeldman+test1@gmail.com` (or use the magic link)
- [ ] Navigate to the main dashboard / Value Home
- [ ] Confirm: "What's Next" card shows the #1 task
- [ ] Confirm: Button says **"Upgrade to Start Closing Your Gap →"** (free user CTA)
- [ ] Click the upgrade button
- [ ] Confirm: Upgrade modal or billing page appears

---

## Test 7: Bug Fix Verification

> These verify the P0 bug fixes are working correctly.

### 7.1 — Task Priorities (Bug 1)

- [ ] On the Actions page, look at the task order
- [ ] Confirm: Tasks are ordered by impact (highest-value tasks first, not random)
- [ ] Confirm: The #1 task relates to the company's weakest area (e.g., customer concentration or owner dependency for Apex Manufacturing)

### 7.2 — Valuation Sanity Check (Bugs 3, 4, 5)

- [ ] On the dashboard, check the valuation number
- [ ] Confirm: Current Value is $0 or a positive number (never negative)
- [ ] Confirm: The number is plausible for a $5M revenue manufacturing company (rough range: $1M-$10M depending on BRI)

### 7.3 — Onboarding Defaults (Bug 7)

> Only testable if you create a brand new account through the normal onboarding flow (not /assess). Skip if not needed right now.

---

## Results Summary

| Test | Status | Notes |
|---|---|---|
| 1. /assess flow | Pass / Fail | |
| 2. Task locking | Pass / Fail | |
| 3. Billing defaults | Pass / Fail | |
| 4. Stripe no-CC trial | Pass / Fail | |
| 5. Low-value (no alert) | Pass / Fail | |
| 6. Value Home CTA | Pass / Fail | |
| 7. Bug fixes | Pass / Fail | |

**Overall:** Ready to send prospects to /assess?  YES / NO

**Issues found:**
1. _________________________________
2. _________________________________
3. _________________________________
