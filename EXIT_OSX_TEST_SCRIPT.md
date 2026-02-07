# Exit OSx -- Comprehensive Manual Test Script

**Version:** 1.0
**Last Updated:** 2026-02-06
**Author:** QA Engineering
**Platform Under Test:** Exit OSx (Next.js 15 / React 19 SaaS Application)

---

## How to Use This Document

This manual test script covers every user-facing feature of the Exit OSx platform. It is organized by feature area and follows the natural user journey from signup through advanced deal management.

**Instructions for the tester:**

1. Execute test cases sequentially within each section, as later tests may depend on state created by earlier ones.
2. For each test case, verify the **Expected Result** before moving on.
3. Mark each test case as PASS, FAIL, or BLOCKED with notes.
4. When a test fails, document the actual result, take a screenshot, and note the browser/viewport used.
5. Edge cases listed under each test case should be tested as time allows -- they are high-value regression targets.
6. The full suite is expected to take approximately 8-12 hours for one tester across all sections.

**Severity Guide for Defects:**
- **P0 (Critical):** Data loss, security breach, calculation errors, crash
- **P1 (High):** Feature completely broken, incorrect financial values displayed
- **P2 (Medium):** Feature partially broken, UI misalignment, confusing behavior
- **P3 (Low):** Cosmetic issues, minor text errors, animation glitches

---

## Prerequisites

### Accounts Required
- **New User Account:** A fresh email address that has never been used with Exit OSx (for signup/onboarding testing)
- **Established Foundation User:** An existing account on the Foundation (free) plan with at least one company that has a completed assessment
- **Growth User:** An existing account on the Growth plan with business financials uploaded
- **Exit-Ready User:** An existing account on the Exit-Ready plan with full data (assessment, financials, evidence, deal room activated)
- **Staff/Team Member Account:** An account invited as a team member to another user's company
- **Admin Account:** An account with admin panel access (role: ADMIN or STAFF)

### Environment
- **URL:** The staging or production URL for Exit OSx (e.g., `https://app.exitosx.com`)
- **Browsers:** Chrome (latest), Safari (latest), Firefox (latest)
- **Viewports:** Desktop (1440px+), Tablet (768px-1024px), Mobile (375px-767px)
- **Email Access:** Ability to receive emails at the test email addresses (for verification, password reset, invites)

### Test Data
- A sample PDF or document file (under 10MB) for upload testing
- Company financial data (revenue, EBITDA, basic P&L) for financials testing
- A second email address for team invite testing

---

## Section 0: Authentication & Onboarding

### TC-0-001: Signup -- Happy Path
**Preconditions:** Use a new email address never registered with Exit OSx.
**Steps:**
1. Navigate to `/signup`.
2. Verify the page displays the headline "See How Buyers Would Price Your Business Today".
3. Verify the form contains fields: "Full Name", "Email Address", "Create Password", and "Company Name (optional)".
4. Enter a full name (e.g., "Test User QA").
5. Enter the new email address.
6. Enter a password that meets minimum requirements (8+ characters).
7. Optionally enter a company name (e.g., "QA Test Corp").
8. Click the "Reveal My Exit Risk Profile" button.
9. Verify the success state appears with the progress indicator showing Step 2 "Confirm" as active.
10. Verify the text "We've sent a confirmation link to" appears followed by the email entered.
11. Verify the "Open Email & See My Results" button is present.
12. Check the email inbox for a verification email from Exit OSx.
13. Click the verification link in the email.
14. Verify you are redirected to the onboarding flow at `/onboarding`.

**Expected Result:** Account created successfully, verification email received, clicking the link redirects to onboarding.
**Edge Cases:**
- Attempt signup with an already-registered email -- should show an error
- Attempt signup with a password shorter than 8 characters -- should show validation error
- Attempt signup with an invalid email format -- should show validation error
- Verify the "Already have an account? Log in" link at the top navigates to `/login`
- Verify Terms and Privacy Policy links are functional

### TC-0-002: Signup -- Trust Elements and Social Proof
**Preconditions:** None.
**Steps:**
1. Navigate to `/signup`.
2. Verify the following trust elements are visible below the submit button:
   - "Free plan. No credit card required." (with green check icon)
   - "No sales calls. Ever." (with green check icon)
   - "Your data is private and never shared." (with green check icon)
3. Verify the value anchor section displays: "Even a 0.3x multiple swing on a $3M EBITDA business = $900,000".
4. On desktop (1440px+), verify the left column shows "What You'll See After Signup" with four bullet points.
5. On mobile (375px), verify the objection handling section appears below the form.
6. Verify the footer text: "Exit OSx is an operating system for exit readiness--not a sales funnel."

**Expected Result:** All trust elements and social proof sections render correctly at each viewport.

### TC-0-003: Login -- Happy Path
**Preconditions:** Have a verified account with known credentials.
**Steps:**
1. Navigate to `/login`.
2. Verify the page displays "Welcome back" headline and "Sign in to continue to your dashboard" subtext.
3. Enter the email in the "Email address" field.
4. Enter the password in the password field.
5. Click the "Sign In" button.
6. Verify you are redirected to `/dashboard`.

**Expected Result:** Successful login redirects to the main dashboard.
**Edge Cases:**
- Enter wrong password -- should show "Invalid email or password" error
- Verify the "Forgot password?" link navigates to `/forgot-password`
- Verify the "Create one for free" link navigates to `/signup`
- Verify the password visibility toggle (eye icon) shows/hides the password

### TC-0-004: Login -- Account Lockout After Failed Attempts
**Preconditions:** Have a verified account.
**Steps:**
1. Navigate to `/login`.
2. Enter the correct email but an incorrect password.
3. Click "Sign In".
4. Verify an error message appears.
5. Repeat incorrect login attempts until the "attempts remaining" counter appears.
6. Continue until the account is locked.
7. Verify the lockout message appears: "Account locked. Try again in X minutes."
8. Verify the CAPTCHA appears after several failed attempts.

**Expected Result:** Account locks after excessive failed attempts, shows remaining attempts and lockout timer.

### TC-0-005: Login -- Two-Factor Authentication
**Preconditions:** Have an account with 2FA enabled (configured in user settings).
**Steps:**
1. Navigate to `/login`.
2. Enter valid email and password.
3. Click "Sign In".
4. Verify the 2FA prompt appears with a shield icon and text "Enter the 6-digit code from your authenticator app".
5. Enter the 6-digit TOTP code from the authenticator app.
6. Click "Verify".
7. Verify successful login and redirect to `/dashboard`.
8. Click the "Back to login" link and verify it returns to the email/password form.

**Expected Result:** 2FA flow works correctly with valid codes; back navigation works.
**Edge Cases:**
- Enter an invalid 2FA code -- should show error
- Test with a backup code (format: XXXX-XXXX) -- should work as alternative

### TC-0-006: Forgot Password Flow
**Preconditions:** Have a verified account.
**Steps:**
1. Navigate to `/forgot-password`.
2. Verify the headline "Reset your password" and subtext "Enter your email and we'll send you a link to reset your password".
3. Enter the account email in the "Email address" field.
4. Click "Send Reset Link".
5. Verify the success state appears: "Check your email" with the green checkmark icon.
6. Verify the text shows "We've sent a password reset link to [email]".
7. Check email inbox for the reset link.
8. Click the reset link in the email.
9. Verify you are redirected to `/reset-password`.
10. Enter a new password and confirm.
11. Verify the password is updated and you can log in with the new password.

**Expected Result:** Password reset email sent, link works, new password accepted.
**Edge Cases:**
- Click "try again" link in the success state -- should return to the email form
- Verify "Back to sign in" link (with arrow icon) navigates to `/login`
- Submit with no email -- button should be disabled

### TC-0-007: Onboarding Flow -- New User
**Preconditions:** Newly signed-up user who has verified their email but has no company yet.
**Steps:**
1. After email verification, verify redirect to `/onboarding`.
2. Verify the onboarding wizard loads (FocusedOnboardingWizard component).
3. Complete each step of the onboarding flow:
   a. Company name entry (should pre-fill from signup if provided)
   b. Industry selection (using the IndustryCombobox -- search and select an industry)
   c. Annual revenue range selection
   d. EBITDA or owner compensation information
   e. Years in business
4. Click through each step and verify progress indicators update.
5. On the final step, confirm and verify redirect to `/dashboard`.
6. Verify the company appears in the sidebar with its name.

**Expected Result:** Onboarding wizard completes successfully, company is created, user lands on the dashboard.

### TC-0-008: Invite Acceptance -- Team Member
**Preconditions:** Have an existing company owner account. Have a second email address.
**Steps:**
1. As the company owner, navigate to Settings > Team tab.
2. Invite the second email address as a team member.
3. Check the invited email's inbox for the invite email.
4. Click the invite link (e.g., `/invite/[token]`).
5. If the invited user has no account, verify they see a signup flow with text "Create Account to Join Team".
6. Complete signup and email verification.
7. Verify the user is added to the team and can access the company.
8. Verify the invited user sees the company in their sidebar.

**Expected Result:** Invite link works, new user can sign up and join the team.

### TC-0-009: Invite Acceptance -- Task Invite
**Preconditions:** Have a company with tasks generated. Have a second email address.
**Steps:**
1. Navigate to the task invite flow at `/invite/task/[token]`.
2. Verify the task details are displayed.
3. If the user is not logged in, verify they are prompted to log in or sign up.
4. After authentication, verify they can see the assigned task.

**Expected Result:** Task invite works and the assignee can view their task.

---

## Section 1: Navigation & Layout

### TC-1-001: Sidebar -- Five-Mode Navigation
**Preconditions:** Logged in with a company selected.
**Steps:**
1. Verify the sidebar is visible on desktop (viewport 1024px+).
2. Verify the Exit OSx logo/wordmark appears at the top of the sidebar (links to exitosx.com).
3. Verify the company name appears below the logo with a building icon (or crown icon if you are the subscribing owner).
4. Verify the five core navigation links are present in order:
   - "Value" (links to `/dashboard`)
   - "Diagnosis" (links to `/dashboard/diagnosis`)
   - "Actions" (links to `/dashboard/actions`)
   - "Evidence" (links to `/dashboard/evidence`)
   - "Deal Room" (links to `/dashboard/deal-room`)
5. Click each link and verify the correct page loads.
6. Verify the active link is highlighted (bg-sidebar-accent, text-sidebar-primary).
7. Verify the "Settings" link appears in the "Admin" section at the bottom (links to `/dashboard/settings`).
8. Verify the version number appears at the very bottom of the sidebar (e.g., "Exit OSx v1.x.x").

**Expected Result:** All five mode links are visible, clickable, and correctly highlight when active.

### TC-1-002: Sidebar -- Subscription-Locked Features
**Preconditions:** Logged in as a Foundation (free) user.
**Steps:**
1. Verify that Value Modeling section links show lock icons for features requiring Growth or Exit-Ready plans.
2. Click a locked link (e.g., "Business Financials").
3. Verify the Upgrade Modal appears explaining what plan is required.
4. Close the modal.
5. Verify locked links show dimmed text (text-sidebar-foreground/50) and a lock icon.

**Expected Result:** Locked features show lock icons and clicking them opens the upgrade modal.

### TC-1-003: Sidebar -- Progression-Locked Features
**Preconditions:** Logged in as a Growth/Exit-Ready user who has NOT uploaded business financials.
**Steps:**
1. Verify the "Value Modeling" section heading appears dimmed (text-sidebar-foreground/30).
2. Verify "Business Financials" shows with a progression lock tooltip: "Upload business financials to unlock".
3. Upload business financials (via the Financials page).
4. Refresh the sidebar and verify the Value Modeling section links are now unlocked and clickable.

**Expected Result:** Progression-locked items show hints and unlock after prerequisites are met.

### TC-1-004: Header -- User Menu and Subscription Badge
**Preconditions:** Logged in with any account.
**Steps:**
1. Verify the header bar is sticky at the top of the page.
2. Verify the subscription badge appears on the right side showing the current plan (e.g., "Foundation", "Growth", or "Exit-Ready").
3. If the user is on a trial, verify the badge shows "X days left" below the plan name.
4. Verify the Exit Coach button is visible (ExitCoachButton).
5. Verify the Notification Bell icon is present.
6. Click the user avatar in the top-right corner.
7. Verify the dropdown menu shows:
   - User name and email
   - "User Settings" menu item (links to `/dashboard/settings?tab=account`)
   - "Sign out" menu item
8. Click "Sign out" and verify you are redirected to `/login`.

**Expected Result:** Header displays subscription badge, user menu works, sign out redirects to login.

### TC-1-005: Mobile Navigation
**Preconditions:** Logged in, viewport set to mobile width (375px).
**Steps:**
1. Verify the sidebar is hidden on mobile.
2. Verify the hamburger menu icon (three horizontal lines) appears in the header.
3. Click the hamburger icon.
4. Verify the mobile navigation drawer opens (MobileNav component).
5. Verify all five core navigation links are present.
6. Click a navigation link and verify the page loads and the drawer closes.
7. Verify the Exit OSx logo and name appear in the mobile header.

**Expected Result:** Mobile navigation drawer opens/closes correctly with all navigation links functional.
**Edge Cases:**
- Hover over the hamburger icon (onMouseEnter) -- should also open the mobile nav
- Test swipe-to-close gesture if implemented

### TC-1-006: Notification Bell
**Preconditions:** Logged in with a company that has notifications.
**Steps:**
1. Locate the notification bell icon in the header.
2. If there are unread notifications, verify a badge/dot indicator is visible.
3. Click the notification bell.
4. Verify a dropdown or panel appears showing notification items.
5. Click a notification and verify it navigates to the relevant page or entity.
6. Verify notifications can be marked as read.

**Expected Result:** Notification bell shows unread count, displays notifications, and navigation works.

---

## Section 2: VALUE Mode (Home Dashboard)

### TC-2-001: Dashboard -- Loading State
**Preconditions:** Logged in with a company selected.
**Steps:**
1. Navigate to `/dashboard`.
2. Verify a loading skeleton state appears while data is fetching (ValueHomeLoading component).
3. Verify the loading state includes placeholder shapes for hero metrics, bridge chart, and other sections.

**Expected Result:** Skeleton loading state appears and is replaced by actual data when loaded.

### TC-2-002: Dashboard -- Error State
**Preconditions:** Simulate a network error (disable network in DevTools, then navigate).
**Steps:**
1. Navigate to `/dashboard` with network disabled.
2. Verify the error state appears (ValueHomeError component).
3. Verify a "Retry" button is present.
4. Re-enable network and click "Retry".
5. Verify the dashboard loads successfully.

**Expected Result:** Error state shows with retry functionality.

### TC-2-003: Hero Metrics Bar -- Three Metric Cards
**Preconditions:** Logged in as a user with a completed assessment.
**Steps:**
1. Navigate to `/dashboard`.
2. Verify three metric cards appear in a horizontal row (grid-cols-3 on desktop):
   - **Current Value:** Shows a dollar amount (e.g., "$1.2M") with animated count-up
   - **Potential Value:** Shows a dollar amount with subtext "If all gaps closed"
   - **Value Gap:** Shows a dollar amount in primary color with a monthly delta indicator
3. Verify the animated count-up effect plays on page load (values animate from 0 to final number).
4. Verify the Value Gap card shows a delta indicator:
   - "First month" (grey text) if this is the first month
   - "No change this month" (grey text) if no change
   - Down arrow + amount + "this month" in green if gap is shrinking
   - Up arrow + amount + "this month" in red if gap is growing

**Expected Result:** Three metric cards display with correct values, animated count-up, and delta indicators.
**Edge Cases:**
- New user with no assessment: Verify "Industry Preview" badge appears on Current Value card
- User with financials uploaded: Verify "Based on your financials" badge appears

### TC-2-004: Hero Metrics Bar -- Pre-Assessment State
**Preconditions:** Logged in as a user who has NOT completed any assessment.
**Steps:**
1. Navigate to `/dashboard`.
2. Verify the three metric cards display with industry-average estimates.
3. Verify the Current Value card shows an "Industry Preview" badge (Badge variant="secondary").

**Expected Result:** Pre-assessment state shows estimated values with appropriate badge.

### TC-2-005: Benchmark Comparison
**Preconditions:** Logged in with a company that has assessment data.
**Steps:**
1. Navigate to `/dashboard`.
2. Scroll to the Benchmark Comparison section.
3. Verify it shows the industry name (e.g., "Your Industry") and the industry multiple range (low to high).
4. Verify the current multiple is displayed and positioned relative to the industry range.
5. Verify the visualization clearly indicates where the company falls within the industry range.

**Expected Result:** Benchmark comparison shows industry context for the current valuation multiple.

### TC-2-006: Valuation Bridge -- Bar Chart
**Preconditions:** Logged in with a completed assessment.
**Steps:**
1. Navigate to `/dashboard`.
2. Scroll to the "WHERE YOUR VALUE GAP IS" section.
3. Verify a horizontal bar chart displays with up to 5 category bars:
   - Financial (blue)
   - Transferability (green)
   - Operational (yellow)
   - Market (purple)
   - Legal & Tax (red)
4. Verify each bar shows the dollar impact amount on hover (via tooltip).
5. Verify the X-axis shows currency values and the Y-axis shows category labels.
6. Click on a bar and verify navigation to `/dashboard/diagnosis?expand=[CATEGORY]`.

**Expected Result:** Valuation bridge chart renders with colored bars, tooltips, and clickable navigation.

### TC-2-007: Valuation Bridge -- Pre-Assessment Overlay
**Preconditions:** Logged in as a user with no completed assessment.
**Steps:**
1. Navigate to `/dashboard`.
2. Scroll to the "WHERE YOUR VALUE GAP IS" section.
3. Verify a blurred overlay appears over the chart with text: "Based on industry averages. Complete your assessment for a personalized breakdown."
4. Verify a "Start Assessment" button is present on the overlay.
5. Click "Start Assessment" and verify navigation to `/dashboard/diagnosis`.

**Expected Result:** Pre-assessment overlay shows with blur effect and CTA button.

### TC-2-008: What-If Scenarios -- Factor Selection
**Preconditions:** Logged in with a completed assessment (coreFactors available).
**Steps:**
1. Navigate to `/dashboard`.
2. Scroll to the "What-If Scenarios" card.
3. Verify the card title "What-If Scenarios" and subtext "See how improving a business factor could change your valuation".
4. Verify five factor buttons are present:
   - Revenue Model
   - Gross Margin
   - Labor Intensity
   - Asset Intensity
   - Owner Involvement
5. Click "Revenue Model".
6. Verify:
   - The button becomes active (default variant instead of outline).
   - A description appears: "How predictable is your revenue?"
   - A "Current:" label shows the current factor value (e.g., "Current: Transactional").
   - A dropdown "What if it were..." appears with alternative options (excluding the current value).

**Expected Result:** Factor selection UI works with current value display and dropdown of alternatives.

### TC-2-009: What-If Scenarios -- Result Calculation
**Preconditions:** TC-2-008 completed.
**Steps:**
1. With "Revenue Model" selected, choose "Subscription / SaaS" from the dropdown.
2. Verify a result card appears showing:
   - A dollar amount delta (e.g., "+$250K") in green if positive, red if negative
   - A TrendingUp or TrendingDown icon
   - The multiple change (e.g., "Multiple: 3.50x -> 4.20x (+0.70x)")
   - A buyer insight message (e.g., "Buyers pay premiums for predictable, recurring revenue streams.")
3. Try selecting different factors and values, verifying the result updates each time.
4. Verify that selecting a value identical to current shows no change (neutral state).

**Expected Result:** What-If calculation produces accurate delta results with formatted display.
**Edge Cases:**
- Select a factor that would decrease the valuation -- verify red/negative display
- Rapidly switch between factors -- verify no stale results

### TC-2-010: What-If Scenarios -- Locked State
**Preconditions:** Logged in as a user with NO completed assessment.
**Steps:**
1. Navigate to `/dashboard`.
2. Scroll to where the What-If Scenarios card would be.
3. Verify a locked card appears with a Lock icon and text: "Complete your assessment to unlock What-If Scenarios".

**Expected Result:** Locked state shows with clear messaging.

### TC-2-011: Next Move Card -- Active Task
**Preconditions:** Logged in with an active (IN_PROGRESS) task.
**Steps:**
1. Navigate to `/dashboard`.
2. Scroll to the Next Move card (bordered with primary/20).
3. Verify the header reads "CONTINUE WHERE YOU LEFT OFF" (since task is in progress).
4. Verify the task title is displayed in large semibold text.
5. Verify the meta row shows:
   - Clock icon with time estimate (e.g., "2 hours remaining")
   - Dollar icon with value impact (e.g., "~$50K value impact")
   - BRI category badge (e.g., "Transferability" in green)
6. Verify the buyer consequence quote appears in italics with curly quotes.
7. Verify "Started [date]" appears.
8. Click the "Continue" button.
9. Verify navigation to `/dashboard/actions?taskId=[taskId]`.

**Expected Result:** Next Move card shows the current in-progress task with all metadata.

### TC-2-012: Next Move Card -- New Task (Not Started)
**Preconditions:** Logged in with tasks in queue but none started.
**Steps:**
1. Navigate to `/dashboard`.
2. Verify the Next Move card header reads "YOUR NEXT MOVE".
3. Verify the button text is "Start This Task".
4. Click "Why this?" button.
5. Verify the expandable rationale section appears with:
   - BRI category label
   - Task description
   - "Most founders complete this in one sitting." (if estimated hours exist)
6. Click "Why this?" again to collapse.

**Expected Result:** Next Move card displays the top-priority task with expandable rationale.

### TC-2-013: Next Move Card -- Empty State
**Preconditions:** Logged in with all tasks completed.
**Steps:**
1. Verify the Next Move card shows: "You've completed all current tasks. Nice work."
2. Verify subtext: "Your next assessment will generate new recommendations based on your updated profile."
3. Verify a "Review Diagnosis" button is present linking to `/dashboard/diagnosis`.

**Expected Result:** Empty state displays congratulatory message with redirect to Diagnosis.

### TC-2-014: Next Move Card -- Coming Up List
**Preconditions:** Logged in with multiple tasks queued.
**Steps:**
1. Navigate to `/dashboard`.
2. Below the Next Move card's main content, verify a "Coming Up" section appears.
3. Verify it shows a list of upcoming tasks with:
   - Task title
   - Estimated time
   - Value impact amount
   - BRI category

**Expected Result:** Coming Up list shows queued tasks with relevant metadata.

### TC-2-015: Next Move Card -- Free User Upgrade Gate
**Preconditions:** Logged in as a Foundation (free) user.
**Steps:**
1. Navigate to `/dashboard`.
2. Verify the Next Move card button text reads "Upgrade to Start Closing Your Gap".
3. Click the button.
4. Verify the upgrade flow is triggered (onUpgrade callback).

**Expected Result:** Free users see upgrade CTA instead of task start.

### TC-2-016: Progress Context -- Three Metric Cards
**Preconditions:** Logged in with a company that has task history.
**Steps:**
1. Navigate to `/dashboard`.
2. Scroll to the Progress Context section (three cards below the Next Move).
3. Verify three cards:
   - **Recovered** (green, TrendingUp icon): Shows total value recovered (e.g., "$150K") with monthly rate (e.g., "+$25K/mo")
   - **At Risk** (amber, AlertTriangle icon): Shows value at risk (e.g., "$80K") with open signal count (e.g., "3 open signals")
   - **Gap Remaining** (zinc, Target icon): Shows remaining value gap with monthly delta
4. Verify animated count-up on all three values.
5. Verify the Gap Remaining delta text is green when gap is shrinking, default otherwise.

**Expected Result:** Three progress context cards display with correct values and colors.

### TC-2-017: Value Ledger Section
**Preconditions:** Logged in with a company that has value ledger events.
**Steps:**
1. Navigate to `/dashboard`.
2. Scroll to the Value Ledger section.
3. Verify it displays recent value ledger events.
4. Verify each event shows what changed and the resulting value impact.
5. Click through to the full value ledger page (`/dashboard/value-ledger`) if a link is available.

**Expected Result:** Value ledger summary displays recent events.

### TC-2-018: Drift Report Banner
**Preconditions:** Logged in with a company that has drifting metrics.
**Steps:**
1. Navigate to `/dashboard`.
2. Verify the Drift Report banner appears if there is drift data.
3. Verify the banner communicates that certain scores or values have changed since the last snapshot.
4. Click through to the drift report (`/dashboard/drift-report`) if a link is available.

**Expected Result:** Drift report banner shows when relevant, with link to full report.

### TC-2-019: Value Timeline
**Preconditions:** Logged in with a company that has multiple snapshots (value trend history).
**Steps:**
1. Navigate to `/dashboard`.
2. Scroll to the bottom to the Value Timeline section.
3. Verify a line chart or trend visualization appears showing value over time.
4. Verify annotations appear at key points (e.g., "Assessment completed", "Task finished").
5. Verify each annotation shows: date, label, detail, impact type (positive/negative/neutral).

**Expected Result:** Value timeline chart renders with trend data and annotations.

### TC-2-020: Weekly Check-In Trigger
**Preconditions:** Logged in when a weekly check-in is pending.
**Steps:**
1. Navigate to `/dashboard`.
2. Verify the WeeklyCheckInTrigger component appears at the very top of the page.
3. Interact with the check-in flow (answer questions or dismiss).
4. Verify the trigger disappears after the check-in is completed or dismissed.
5. Navigate away and back -- verify it does not reappear after completion.

**Expected Result:** Weekly check-in appears when pending and disappears after interaction.

### TC-2-021: Disclosure Trigger
**Preconditions:** Logged in when a monthly disclosure check-in is pending.
**Steps:**
1. Navigate to `/dashboard`.
2. Verify the DisclosureTrigger component appears below the weekly check-in (if both are pending).
3. Complete the disclosure flow.
4. Verify the trigger disappears.

**Expected Result:** Monthly disclosure trigger appears when pending.

---

## Section 3: DIAGNOSIS Mode

### TC-3-001: Diagnosis Page -- Loading and Error States
**Preconditions:** Logged in with a company.
**Steps:**
1. Navigate to `/dashboard/diagnosis`.
2. Verify the DiagnosisLoading skeleton state appears during data fetch.
3. Simulate network error and verify DiagnosisError component appears with retry button.

**Expected Result:** Loading and error states render correctly.

### TC-3-002: Diagnosis Header -- BRI Score Display
**Preconditions:** Logged in with a completed assessment.
**Steps:**
1. Navigate to `/dashboard/diagnosis`.
2. Verify the header shows:
   - Left side: "YOUR BUYER READINESS" title, "How buyers evaluate your business" subtext
   - Right side: Large BRI score number (e.g., "72") with animated count-up, "BRI Score" label below
3. Verify the BRI score uses animated count-up from 0 to the actual value.

**Expected Result:** BRI score header displays with animation.

### TC-3-003: Diagnosis Header -- Estimated State
**Preconditions:** Logged in with a company that has NO completed categories (estimated BRI).
**Steps:**
1. Navigate to `/dashboard/diagnosis`.
2. Verify the BRI score shows with an "Estimated" badge below it.
3. Verify subtext: "Complete your first category to get a personalized score."

**Expected Result:** Estimated badge and guidance text appear for pre-assessment users.

### TC-3-004: Diagnosis Header -- No Score State
**Preconditions:** Logged in with a brand-new company, no assessment at all.
**Steps:**
1. Navigate to `/dashboard/diagnosis`.
2. Verify the BRI score area shows a dash (em-dash character) in muted foreground color.
3. Verify "BRI Score" label still appears.

**Expected Result:** Dash placeholder shows when no score is available.

### TC-3-005: Category Panels -- Grid Layout (6 Categories)
**Preconditions:** Logged in with a company that has an assessment.
**Steps:**
1. Navigate to `/dashboard/diagnosis`.
2. Verify a 2-column grid of category panels appears (1-column on mobile).
3. Verify the following categories are present (in this or similar order):
   - Financial (blue dot)
   - Transferability (green dot)
   - Operational (yellow dot)
   - Market (purple dot)
   - Legal & Tax (red dot)
   - Personal (orange dot)
4. For each panel, verify:
   - Category name and colored dot
   - Score out of 100 (e.g., "72/100") with color coding: green (80+), primary (60-79), amber (40-59), red (<40)
   - Confidence dots and label
   - Dollar impact text (e.g., "Costing you ~$50K") for non-Personal categories
   - Questions progress (e.g., "5 of 12 questions answered")
   - Last updated date (or "Not yet assessed")
   - CTA button (varies based on state)

**Expected Result:** All six category panels render with correct data in a grid layout.

### TC-3-006: Category Panel -- CTA Button States
**Preconditions:** Logged in with a company that has partially completed categories.
**Steps:**
1. Find a category with 0 questions answered. Verify the CTA reads "Start Assessment".
2. Find a category with some questions answered but not all. Verify the CTA reads "Continue" with a secondary "Review Answers" button.
3. Find a fully answered category with score below 80. Verify the CTA reads "Review Answers".
4. Find a fully answered category with score 80+. Verify the CTA reads "Maintaining" (disabled ghost button).
5. Find a category marked as stale. Verify the CTA reads "Review & Refresh".

**Expected Result:** CTA buttons dynamically reflect the assessment state of each category.

### TC-3-007: Category Panel -- Confidence Dots
**Preconditions:** Logged in with categories at varying confidence levels.
**Steps:**
1. For each category panel, verify the confidence dots render (1-5 filled dots).
2. Verify the confidence label appears next to the dots (e.g., "Low", "Medium", "High").
3. Find the category flagged as "isLowestConfidence".
4. Verify it has an amber border highlight (border-amber-300/50).
5. Verify the amber warning text: "Lowest confidence -- improve this first" with AlertTriangle icon.

**Expected Result:** Confidence dots and lowest-confidence indicator render correctly.

### TC-3-008: Category Panel -- Stale Assessment Warning
**Preconditions:** Logged in with a category that has not been updated in 90+ days.
**Steps:**
1. Find a category where confidence.isStale is true.
2. Verify the "Last updated" text shows in amber color with "may need refresh" appended.
3. Verify the CTA button reads "Review & Refresh".

**Expected Result:** Stale categories show visual warnings and refresh CTA.

### TC-3-009: Category Panel -- Personal Category Special Text
**Preconditions:** Logged in with a company that has the Personal category visible.
**Steps:**
1. Find the "Personal" category panel.
2. Verify the orange dot is displayed.
3. Verify no dollar impact is shown (Personal does not have dollarImpact).
4. Verify the text "Affects your exit timeline, not buyer pricing" appears.

**Expected Result:** Personal category shows unique messaging about timeline vs. pricing.

### TC-3-010: Inline Assessment Flow -- Start and Navigate Questions
**Preconditions:** Logged in with a category that has unanswered questions.
**Steps:**
1. On a category panel, click "Start Assessment" (or "Continue").
2. Verify the panel expands to show the CategoryAssessmentFlow component:
   - The CTA buttons hide
   - The panel gains border-primary/40 and shadow
3. Verify the first unanswered question is displayed.
4. Select an answer option for the question.
5. Verify auto-save triggers (the response is saved without clicking a save button).
6. Verify the next question appears (or navigation controls allow moving forward).
7. Answer all remaining questions in the category.

**Expected Result:** Inline assessment flow opens within the panel, questions appear one at a time, answers auto-save.

### TC-3-011: Inline Assessment Flow -- Close Without Completing
**Preconditions:** TC-3-010 in progress, some questions answered.
**Steps:**
1. While in the middle of the inline assessment, click the close/collapse button.
2. Verify the assessment flow collapses.
3. Verify already-answered questions are saved (progress count updates on the panel).
4. Re-open the assessment and verify it resumes where you left off (does not restart from question 1).

**Expected Result:** Partial progress is saved; re-opening resumes from the correct position.

### TC-3-012: Inline Assessment Flow -- Complete Category
**Preconditions:** TC-3-010 in progress, all questions answered.
**Steps:**
1. Answer the final question in the category.
2. Verify the completion callback fires (onAssessmentComplete).
3. Verify the assessment flow collapses.
4. Verify the entire page refetches data (new scores, confidence dots, etc.).
5. Verify the category score and confidence are updated to reflect the new answers.

**Expected Result:** Completing a category triggers data refresh with updated scores.

### TC-3-013: Diagnosis Page -- Deep Link to Expanded Category
**Preconditions:** Logged in with a completed assessment.
**Steps:**
1. Navigate to `/dashboard/diagnosis?expand=FINANCIAL`.
2. Verify the FINANCIAL category panel auto-expands to show the inline assessment flow.
3. Navigate to `/dashboard/diagnosis?expand=INVALID_CATEGORY`.
4. Verify no panel expands (invalid category is ignored gracefully).

**Expected Result:** URL query parameter auto-expands the correct category panel.

### TC-3-014: Risk Drivers Section -- Ranked List
**Preconditions:** Logged in with a completed assessment that has risk drivers.
**Steps:**
1. Navigate to `/dashboard/diagnosis`.
2. Scroll to "WHAT'S COSTING YOU THE MOST" section.
3. Verify the subtext: "Specific risks ranked by dollar impact".
4. Verify the top 5 risk drivers are displayed by default.
5. For each risk driver row, verify:
   - Rank number (1-5)
   - Risk name
   - Category label with color
   - Dollar impact amount
   - Option position indicator (e.g., position 2 of 4 options)
   - Buyer logic explanation (if available)
   - Linked task information (if a task is linked: task title and status)

**Expected Result:** Top 5 risk drivers display with all metadata.

### TC-3-015: Risk Drivers Section -- Show All / Show Less
**Preconditions:** Company has more than 5 risk drivers.
**Steps:**
1. Verify the "Show all X risk drivers" button appears at the bottom.
2. Click it.
3. Verify all risk drivers are now visible.
4. Verify the button text changes to "Show less".
5. Click "Show less" and verify the list truncates back to 5.

**Expected Result:** Expand/collapse toggle works for the full risk driver list.

### TC-3-016: Risk Drivers Section -- Pre-Assessment Empty State
**Preconditions:** Logged in with no assessment completed.
**Steps:**
1. Scroll to the risk drivers section.
2. Verify the empty state: "Complete your first category assessment to see specific risk drivers."
3. Verify a "Start Assessment" button is present that scrolls to the top of the page.

**Expected Result:** Empty state guides user to start their first assessment.

### TC-3-017: Risk Drivers Section -- No Risks State
**Preconditions:** Assessment completed with high scores (no significant risk drivers).
**Steps:**
1. Verify the section shows: "No significant risk drivers found. Your buyer readiness is strong!"

**Expected Result:** Positive messaging when no risk drivers exist.

---

## Section 4: ACTIONS Mode

### TC-4-001: Actions Page -- Loading and Error States
**Preconditions:** Logged in with a company.
**Steps:**
1. Navigate to `/dashboard/actions`.
2. Verify ActionsLoading skeleton appears during fetch.
3. Simulate network error and verify ActionsError component with retry button.

**Expected Result:** Loading and error states render correctly.

### TC-4-002: Actions Page -- Empty State
**Preconditions:** Logged in with a company that has zero tasks (no assessment completed or all tasks completed with none generated).
**Steps:**
1. Navigate to `/dashboard/actions`.
2. Verify the EmptyState component renders with guidance to complete an assessment first.

**Expected Result:** Empty state displays appropriate guidance.

### TC-4-003: Hero Summary Bar
**Preconditions:** Logged in with active tasks.
**Steps:**
1. Navigate to `/dashboard/actions`.
2. Verify the hero bar at the top shows:
   - "YOUR ACTION QUEUE" title
   - Task counts: "X tasks . Y active" (and optionally "Z deferred" in amber)
   - This Month stats on the right: "X completed . $YK recovered" (or "Ready to start" if none completed)
3. Verify the deferred count text is amber-colored.

**Expected Result:** Hero summary bar displays accurate task statistics.

### TC-4-004: Active Task Card -- Display
**Preconditions:** Logged in with an IN_PROGRESS task.
**Steps:**
1. Navigate to `/dashboard/actions`.
2. Verify the active task card appears with burnt-orange border:
   - "IN PROGRESS" label with animated pulse dot
   - BRI category badge (e.g., "Financial") on the right
   - Task title in large text
   - Meta line: "~$50K impact . 30 min remaining . Started Jan 15"
3. Verify the buyer context block shows the buyer consequence quote (if available).
4. Verify the buyer risk section shows the main question, consequences list, and conclusion (if available).

**Expected Result:** Active task card renders with all metadata and buyer context.

### TC-4-005: Active Task Card -- Stale Task Warning
**Preconditions:** Have a task that has been IN_PROGRESS for 14+ days.
**Steps:**
1. Verify an amber warning banner appears inside the active task card.
2. Verify the text: "Started X days ago -- still working on this?"

**Expected Result:** Stale task warning appears after 14 days.

### TC-4-006: Sub-Step Checklist -- Toggle Steps
**Preconditions:** Active task with sub-steps defined.
**Steps:**
1. Inside the active task card, find the sub-step checklist.
2. Verify each sub-step shows a checkbox and title.
3. Verify a progress indicator shows (e.g., "2 of 5 complete").
4. Click an unchecked sub-step checkbox.
5. Verify the checkbox becomes checked (optimistic update -- immediate visual feedback).
6. Verify the progress count updates.
7. Uncheck the sub-step.
8. Verify it returns to unchecked state with progress count decremented.

**Expected Result:** Sub-step toggles work with optimistic UI updates.
**Edge Cases:**
- Toggle a sub-step while offline -- verify optimistic update, then revert when fetch fails
- Toggle multiple sub-steps rapidly -- verify counts stay consistent

### TC-4-007: Task Completion Dialog
**Preconditions:** Active task with all sub-steps completed (or ready to mark complete).
**Steps:**
1. On the active task card, find and click the "Complete Task" button (in TaskStatusActions).
2. Verify the Task Completion Dialog modal appears with:
   - Green "Task Complete" header with Check icon
   - Task title
   - "Estimated value recovered: ~$XK"
   - A textarea for "Completion Notes (optional)" with placeholder "What did you accomplish? Any follow-up items?"
   - "Complete Task" button and "Back" button
3. Optionally enter completion notes.
4. Click "Complete Task".
5. Verify the button text changes to "Completing..." while submitting.
6. Verify the dialog closes and the page refreshes to show the task as completed.
7. Verify the completed task appears in the "Completed This Month" section.

**Expected Result:** Task completion dialog works, notes are saved, task moves to completed.
**Edge Cases:**
- Click "Back" to cancel -- dialog should close without completing the task
- Complete without notes -- should work fine (notes are optional)

### TC-4-008: Task Status -- Block Task
**Preconditions:** Active task card visible.
**Steps:**
1. Find the block/defer action in TaskStatusActions.
2. Trigger the block action.
3. Enter a reason for blocking.
4. Submit the block.
5. Verify the task is moved to a blocked/deferred state.
6. Verify the page refreshes to reflect the new status.

**Expected Result:** Tasks can be blocked with a reason.

### TC-4-009: Up-Next Queue
**Preconditions:** Logged in with multiple pending tasks.
**Steps:**
1. Navigate to `/dashboard/actions`.
2. Scroll past the active task(s) to the "Up Next" section.
3. Verify a list of queued tasks appears, each showing:
   - Task title
   - BRI category and color
   - Normalized value impact
   - Estimated time
   - Effort level
   - Priority rank
   - Prerequisite hint (if applicable)
   - Assignee name (if assigned to someone)
4. If there are more tasks than displayed, verify "X more in queue" text appears.

**Expected Result:** Up-Next queue shows prioritized pending tasks.

### TC-4-010: Up-Next Queue -- Start a Task
**Preconditions:** Up-Next queue has tasks available.
**Steps:**
1. Click the "Start" button on a task in the Up-Next queue.
2. Verify the task status changes to IN_PROGRESS.
3. Verify the page refreshes and the task now appears as an active task card.

**Expected Result:** Starting a task from the queue promotes it to active status.

### TC-4-011: Waiting On Others
**Preconditions:** Have tasks assigned to other team members.
**Steps:**
1. Navigate to `/dashboard/actions`.
2. Scroll to the "Waiting On Others" section.
3. Verify each waiting task shows:
   - Task title
   - BRI category
   - Value impact
   - Assignee name, email, and role
   - Assigned date and last updated date

**Expected Result:** Waiting On Others section shows delegated tasks.

### TC-4-012: Completed This Month
**Preconditions:** Have tasks completed during the current calendar month.
**Steps:**
1. Navigate to `/dashboard/actions`.
2. Scroll to the "Completed This Month" section.
3. Verify each completed task shows:
   - Task title
   - Value recovered amount
   - Completion date
   - BRI category
   - Whether evidence was attached
   - Completion notes (if any)
4. Verify the total value recovered header matches the hero bar.

**Expected Result:** Completed tasks display with value recovered and metadata.

### TC-4-013: Task Details Collapsible
**Preconditions:** Active task card visible.
**Steps:**
1. Inside the active task card, find the collapsible details section (TaskDetailsCollapsible).
2. Click to expand it.
3. Verify it shows:
   - Success criteria (overview and outcomes list)
   - Output format (description, formats, guidance)
   - Full task description
4. Click to collapse and verify it hides.

**Expected Result:** Task details expand/collapse with success criteria and output guidance.

---

## Section 5: EVIDENCE Mode

### TC-5-001: Evidence Page -- Loading and Error States
**Preconditions:** Logged in with a company.
**Steps:**
1. Navigate to `/dashboard/evidence`.
2. Verify EvidenceLoading skeleton appears during fetch.
3. Simulate network error and verify EvidenceError component with retry button.

**Expected Result:** Loading and error states render correctly.

### TC-5-002: Evidence Page -- Empty State
**Preconditions:** Logged in with a company that has zero documents uploaded.
**Steps:**
1. Navigate to `/dashboard/evidence`.
2. Verify the HeroEvidenceBar shows "0% buyer-ready" and "Start building buyer-ready evidence".
3. Verify the EvidenceEmptyState component renders below with guidance.

**Expected Result:** Empty state provides clear guidance on how to start uploading evidence.

### TC-5-003: Hero Evidence Bar
**Preconditions:** Logged in with a company that has some documents uploaded.
**Steps:**
1. Navigate to `/dashboard/evidence`.
2. Verify the hero bar shows:
   - "YOUR EVIDENCE" label
   - Percentage with animated count-up (e.g., "45% buyer-ready")
   - Progress bar with color coding: green (67%+), amber (34-66%), rose (<34%)
   - Document count and category count (e.g., "12 documents . 6 categories")
   - Last upload date (e.g., "Last upload: Jan 15")

**Expected Result:** Hero evidence bar displays accurate metrics with color-coded progress.

### TC-5-004: Evidence Category Table -- Expandable Rows
**Preconditions:** Logged in with evidence data across multiple categories.
**Steps:**
1. Verify the evidence category table shows multiple rows.
2. For each category row, verify:
   - Category label
   - Buyer impact level ("critical", "important", or "moderate")
   - Documents uploaded count vs. expected count
   - Percentage completion
   - Confidence dots (1-5)
3. Click on a category row to expand it.
4. Verify the expanded section shows:
   - List of uploaded documents with: name, upload date, source (direct/task/integration), version, stale indicator
   - List of missing documents with: name, buyer explanation, importance level (required/expected/helpful)
5. Click again to collapse.

**Expected Result:** Category table rows expand to show uploaded and missing documents.

### TC-5-005: Evidence -- Stale Document Indicator
**Preconditions:** Have a document that has been flagged as stale.
**Steps:**
1. In an expanded evidence category, find a document with isStale = true.
2. Verify a stale indicator is visible (likely an amber/warning badge or text).
3. Verify the stale reason is displayed (e.g., "Document is over 12 months old").

**Expected Result:** Stale documents are clearly marked with the reason.

### TC-5-006: Missing Documents Section
**Preconditions:** Company has missing required/expected documents.
**Steps:**
1. Navigate to `/dashboard/evidence`.
2. Scroll to the "Missing Documents" section.
3. Verify a list of top missing documents appears, each showing:
   - Document name
   - Category and category label
   - Buyer explanation (why this matters to buyers)
   - Importance level: "required" (likely red) or "expected" (likely amber)
4. If there are more missing documents than shown, verify a count indicator (e.g., "3 of 15 total missing").

**Expected Result:** Missing documents section highlights highest-priority gaps.

### TC-5-007: Recently Added Section
**Preconditions:** Company has documents uploaded recently.
**Steps:**
1. Navigate to `/dashboard/evidence`.
2. Scroll to the "Recently Added" section.
3. Verify a list of recently uploaded documents appears, each showing:
   - Document name
   - Category label
   - Added date
   - Source indicator (direct upload, via task, or via integration)

**Expected Result:** Recently added section shows the latest uploads.

### TC-5-008: Deal Room Teaser
**Preconditions:** Company is eligible for Deal Room but evidence score is between 60-69%.
**Steps:**
1. Navigate to `/dashboard/evidence`.
2. Scroll to the bottom.
3. Verify the Deal Room Teaser section appears (only when evidence >= 60% and dealRoom.eligible is true).
4. Verify it shows the current evidence percentage and how close the user is to Deal Room activation.
5. If canActivate is true, verify an activation link or button is present.
6. If the Deal Room is already activated, verify appropriate messaging.

**Expected Result:** Deal Room teaser appears at the right threshold with correct messaging.

---

## Section 6: DEAL ROOM Mode

### TC-6-001: Deal Room -- Loading and Error States
**Preconditions:** Logged in with a company.
**Steps:**
1. Navigate to `/dashboard/deal-room`.
2. Verify DealRoomLoading skeleton appears during fetch.
3. Simulate network error and verify DealRoomError component with retry button.

**Expected Result:** Loading and error states render correctly.

### TC-6-002: Activation Gate -- All Requirements Unmet
**Preconditions:** Logged in with a company that does not meet any Deal Room requirements. Foundation plan, low evidence, new account.
**Steps:**
1. Navigate to `/dashboard/deal-room`.
2. Verify the Activation Gate appears centered on the page with:
   - Lock icon at the top
   - "Deal Room" title
   - "Your Deal Room activates when you're ready to run a sale process. Here's where you stand:"
3. Verify three requirement checklist items with circle (not check) icons:
   - "Evidence: X% buyer-ready (70% required)"
   - "Platform tenure: X days (90 required)"
   - "Subscription: Foundation (Exit-Ready required)"
4. Verify the CTA button reads "Upgrade to Exit-Ready" and links to `/dashboard/settings?tab=billing`.

**Expected Result:** Activation gate shows all three unmet requirements with upgrade CTA.

### TC-6-003: Activation Gate -- Partial Requirements Met
**Preconditions:** Exit-Ready plan, evidence at 70%+, but account less than 90 days old.
**Steps:**
1. Navigate to `/dashboard/deal-room`.
2. Verify the checklist shows:
   - Check icon (green) for Evidence requirement
   - Check icon (green) for Subscription requirement
   - Circle icon for Platform tenure with remaining days text
3. Verify the bottom text reads "Available in X days".

**Expected Result:** Met requirements show green checks; unmet shows countdown.

### TC-6-004: Activation Gate -- All Requirements Met
**Preconditions:** Exit-Ready plan, evidence 70%+, account 90+ days old, Deal Room not yet activated.
**Steps:**
1. Navigate to `/dashboard/deal-room`.
2. Verify all three items show green check icons.
3. Verify the "Activate Deal Room" button is present and enabled (burnt-orange styling).
4. Click "Activate Deal Room".
5. Verify the button text changes to "Activating..." while processing.
6. Verify the page refreshes to show the Deal Room tabs view (no longer showing the activation gate).

**Expected Result:** Activation gate allows activation when all requirements are met.

### TC-6-005: Deal Room Tabs -- Navigation
**Preconditions:** Logged in with an activated Deal Room.
**Steps:**
1. Navigate to `/dashboard/deal-room`.
2. Verify three tabs are visible:
   - "Pipeline" (default active) with buyer count badge
   - "Data Room" with open questions count
   - "Activity" with recent activity count
3. Click "Data Room" tab and verify the DealDataRoom component renders.
4. Click "Activity" tab and verify the ActivityFeed component renders.
5. Click "Pipeline" tab and verify the PipelineView component renders.

**Expected Result:** All three tabs are navigable and render their respective content.

### TC-6-006: Pipeline View -- Stage Columns
**Preconditions:** Activated Deal Room with buyers in the pipeline.
**Steps:**
1. On the Pipeline tab, verify the pipeline view displays stage columns.
2. Verify the following stages are represented (up to 6):
   - Target Identified
   - Initial Contact
   - NDA / Confidentiality
   - Due Diligence
   - LOI / Offer
   - Closing
3. Verify each column shows a label, buyer count, and buyer cards.

**Expected Result:** Pipeline stages display as columns with buyers organized by stage.

### TC-6-007: Pipeline View -- Buyer Cards
**Preconditions:** Pipeline has buyers.
**Steps:**
1. For each buyer card in the pipeline, verify it displays:
   - Company name
   - Buyer type (e.g., Strategic, Financial, Individual)
   - Engagement level indicator (hot/warm/cold)
   - Key metrics (document views, last active date)
2. Click on a buyer card.
3. Verify the Buyer Detail Panel slides open (or appears as an overlay).

**Expected Result:** Buyer cards display key information and are clickable.

### TC-6-008: Buyer Detail Panel
**Preconditions:** Clicked on a buyer card.
**Steps:**
1. Verify the panel shows detailed buyer information:
   - Company name and buyer type
   - Contact information
   - Engagement metrics
   - Stage and stage history
   - Any offer details (IOI/LOI amounts, deadlines, exclusivity periods)
   - Notes
2. Verify the panel can be closed (X button or click outside).
3. After closing, verify the pipeline view returns to normal.

**Expected Result:** Buyer detail panel shows comprehensive information.

### TC-6-009: Pipeline View -- Add Buyer
**Preconditions:** Activated Deal Room.
**Steps:**
1. Find the "Add Buyer" button on the Pipeline view.
2. Click it.
3. Verify a form appears requesting:
   - Company Name (required)
   - Buyer Type (required: Strategic, Financial, Individual, etc.)
   - Contact Name (required)
   - Contact Email (required)
   - Notes (optional)
4. Fill in all required fields.
5. Submit the form.
6. Verify the new buyer appears in the first stage column ("Target Identified" or equivalent).
7. Verify the buyer count badge on the Pipeline tab updates.

**Expected Result:** New buyer is added and appears in the pipeline.
**Edge Cases:**
- Submit with missing required fields -- should show validation errors
- Add a buyer with the same company name as an existing one -- should still create (different contacts are valid)

### TC-6-010: Pipeline View -- Offers Section
**Preconditions:** Have buyers with offers (IOI or LOI) recorded.
**Steps:**
1. On the Pipeline tab, find the offers section.
2. Verify each offer shows:
   - Buyer company name and type
   - Offer type (IOI or LOI)
   - Offer amount
   - Deadline (if set)
   - Exclusivity window (start/end dates, if set)
   - Engagement level and activity metrics
   - Notes

**Expected Result:** Offers are displayed with full detail.

### TC-6-011: Data Room Tab
**Preconditions:** Activated Deal Room.
**Steps:**
1. Click the "Data Room" tab.
2. Verify the data room overview shows:
   - Data room stage
   - Active buyer access count
   - Total documents
   - Evidence score
   - Open questions count
   - Recent views and downloads counts
3. Verify navigation to the full data room is available if implemented.

**Expected Result:** Data room tab shows overview metrics.

### TC-6-012: Activity Feed Tab
**Preconditions:** Activated Deal Room with recorded activities.
**Steps:**
1. Click the "Activity" tab.
2. Verify the ActivityFeed component renders.
3. Verify activities are listed chronologically (newest first).
4. Check for type filters (if implemented).
5. Verify each activity entry shows: what happened, who did it, and when.

**Expected Result:** Activity feed shows a chronological list of deal-related activities.

### TC-6-013: Pipeline View -- Exited Buyers
**Preconditions:** Pipeline has buyers who exited (removed from active pipeline).
**Steps:**
1. Find the exited buyers summary on the Pipeline view.
2. Verify each exited buyer shows:
   - Company name
   - Stage they exited from
   - Exit reason (if provided)
   - Exit date

**Expected Result:** Exited buyers are tracked with context.

---

## Section 7: Settings

### TC-7-001: Settings Page -- Tab Navigation
**Preconditions:** Logged in.
**Steps:**
1. Navigate to `/dashboard/settings`.
2. Verify the page title "Settings" and subtext "Manage your company, account, team, and billing".
3. Verify four tabs are present: "Company", "Account", "Team", "Billing".
4. Verify "Company" is the default active tab.
5. Click each tab and verify the correct content loads.
6. Verify the URL updates with the tab parameter (e.g., `/dashboard/settings?tab=account`).

**Expected Result:** Settings tabs navigate correctly and URL reflects the active tab.

### TC-7-002: Settings -- URL Tab Parameter
**Preconditions:** Logged in.
**Steps:**
1. Navigate directly to `/dashboard/settings?tab=billing`.
2. Verify the Billing tab is active and billing content loads.
3. Navigate to `/dashboard/settings?tab=account`.
4. Verify the Account tab is active.
5. Navigate to `/dashboard/settings?tab=invalid`.
6. Verify the default "Company" tab is active (invalid tab gracefully defaults).

**Expected Result:** URL-based tab selection works, invalid values default to Company.

### TC-7-003: Company Settings
**Preconditions:** Logged in as a company owner.
**Steps:**
1. Navigate to `/dashboard/settings?tab=company`.
2. Verify company information fields are displayed (name, industry, revenue, etc.).
3. Edit the company name.
4. Save changes.
5. Verify the sidebar company name updates to reflect the change.
6. Verify all company profile fields can be edited and saved.

**Expected Result:** Company settings can be viewed and edited.

### TC-7-004: User/Account Settings
**Preconditions:** Logged in.
**Steps:**
1. Navigate to `/dashboard/settings?tab=account`.
2. Verify user profile fields are displayed:
   - Name
   - Email
   - Avatar
3. Edit the user name and save.
4. Verify the header user menu reflects the updated name.
5. Verify the "change password" flow works (if available).

**Expected Result:** User profile can be updated.

### TC-7-005: Organization/Team Settings
**Preconditions:** Logged in as an organization owner.
**Steps:**
1. Navigate to `/dashboard/settings?tab=team`.
2. Verify the team member list is displayed.
3. Verify each team member shows name, email, role, and status.
4. Invite a new team member:
   a. Enter their email address.
   b. Select a role/permission level.
   c. Send the invite.
5. Verify the invited member appears in the list with "Invited" status.
6. Verify you can modify a member's permissions.
7. Verify you can remove a team member.

**Expected Result:** Team management (invite, modify permissions, remove) works correctly.

### TC-7-006: Billing Settings
**Preconditions:** Logged in as the subscribing owner.
**Steps:**
1. Navigate to `/dashboard/settings?tab=billing`.
2. Verify the current plan is displayed (Foundation, Growth, or Exit-Ready).
3. If on a trial, verify trial status and days remaining are shown.
4. Verify plan comparison or upgrade options are available.
5. If applicable, verify the billing history or payment method section.

**Expected Result:** Billing information displays accurately with upgrade options.

### TC-7-007: GDPR Settings
**Preconditions:** Logged in (GDPR settings may be within Account or a separate section).
**Steps:**
1. Find the GDPR/privacy settings section (GDPRSettings component).
2. Verify the following options are available:
   - **Data Export:** Request an export of all your data.
   - **Cookie Consents:** View and manage cookie consent preferences.
   - **Delete Account:** Request account deletion.
3. Trigger a data export request:
   a. Click the export button.
   b. Verify a confirmation or status message appears.
   c. Check email for the export link (format: `/api/user/gdpr/export/[token]/download`).
4. Trigger a delete request:
   a. Click the delete button.
   b. Verify a confirmation dialog appears with warnings.
   c. Confirm the deletion request.
   d. Verify a confirmation email is sent.
   e. Verify the cancel link works (`/api/user/gdpr/delete-request/[token]/cancel`).

**Expected Result:** GDPR data export, consent management, and deletion request flows work correctly.

### TC-7-008: Accountability Partner Settings
**Preconditions:** Logged in as a company owner on Growth or Exit-Ready plan.
**Steps:**
1. Find the Accountability Partner section (AccountabilityPartnerCard component).
2. Verify you can invite a partner (advisor, mentor, etc.) by email.
3. Send an invite and verify the partner receives it.
4. Verify the partner can view a summary page at `/partner/summary/[accessToken]`.

**Expected Result:** Accountability partner invite and summary access work correctly.

---

## Section 8: Subscription & Feature Gating

### TC-8-001: FeatureGate -- Foundation User Sees Locked Features
**Preconditions:** Logged in as a Foundation (free) user.
**Steps:**
1. Navigate to features that require Growth plan (e.g., `/dashboard/financials`).
2. Verify the LockedFeature component renders with:
   - Lock icon in a circular muted background
   - Feature name (e.g., "Business Financials" or "Premium Feature")
   - Text: "Upgrade to Growth to unlock this feature."
   - "Unlock Feature" button with ArrowUpRight icon
3. Click "Unlock Feature".
4. Verify the UpgradeModal opens showing plan details and upgrade options.

**Expected Result:** Locked features show clear upgrade path.

### TC-8-002: LockedFeature Variants
**Preconditions:** Logged in as a Foundation user.
**Steps:**
1. Find a feature gated with `variant="card"` -- verify the full card layout with lock icon, title, description, and button.
2. Find a feature gated with `variant="inline"` -- verify the compact inline layout with lock icon, feature name, and plan name in parentheses.
3. Find a feature gated with `variant="minimal"` -- verify just a small "Locked" label with lock icon.

**Expected Result:** All three LockedFeature variants render correctly.

### TC-8-003: FeatureGate -- Hidden When showLockedState is False
**Preconditions:** Logged in as a Foundation user.
**Steps:**
1. Find a feature where `showLockedState={false}` is used.
2. Verify the feature element is completely hidden (not rendered at all), not just grayed out.

**Expected Result:** Features with showLockedState=false are invisible to users who lack access.

### TC-8-004: Request Access Flow (Staff on Personal Features)
**Preconditions:** Logged in as a staff member (not the subscribing owner) on a company that has a sufficient plan, but the staff member doesn't have personal feature access.
**Steps:**
1. Attempt to access a personal feature (e.g., Personal Financial Statement).
2. Verify the RequestAccessFeature component renders (not the upgrade modal).
3. Verify you can submit a request for access.
4. Verify the request is sent to the organization admin/owner.

**Expected Result:** Staff members see "Request Access" instead of "Upgrade" for features controlled by the org owner.

### TC-8-005: Subscription Badge in Header
**Preconditions:** Logged in with any plan.
**Steps:**
1. Verify the header shows the plan badge with correct color:
   - Foundation: muted gray background
   - Growth: blue background
   - Exit-Ready: primary color background
2. Click the badge and verify it links to `/pricing` (opens in new tab).
3. If on a trial, verify "X days left" appears below the badge.

**Expected Result:** Subscription badge accurately reflects current plan and trial status.

### TC-8-006: Sidebar Progression Locks
**Preconditions:** Logged in as a Growth user with no business financials uploaded.
**Steps:**
1. Verify the "Value Modeling" section in the sidebar shows dimmed heading.
2. Verify "Business Financials" shows as a ProgressionLockedItem with tooltip: "Upload business financials to unlock".
3. Navigate to Business Financials and upload financial data.
4. Return to the sidebar and verify "Business Financials" is now clickable.
5. Verify that DCF Valuation and Retirement Calculator are now visible (if subscription allows).
6. Verify the "Capital" section (Business Loans) appears only when BOTH business and personal financials are complete.

**Expected Result:** Sidebar progression unlocking works as designed.

---

## Section 9: Cross-Cutting Concerns

### TC-9-001: Error Boundaries -- API Failure Recovery
**Preconditions:** Logged in, each mode page.
**Steps:**
1. For each of the five modes (Value, Diagnosis, Actions, Evidence, Deal Room):
   a. Navigate to the page.
   b. Open DevTools > Network and block the API call (e.g., block `/api/companies/*/dashboard`).
   c. Refresh the page.
   d. Verify an error component renders (not a blank page or crash).
   e. Verify a "Retry" button is present.
   f. Unblock the API call and click "Retry".
   g. Verify the page loads successfully.

**Expected Result:** Every mode gracefully handles API failures with retry capability.

### TC-9-002: Empty States -- New Company No Data
**Preconditions:** Create a new company with no assessment, no tasks, no evidence, no deal room.
**Steps:**
1. Visit `/dashboard` -- verify hero metrics show with "Industry Preview" badge.
2. Visit `/dashboard/diagnosis` -- verify estimated BRI score and "Start Assessment" CTAs.
3. Visit `/dashboard/actions` -- verify empty state.
4. Visit `/dashboard/evidence` -- verify empty state with guidance.
5. Visit `/dashboard/deal-room` -- verify activation gate.

**Expected Result:** Every mode handles the zero-data state gracefully with appropriate guidance.

### TC-9-003: Loading States -- Skeleton UI
**Preconditions:** Logged in.
**Steps:**
1. For each mode, navigate to the page and observe the loading state.
2. Verify skeleton placeholders match the structure of the actual content:
   - Cards should have skeleton rectangles
   - Charts should have skeleton blocks
   - Lists should have skeleton rows
3. Verify there is no flash of unstyled content (FOUC) between loading and loaded states.

**Expected Result:** Skeleton states provide accurate structural previews of the content.

### TC-9-004: Animations -- Stagger and Fade-In
**Preconditions:** Logged in, navigate to any mode page.
**Steps:**
1. Navigate to `/dashboard`.
2. Verify sections animate in with a stagger effect (AnimatedStagger with 0.15s delay between items).
3. Verify each AnimatedItem fades in and slides up.
4. Navigate to `/dashboard/diagnosis` and verify the same pattern (0.1s stagger).
5. Navigate to `/dashboard/actions` and verify animations.

**Expected Result:** Page sections animate in with staggered fade-up transitions.

### TC-9-005: Responsive Design -- Mobile Layout
**Preconditions:** Logged in, viewport set to 375px width.
**Steps:**
1. Navigate to `/dashboard`.
2. Verify hero metrics cards stack vertically (1 column instead of 3).
3. Verify the valuation bridge chart is readable on mobile.
4. Verify the Next Move card is full-width and readable.
5. Navigate to `/dashboard/diagnosis`.
6. Verify category panels are 1-column on mobile.
7. Navigate to `/dashboard/actions`.
8. Verify task cards are full-width.
9. Navigate to `/dashboard/evidence`.
10. Verify the category table is scrollable or responsive.
11. Navigate to `/dashboard/deal-room`.
12. Verify pipeline columns are scrollable or stack appropriately.

**Expected Result:** All pages are usable and readable at mobile viewport widths.

### TC-9-006: Responsive Design -- Tablet Layout
**Preconditions:** Logged in, viewport set to 768px width.
**Steps:**
1. Navigate through all five modes.
2. Verify layouts adapt appropriately (2-column grids where appropriate, readable text).
3. Verify the sidebar is hidden and mobile nav is available.

**Expected Result:** Tablet layout is functional and readable.

### TC-9-007: Company Context -- Data Isolation
**Preconditions:** Logged in with access to two different companies.
**Steps:**
1. Verify the current company is shown in the sidebar.
2. Navigate to `/dashboard` and note the displayed values.
3. Switch to a different company (if company switcher is available, or via the sidebar "Add Company" flow).
4. Verify all data on the dashboard updates to reflect the new company's data.
5. Navigate to `/dashboard/diagnosis` and verify the BRI score is for the new company.
6. Navigate to `/dashboard/actions` and verify the tasks are for the new company.
7. Navigate back to the original company and verify original data is restored.

**Expected Result:** Company switching cleanly reloads all data for the selected company.

### TC-9-008: Cookie Consent Banner
**Preconditions:** New browser session (clear cookies first).
**Steps:**
1. Navigate to the app in a new session.
2. Verify the CookieConsent banner appears.
3. Verify it explains what cookies are used.
4. Accept cookies and verify the banner disappears.
5. Refresh the page and verify the banner does not reappear.

**Expected Result:** Cookie consent banner appears once and respects user choice.

### TC-9-009: Session Persistence
**Preconditions:** Logged in.
**Steps:**
1. Navigate to `/dashboard`.
2. Close the browser tab.
3. Open a new tab and navigate to `/dashboard`.
4. Verify you are still logged in (not redirected to login).
5. Wait for the session to be near expiration (if testable).
6. Verify the session is refreshed or the user is prompted to re-authenticate.

**Expected Result:** Sessions persist across tab closures and refresh automatically.

### TC-9-010: Unauthenticated Access Redirect
**Preconditions:** Not logged in (or in incognito mode).
**Steps:**
1. Navigate directly to `/dashboard`.
2. Verify you are redirected to `/login`.
3. Navigate to `/dashboard/diagnosis`.
4. Verify redirect to `/login`.
5. Navigate to `/dashboard/settings`.
6. Verify redirect to `/login`.
7. Navigate to `/onboarding`.
8. Verify redirect to `/login?next=/onboarding`.

**Expected Result:** All protected routes redirect unauthenticated users to login.

---

## Section 10: Additional Features

### TC-10-001: Financials -- Business Financial Statements
**Preconditions:** Logged in as a Growth or Exit-Ready user.
**Steps:**
1. Navigate to `/dashboard/financials`.
2. Verify the financials overview page loads.
3. Add a financial period (AddPeriodDialog).
4. Navigate to a period and enter P&L data (PLTab).
5. Navigate to the Balance Sheet tab (BalanceSheetTab).
6. Navigate to the Cash Flow tab (CashFlowTab).
7. Navigate to the Add-Backs tab (AddBacksTab).
8. Save data at each step and verify it persists.
9. Verify the PeriodSelector allows switching between financial periods.
10. Verify financial calculations (totals, margins) compute correctly.

**Expected Result:** Business financial data entry and navigation work across all tabs.

### TC-10-002: Financials -- Financial Profile
**Preconditions:** Business financials uploaded.
**Steps:**
1. Navigate to `/dashboard/financials/profile`.
2. Verify the financial profile summary displays.
3. Verify key metrics are computed from the uploaded financial data.

**Expected Result:** Financial profile derives from uploaded financial data.

### TC-10-003: DCF Valuation
**Preconditions:** Logged in as an Exit-Ready user with business financials.
**Steps:**
1. Navigate to `/dashboard/valuation` (or `/dashboard/financials/dcf`).
2. Verify the DCF valuation page loads.
3. Verify WACC calculator is available (WACCCalculator component).
4. Verify growth assumptions can be configured (GrowthAssumptions component).
5. Verify terminal value panel shows (TerminalValuePanel component).
6. Verify the sensitivity table displays (SensitivityTable component).
7. Verify valuation results render (ValuationResults component).
8. Adjust input assumptions and verify the valuation recalculates.

**Expected Result:** DCF valuation tool works with configurable inputs and real-time recalculation.

### TC-10-004: Retirement Calculator
**Preconditions:** Logged in as a Growth or Exit-Ready user with business financials. Progression lock for retirement calculator must be cleared.
**Steps:**
1. Navigate to `/dashboard/retirement-calculator` (or `/dashboard/financials/retirement`).
2. Verify the retirement calculator page loads with these panels:
   - Timeline Panel
   - Spending Panel
   - Growth Panel
   - Market Data Panel
   - Results Panel
   - Projection Chart
   - Sensitivity Table
3. Adjust spending assumptions and verify projections update.
4. Verify the projection chart renders a visual timeline.
5. Verify the sensitivity table shows multiple scenarios.

**Expected Result:** Retirement calculator renders all panels and recalculates on input changes.

### TC-10-005: Personal Financial Statement
**Preconditions:** Logged in as a Growth or Exit-Ready user.
**Steps:**
1. Navigate to `/dashboard/financials/personal`.
2. Verify the personal financial statement form loads.
3. Enter personal asset and liability data.
4. Save and verify data persists on page reload.

**Expected Result:** Personal financial statement can be completed and saved.

### TC-10-006: Business Loans
**Preconditions:** Logged in as a Growth or Exit-Ready user with both business and personal financials completed (progression requirement).
**Steps:**
1. Navigate to `/dashboard/loans/business`.
2. Verify the business loans page loads.
3. Verify loan inquiry form is available.
4. Submit an inquiry and verify it is processed.

**Expected Result:** Business loans page is accessible and inquiry form works.

### TC-10-007: Value Ledger Full Page
**Preconditions:** Logged in with a company that has value ledger events.
**Steps:**
1. Navigate to `/dashboard/value-ledger`.
2. Verify a full list of value ledger events is displayed.
3. Verify events show: date, description, category, value impact (positive/negative).
4. Verify events are sorted chronologically (newest first).

**Expected Result:** Full value ledger page displays all events.

### TC-10-008: Drift Report Full Page
**Preconditions:** Logged in with a company that has score changes over time.
**Steps:**
1. Navigate to `/dashboard/drift-report`.
2. Verify the drift report displays changes since the last snapshot.
3. Verify it highlights which scores improved and which declined.

**Expected Result:** Drift report shows score changes with trend direction.

### TC-10-009: Admin Panel Access
**Preconditions:** Logged in as an admin (ADMIN or STAFF role).
**Steps:**
1. Navigate to `/admin`.
2. Verify the admin dashboard loads with navigation links:
   - Activity
   - Users
   - Organizations
   - Tickets
   - Customer Service
   - Monitoring
   - R&D
   - Sales & Marketing
   - Variables
   - Tools (BRI Weighting, Industry Multiples, Multiple Adjustment, Snapshot, Task Viewer)
3. Navigate to `/admin/users` and verify the user table loads.
4. Navigate to `/admin/organizations` and verify the org table loads.
5. Navigate to `/admin/tickets` and verify the ticket table loads.

**Expected Result:** Admin panel is accessible with all sections loading.

### TC-10-010: Admin -- User Impersonation
**Preconditions:** Logged in as an admin.
**Steps:**
1. Navigate to `/admin/users`.
2. Find a user and click the impersonate action.
3. Verify the ImpersonationBanner appears at the top of the screen.
4. Verify you are now viewing the app as the impersonated user.
5. Navigate through the dashboard and verify data matches the impersonated user's account.
6. End impersonation by clicking the banner action.
7. Verify you return to your admin account.

**Expected Result:** Impersonation works and can be safely ended.

### TC-10-011: Admin -- Ticket Management
**Preconditions:** Logged in as an admin.
**Steps:**
1. Navigate to `/admin/tickets`.
2. Verify the ticket list displays.
3. Click on a ticket to view details at `/admin/tickets/[id]`.
4. Verify ticket details and message thread display.
5. Send a reply message.
6. Verify the message appears in the thread.
7. Change the ticket status and verify it updates.

**Expected Result:** Ticket management with viewing, replying, and status updates.

### TC-10-012: Exit Coach (AI Assistant)
**Preconditions:** Logged in.
**Steps:**
1. Find the ExitCoachButton in the header.
2. Click it to open the AI coach interface.
3. Verify the chat interface loads.
4. Type a question related to exit readiness (e.g., "What should I focus on first?").
5. Verify a response is generated.
6. Close the chat interface.

**Expected Result:** AI coach opens, accepts questions, and provides responses.

### TC-10-013: Advisor Portal
**Preconditions:** Logged in as an advisor role.
**Steps:**
1. Navigate to `/advisor`.
2. Verify the advisor dashboard loads with a list of client companies.
3. Verify the ClientSwitcher component allows switching between clients.
4. Click on a client company.
5. Navigate to `/advisor/[companyId]` and verify the client summary loads.
6. Navigate to `/advisor/[companyId]/signals` and verify signals are displayed.
7. Navigate to `/advisor/profile` and verify advisor profile settings.

**Expected Result:** Advisor portal provides client management and signal visibility.

### TC-10-014: Seller Dashboard
**Preconditions:** Have a deal with a seller-facing link.
**Steps:**
1. Navigate to `/[dealId]` (seller view).
2. Verify the SellerDashboard component renders.
3. Verify the seller can see their buyer list (SellerBuyerList).
4. Verify buyer information is appropriately redacted based on permissions.

**Expected Result:** Seller dashboard provides limited view of the deal process.

### TC-10-015: Contacts System
**Preconditions:** Logged in with a company on an appropriate plan.
**Steps:**
1. Navigate to `/dashboard/contacts`.
2. Verify the contacts page loads with:
   - Companies browser (CompaniesBrowser)
   - People browser (PeopleBrowser)
3. Add a new contact using AddContactModal.
4. Verify the contact appears in the list.
5. If implemented, check the DuplicateReviewQueue for duplicate detection.

**Expected Result:** Contacts system allows adding and viewing contacts.

### TC-10-016: QuickBooks Integration
**Preconditions:** Logged in as a Growth or Exit-Ready user.
**Steps:**
1. Navigate to the financials or integrations section.
2. Find the QuickBooks integration card (QuickBooksCard component).
3. Verify connection flow is available.
4. If a test QuickBooks account is available, complete the OAuth connection.
5. Verify financial data imports after connection.

**Expected Result:** QuickBooks integration card renders and connection flow works.

### TC-10-017: Security Settings -- Two-Factor Authentication Setup
**Preconditions:** Logged in on Account settings.
**Steps:**
1. Navigate to User Settings (Account tab).
2. Find the Two-Factor Authentication section (two-factor-settings component).
3. Enable 2FA by scanning the QR code with an authenticator app.
4. Enter the verification code to confirm setup.
5. Verify backup codes are provided.
6. Save and verify 2FA is now active.
7. Log out and log back in to verify 2FA is required (TC-0-005).

**Expected Result:** 2FA can be enabled and immediately takes effect on next login.

### TC-10-018: Security -- Session Manager
**Preconditions:** Logged in.
**Steps:**
1. Find the Session Manager in settings (session-manager component).
2. Verify active sessions are listed with device/browser info.
3. Verify you can terminate other sessions.

**Expected Result:** Session management shows active sessions with termination capability.

### TC-10-019: Assessments -- Direct Assessment Pages
**Preconditions:** Logged in with a company.
**Steps:**
1. Navigate to `/dashboard/assessment`.
2. Verify the assessment overview page loads.
3. Navigate to `/dashboard/assessment/company` -- verify company assessment questions.
4. Navigate to `/dashboard/assessment/risk` -- verify risk assessment questions.
5. Navigate to `/dashboard/assessment/personal-readiness` -- verify personal readiness questions.
6. Answer questions and verify responses are saved.

**Expected Result:** Direct assessment pages load and save responses.

### TC-10-020: Company Setup
**Preconditions:** Logged in.
**Steps:**
1. Navigate to `/dashboard/company/setup`.
2. Verify the company setup wizard loads with steps:
   - Core Factors (CoreFactorsStep)
   - Financials (FinancialsStep)
   - Adjustments (AdjustmentsStep)
3. Complete each step and verify data persists.
4. Verify the IndustryCombobox works for industry selection (search, filter, select).

**Expected Result:** Company setup wizard guides through the multi-step configuration.

### TC-10-021: BRI Weights Configuration
**Preconditions:** Logged in as a company owner.
**Steps:**
1. Navigate to `/dashboard/company/bri-weights`.
2. Verify the BRI weighting interface loads.
3. Verify you can adjust the weight for each BRI category.
4. Save changes and verify they affect the BRI score calculation on the dashboard.

**Expected Result:** BRI weights can be customized and affect scoring.

### TC-10-022: Pricing Page
**Preconditions:** None (public page).
**Steps:**
1. Navigate to `/pricing`.
2. Verify the pricing page loads with plan comparison.
3. Verify Foundation, Growth, and Exit-Ready plans are displayed.
4. Verify feature lists for each plan are accurate.
5. Verify CTA buttons link to signup with plan pre-selection (e.g., `/signup?plan=growth`).

**Expected Result:** Pricing page shows all plans with accurate feature lists.

### TC-10-023: Terms and Privacy Pages
**Preconditions:** None (public pages).
**Steps:**
1. Navigate to `/terms`.
2. Verify the terms of service page loads with content.
3. Navigate to `/privacy`.
4. Verify the privacy policy page loads with content.

**Expected Result:** Legal pages load and display content.

### TC-10-024: Partner Invite and Summary
**Preconditions:** An accountability partner invite has been sent.
**Steps:**
1. Navigate to `/partner/invite/[inviteToken]`.
2. Verify the partner invite acceptance page loads.
3. Accept the invite.
4. Navigate to `/partner/summary/[accessToken]`.
5. Verify the partner summary page loads with the company's key metrics and status.

**Expected Result:** Partner invite flow and summary page work correctly.

---

## Appendix A: Browser Compatibility Matrix

| Feature | Chrome | Safari | Firefox |
|---------|--------|--------|---------|
| Signup/Login | | | |
| Dashboard Animations | | | |
| Chart Rendering | | | |
| Modal Dialogs | | | |
| File Upload | | | |
| Responsive Layout | | | |
| 2FA Flow | | | |

Mark each cell as PASS/FAIL after testing.

---

## Appendix B: Performance Baseline Checks

For each of the following, record the page load time (from navigation to last visible element rendering):

| Page | Target (p95) | Actual | Status |
|------|-------------|--------|--------|
| `/dashboard` | < 3s | | |
| `/dashboard/diagnosis` | < 3s | | |
| `/dashboard/actions` | < 3s | | |
| `/dashboard/evidence` | < 3s | | |
| `/dashboard/deal-room` | < 3s | | |
| `/dashboard/settings` | < 2s | | |
| `/dashboard/financials` | < 3s | | |
| `/dashboard/valuation` | < 4s | | |

---

## Appendix C: Test Execution Log Template

| TC ID | Test Case Name | Status | Tester | Date | Notes |
|-------|---------------|--------|--------|------|-------|
| TC-0-001 | Signup Happy Path | | | | |
| TC-0-002 | Signup Trust Elements | | | | |
| ... | ... | | | | |

---

---

## Appendix D: Golden Test Fixture — Sample Business with Expected Calculations

This appendix provides a **complete sample business profile** with every assessment answer pre-defined, and every expected calculation output computed by hand using the exact formulas in the Exit OSx codebase. A tester should onboard this exact company, enter these exact answers, and verify that every displayed value matches the expected outputs below.

**Purpose:** Confirm that the scoring engine, valuation engine, bridge allocation, benchmark positioning, and What-If scenarios all produce mathematically correct results.

**Tolerance:** Displayed values should match within ±$1,000 for currency and ±1% for percentages (due to display rounding).

---

### D.1 Sample Company Profile

| Field | Value |
|-------|-------|
| **Company Name** | Meridian Consulting Group |
| **Industry** | Professional Services |
| **ICB Classification** | INDUSTRIALS > PROFESSIONAL_COMMERCIAL_SERVICES > PROFESSIONAL_SERVICES > PROFESSIONAL_SERVICES |
| **Annual Revenue** | $5,000,000 |
| **Annual EBITDA** | $800,000 |
| **Owner Compensation** | $250,000 |
| **Revenue Size Category** | $3M–$10M |

#### Core Business Factors (entered during onboarding)

| Factor | Selection | Score |
|--------|-----------|-------|
| Revenue Model | Recurring Contracts | 0.75 |
| Gross Margin | Good (50–70%) | 0.75 |
| Labor Intensity | Moderate | 0.75 |
| Asset Intensity | Asset Light | 1.00 |
| Owner Involvement | Moderate | 0.50 |

#### EBITDA Adjustments

| Type | Description | Amount |
|------|-------------|--------|
| ADD_BACK | Personal vehicle lease run through business | $50,000 |
| DEDUCTION | Below-market rent from related party | $20,000 |

---

### D.2 Assessment Answers (All 24 Questions)

Enter these exact answers during the assessment. Each row shows the question, the answer to select, its score value, the max impact points, and the earned points.

#### FINANCIAL (5 questions, 48 max points)

| # | Question | Answer to Select | Score | Max Pts | Earned |
|---|----------|------------------|-------|---------|--------|
| 1 | How consistent has your revenue been over the past 3 years? | Relatively stable (5–15% variance) | 0.67 | 10 | 6.70 |
| 2 | What percentage of your revenue comes from recurring sources? | 40–70% recurring | 0.67 | 12 | 8.04 |
| 3 | How diversified is your customer base? | Top customer is 10–25% of revenue | 0.67 | 10 | 6.70 |
| 4 | How accurate and up-to-date are your financial records? | Professional bookkeeping, monthly close | 0.67 | 8 | 5.36 |
| 5 | What is your gross profit margin? | 50–70% | 0.67 | 8 | 5.36 |

**FINANCIAL Score = 32.16 / 48 = 67.0%**

#### TRANSFERABILITY (4 questions, 47 max points)

| # | Question | Answer to Select | Score | Max Pts | Earned |
|---|----------|------------------|-------|---------|--------|
| 1 | How dependent is the business on you for day-to-day operations? | Team handles operations, I focus on strategy | 0.67 | 15 | 10.05 |
| 2 | Do you have a capable management team in place? | One or two leads, but limited autonomy | 0.33 | 12 | 3.96 |
| 3 | How well documented are your business processes? | Some informal documentation exists | 0.33 | 10 | 3.30 |
| 4 | Are customer relationships dependent on you personally? | Customers work with my team but prefer me involved | 0.67 | 10 | 6.70 |

**TRANSFERABILITY Score = 24.01 / 47 = 51.1%**

#### OPERATIONAL (4 questions, 34 max points)

| # | Question | Answer to Select | Score | Max Pts | Earned |
|---|----------|------------------|-------|---------|--------|
| 1 | How scalable is your current business model? | Some operational leverage exists | 0.67 | 12 | 8.04 |
| 2 | What is the quality of your technology infrastructure? | Modern systems, some areas need updating | 0.67 | 8 | 5.36 |
| 3 | How would you rate your employee retention? | Low turnover (5–15% annually) | 0.67 | 8 | 5.36 |
| 4 | Do you have formal vendor/supplier agreements? | Most key vendors under contract | 0.67 | 6 | 4.02 |

**OPERATIONAL Score = 22.78 / 34 = 67.0%**

#### MARKET (3 questions, 28 max points)

| # | Question | Answer to Select | Score | Max Pts | Earned |
|---|----------|------------------|-------|---------|--------|
| 1 | What is the growth trajectory of your market? | Moderately growing (5–10% annually) | 0.67 | 10 | 6.70 |
| 2 | How strong is your competitive position? | Clear competitive advantages in our niche | 0.67 | 10 | 6.70 |
| 3 | Do you have proprietary products, IP, or processes? | Some trade secrets or know-how | 0.33 | 8 | 2.64 |

**MARKET Score = 16.04 / 28 = 57.3%**

#### LEGAL & TAX (3 questions, 26 max points)

| # | Question | Answer to Select | Score | Max Pts | Earned |
|---|----------|------------------|-------|---------|--------|
| 1 | How clean is your corporate structure? | Relatively clean with minor issues | 0.67 | 8 | 5.36 |
| 2 | Are all contracts, licenses, and permits current and transferable? | Most items current, minor issues | 0.67 | 8 | 5.36 |
| 3 | Any pending litigation, disputes, or regulatory issues? | No litigation history or regulatory concerns | 1.00 | 10 | 10.00 |

**LEGAL_TAX Score = 20.72 / 26 = 79.7%**

#### PERSONAL (3 questions, 22 max points)

| # | Question | Answer to Select | Score | Max Pts | Earned |
|---|----------|------------------|-------|---------|--------|
| 1 | How clear are you on your exit timeline? | General timeframe (2–5 years) | 0.67 | 6 | 4.02 |
| 2 | Have you separated personal and business assets/expenses? | Mostly separated with minor exceptions | 0.67 | 8 | 5.36 |
| 3 | Are your key employees aware of and supportive of a potential sale? | Unaware but likely supportive | 0.33 | 8 | 2.64 |

**PERSONAL Score = 12.02 / 22 = 54.6%**

---

### D.3 Expected BRI Score Calculation

The overall BRI score is the weighted sum of all category scores:

| Category | Score | Weight | Contribution |
|----------|-------|--------|-------------|
| FINANCIAL | 0.6700 | 0.25 | 0.1675 |
| TRANSFERABILITY | 0.5109 | 0.20 | 0.1022 |
| OPERATIONAL | 0.6700 | 0.20 | 0.1340 |
| MARKET | 0.5729 | 0.15 | 0.0859 |
| LEGAL_TAX | 0.7969 | 0.10 | 0.0797 |
| PERSONAL | 0.5464 | 0.10 | 0.0546 |
| **TOTAL** | | **1.00** | **0.6239** |

**Expected BRI Score displayed: 62%**

---

### D.4 Expected Adjusted EBITDA

| Component | Amount | Formula |
|-----------|--------|---------|
| Base EBITDA | $800,000 | From company financials |
| + Add-backs | $50,000 | Personal vehicle lease |
| + Excess Owner Comp | $50,000 | max(0, $250K owner comp − $200K market salary for $3M–$10M bracket) |
| − Deductions | $20,000 | Below-market rent |
| **= Adjusted EBITDA** | **$880,000** | 800,000 + 50,000 + 50,000 − 20,000 |

---

### D.5 Expected Core Score

| Factor | Selection | Score |
|--------|-----------|-------|
| Revenue Model | RECURRING_CONTRACTS | 0.75 |
| Gross Margin | GOOD | 0.75 |
| Labor Intensity | MODERATE | 0.75 |
| Asset Intensity | ASSET_LIGHT | 1.00 |
| Owner Involvement | MODERATE | 0.50 |
| **Core Score** | | **(0.75 + 0.75 + 0.75 + 1.00 + 0.50) / 5 = 0.75** |

---

### D.6 Expected Valuation (Step-by-Step)

**Industry Multiples for Professional Services:** Low = 5.0x, High = 8.0x
**ALPHA constant:** 1.4

#### Step 1: Base Multiple (Core Score positions within industry range)
```
baseMultiple = 5.0 + 0.75 × (8.0 − 5.0) = 5.0 + 2.25 = 7.25x
```

#### Step 2: BRI Discount Fraction (non-linear)
```
discountFraction = (1 − 0.6239)^1.4 = (0.3761)^1.4 = 0.2543
→ 25.43% discount applied to the range above industry floor
```

#### Step 3: Final Multiple (with floor guarantee at 5.0x)
```
finalMultiple = 5.0 + (7.25 − 5.0) × (1 − 0.2543) = 5.0 + 2.25 × 0.7457 = 6.68x
```

#### Step 4: Current Value
```
currentValue = $880,000 × 6.68 = $5,876,447
```

#### Step 5: Potential Value (with EBITDA improvement)
The system also accounts for EBITDA improvement potential from addressing BRI gaps:
```
EBITDA Improvement Multiplier = 1 + 0.0599 = 1.0599 (capped at 1.25)
Potential EBITDA = $880,000 × 1.0599 = $932,755
Potential Value = $932,755 × 7.25 = $6,762,476
```

#### Step 6: Value Gap
```
valueGap = $6,762,476 − $5,876,447 = $886,030
```

---

### D.7 Expected Dashboard Values (Hero Metrics Bar)

After completing onboarding and assessment with the values above, the VALUE mode dashboard should display:

| Metric | Expected Value | Location on Dashboard |
|--------|---------------|----------------------|
| **Current Value** | **~$5,876,000** | Hero Metrics Bar, Card 1 |
| **Potential Value** | **~$6,762,000** | Hero Metrics Bar, Card 2 |
| **Value Gap** | **~$886,000** | Hero Metrics Bar, Card 3 |
| Value Gap Delta | "First month" (grey) | Below Value Gap card |
| BRI Score | 62% | Diagnosis page header |
| Final Multiple | 6.68x | Benchmark comparison |
| Industry Range | 5.0x – 8.0x | Benchmark comparison labels |

---

### D.8 Expected Benchmark Comparison

| Metric | Expected |
|--------|----------|
| Industry Range | 5.0x to 8.0x |
| Your Multiple | 6.68x |
| Percentile | 55.9% |
| Quartile | **MIDDLE** |
| Message | "You're in the middle range. Top quartile starts at 7.3x." |
| Bottom Quartile Threshold | 5.75x |
| Top Quartile Threshold | 7.25x |

---

### D.9 Expected Bridge Category Dollar Impacts (Valuation Bridge)

The bridge chart shows how much each category costs. Bars should be sorted by dollar impact descending:

| Rank | Category | Score | Dollar Impact | Buyer Explanation |
|------|----------|-------|--------------|-------------------|
| 1 | TRANSFERABILITY | 51% | ~$296,589 | "Buyers discount businesses that can't run without the owner." |
| 2 | FINANCIAL | 67% | ~$200,091 | "Buyers pay less when financial records lack depth or consistency." |
| 3 | OPERATIONAL | 67% | ~$160,073 | "Buyers see risk in businesses without documented, repeatable processes." |
| 4 | MARKET | 57% | ~$155,396 | "Buyers pay premiums for defensible market positions and diverse revenue." |
| 5 | LEGAL_TAX | 80% | ~$73,880 | "Buyers walk away from unresolved legal exposure and compliance gaps." |

**Note:** The bridge uses different category weights than BRI scoring. Bridge weights are: FINANCIAL=0.25, TRANSFERABILITY=0.25, OPERATIONAL=0.20, MARKET=0.15, LEGAL_TAX=0.15. PERSONAL is excluded from the bridge.

---

### D.10 Expected Diagnosis Page Category Scores

| Category | Score (displayed) | Weight | Status |
|----------|------------------|--------|--------|
| FINANCIAL | 67% | 25% | Moderate — room for improvement |
| TRANSFERABILITY | 51% | 20% | Weakest area — primary value gap driver |
| OPERATIONAL | 67% | 20% | Moderate — room for improvement |
| MARKET | 57% | 15% | Below average |
| LEGAL_TAX | 80% | 10% | Strongest area |
| PERSONAL | 55% | 10% | Below average |

---

### D.11 Expected What-If Scenario Results

#### Scenario A: Reduce Owner Involvement (MODERATE → LOW)

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Core Score | 0.75 (75%) | 0.80 (80%) | +5% |
| Base Multiple | 7.25x | 7.40x | +0.15x |
| Final Multiple | 6.68x | 6.79x | +0.11x |
| Current Value | $5,876,447 | $5,974,876 | **+$98,430** |

**Buyer Insight:** "Buyers discount businesses that can't operate without the founder."

#### Scenario B: Upgrade Revenue Model (RECURRING_CONTRACTS → SUBSCRIPTION_SAAS)

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Core Score | 0.75 (75%) | 0.80 (80%) | +5% |
| Base Multiple | 7.25x | 7.40x | +0.15x |
| Final Multiple | 6.68x | 6.79x | +0.11x |
| Current Value | $5,876,447 | $5,974,876 | **+$98,430** |

**Buyer Insight:** "Buyers pay premiums for predictable, recurring revenue streams."

**Note:** Scenarios A and B produce identical deltas because both change a core factor by the same amount (+0.25 on the 0–1 scale), which changes the core score by the same amount (+0.05). The dollar impact is identical because the BRI discount fraction is the same in both cases.

---

### D.12 Expected Progress Context (Fresh Company)

Immediately after onboarding — before any tasks are completed:

| Metric | Expected Value |
|--------|---------------|
| Value Recovered (Lifetime) | $0 |
| Value At Risk | $0 |
| Open Signal Count | 0 |
| Value Recovered This Month | $0 |
| Value At Risk This Month | $0 |
| Value Gap Delta | null — displays as "First month" |

---

### D.13 Test Execution Checklist

Use this checklist to verify each calculated value after onboarding the sample company:

| # | What to Verify | Expected | Actual | Pass? |
|---|---------------|----------|--------|-------|
| 1 | BRI Score on Diagnosis page | 62% | | |
| 2 | FINANCIAL category score | 67% | | |
| 3 | TRANSFERABILITY category score | 51% | | |
| 4 | OPERATIONAL category score | 67% | | |
| 5 | MARKET category score | 57% | | |
| 6 | LEGAL_TAX category score | 80% | | |
| 7 | PERSONAL category score | 55% | | |
| 8 | Current Value on hero bar | ~$5,876,000 | | |
| 9 | Potential Value on hero bar | ~$6,762,000 | | |
| 10 | Value Gap on hero bar | ~$886,000 | | |
| 11 | Value Gap Delta text | "First month" | | |
| 12 | Your Multiple on benchmark | 6.68x | | |
| 13 | Industry range labels | 5.0x – 8.0x | | |
| 14 | Benchmark quartile | Middle | | |
| 15 | Benchmark message | "...middle range. Top quartile starts at 7.3x." | | |
| 16 | Bridge #1 (highest) category | TRANSFERABILITY | | |
| 17 | Bridge #1 dollar impact | ~$297K | | |
| 18 | Bridge #2 category | FINANCIAL | | |
| 19 | Bridge #2 dollar impact | ~$200K | | |
| 20 | Bridge #5 (lowest) category | LEGAL_TAX | | |
| 21 | Bridge #5 dollar impact | ~$74K | | |
| 22 | What-If: Owner LOW delta | +~$98K | | |
| 23 | What-If: Owner LOW new multiple | 6.79x | | |
| 24 | Recovered value | $0 | | |
| 25 | At Risk value | $0 | | |
| 26 | Open Signals | 0 | | |

---

### D.14 Formula Reference (Quick Sheet)

For the tester's reference, these are the canonical formulas used by Exit OSx:

```
Core Score = avg(revenueModel, grossMargin, laborIntensity, assetIntensity, ownerInvolvement)

Base Multiple = industryLow + coreScore × (industryHigh − industryLow)

Discount Fraction = (1 − briScore)^1.4

Final Multiple = industryLow + (baseMultiple − industryLow) × (1 − discountFraction)
  [Floor: never below industryLow]

Current Value = adjustedEbitda × finalMultiple

Potential Value = potentialEbitda × baseMultiple
  where potentialEbitda = adjustedEbitda × (1 + ebitdaImprovementPotential)

Value Gap = potentialValue − currentValue

Bridge Dollar Impact per category:
  rawGap = (1 − categoryScore) × bridgeWeight
  dollarImpact = (rawGap / totalRawGap) × valueGap

BRI Score = Σ(categoryScore × categoryWeight)
  where categoryScore = totalEarnedPoints / totalMaxPoints

Benchmark Percentile = ((finalMultiple − industryLow) / (industryHigh − industryLow)) × 100
```

**Key Constants:**
- ALPHA = 1.4 (non-linear BRI discount exponent)
- EBITDA improvement cap = 25%
- BRI weights: FINANCIAL=0.25, TRANSFERABILITY=0.20, OPERATIONAL=0.20, MARKET=0.15, LEGAL_TAX=0.10, PERSONAL=0.10
- Bridge weights: FINANCIAL=0.25, TRANSFERABILITY=0.25, OPERATIONAL=0.20, MARKET=0.15, LEGAL_TAX=0.15

---

*End of Test Script*
