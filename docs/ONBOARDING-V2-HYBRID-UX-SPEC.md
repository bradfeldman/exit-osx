# Exit OSx 2.0 Onboarding Flow -- Hybrid Specification
**Date:** February 19, 2026
**Agent:** Product Designer/UX
**Base:** Option C (unauthenticated assessment) + surgical mocksite additions
**Supersedes:** onboarding-redesign-v1.md (which remains as architectural reference)

---

## Executive Summary

This is the most important funnel in the product. Every design decision serves one outcome: a business owner who lands on /assess sees enough honest value in 6 minutes that they willingly give us their email, then their account, then their first action.

The emotional arc is: Curiosity --> Honesty --> Recognition --> Urgency --> Commitment.

---

## Route Architecture

```
exitosx.com/assess              (public, unauthenticated)
  Screen 1: Business Basics     ~60 sec
  Screen 2: Business Profile    ~90 sec
  Screen 3: Buyer Confidence    ~2:30
  Screen 4: Review & Confirm    ~30 sec
  Screen 5: Results Reveal      ~60 sec viewing + conversion moment

exitosx.com/dashboard           (authenticated, first visit)
  First-Visit Dashboard         Single "First Move" card
```

Total pre-auth time: ~5-6 minutes.
No sidebar. No app chrome. No distractions.

---

## Global Frame: Assessment Shell

The assessment runs in a dedicated shell -- NOT inside the app layout. No sidebar, no header nav, no footer. This is a focused funnel.

### Desktop Layout (>768px)
- Full-width #F5F5F7 background
- Content card: max-width 640px, centered horizontally, centered vertically in viewport
- White card (#FFFFFF) with 1px #E5E7EB border, 16px radius, 40px padding
- Shadow: 0 8px 32px rgba(0,0,0,0.08)

### Mobile Layout (<768px)
- Full-width, no card -- content fills viewport with 20px horizontal padding
- Background stays #F5F5F7, content area white
- Bottom-safe padding for iOS home indicator: pb-safe (env(safe-area-inset-bottom))

### Persistent Elements (all screens)
- **Top bar:** Fixed, 56px height, white background, 1px bottom border
  - Left: Exit OS logo (32px blue rounded-square icon + "Exit OS" in SF Pro 18px bold)
  - Right: Step indicator "Step N of 5" in 13px semibold, --text-secondary color
- **Progress bar:** 3px tall, fixed at very top of viewport (above top bar), #0071E3 fill, animated width transition 400ms ease
  - Screen 1: 0% --> 20%
  - Screen 2: 20% --> 40%
  - Screen 3: 40% --> 75% (largest screen, progress increments per question)
  - Screen 4: 75% --> 90%
  - Screen 5: 90% --> 100%
- **Bottom bar:** Fixed, 72px height, white background, 1px top border
  - Left: Back button (secondary style, hidden on Screen 1)
  - Left-center: "Your data is private" with lock icon, 12px, --text-tertiary
  - Right: Continue button (primary style, blue #0071E3, white text)
  - Mobile: Back and Continue are full-width stacked, Continue on top

### Transitions Between Screens
- Content exits: opacity 0, translateX(-20px), 200ms ease-out
- Content enters: opacity 0 --> 1, translateX(20px) --> 0, 300ms ease-out, 100ms delay
- prefers-reduced-motion: instant swap, no transform

---

## Screen 1: Business Basics (~60 seconds)

### Purpose
Collect the minimum information needed to contextualize everything that follows. This screen must feel fast and lightweight -- like filling in a sticky note, not a government form.

### Layout
Single column, 3 fields, generous spacing between them.

### Content

**Eyebrow:** STEP 1 OF 5 (11px, uppercase, 0.8px letter-spacing, --accent color)

**Headline:** "Tell us about your business"
(28px, SF Pro bold, --text-primary, letter-spacing -0.5px)

**Subheadline:** "Takes about a minute. Everything stays private."
(15px, --text-secondary, line-height 1.6)

---

**Field 1: Business name**
- Label: "Business name" (13px semibold)
- Input: text, 48px height, 15px font, placeholder "e.g. Reynolds HVAC Services"
- autocomplete="organization"

**Field 2: What does your business do?**
- Label: "What does your business do?" (13px semibold)
- Input: textarea, 3 rows (~80px), 15px font, placeholder "e.g. Commercial and residential HVAC installation, maintenance, and repair serving the greater Dallas area"
- Helper text below: "One or two sentences. We use this to classify your industry." (12px, --text-tertiary)
- Character limit: 300 (soft limit, counter appears at 250+)

**Field 3: Annual revenue**
- Label: "Approximate annual revenue" (13px semibold)
- Input: **Revenue band selector** (NOT a dollar input)
- Implementation: 7 large tap-target pill buttons in a 2-column grid (mobile: 1 column)
  - Under $1M
  - $1M - $3M
  - $3M - $5M
  - $5M - $10M
  - $10M - $25M
  - $25M - $50M
  - $50M+
- Each pill: 48px height, 14px semibold text, 8px radius, 1px border
- Unselected: white bg, --border color border, --text-primary text
- Selected: --accent-light bg (#EBF5FF), --accent border, --accent text, 3px blue left border
- Helper text: "Used for industry benchmarking. Not shared." (12px, --text-tertiary)

### ICB Classification (server-side, invisible to user on this screen)
- When user moves focus away from the description field AND it has 20+ characters, fire a debounced POST to `/api/assess/classify`
- Server returns: `{ icbCode, industryName, confidence }` (e.g., "HVAC / Mechanical Services", 0.87)
- Classification is stored in session state but NOT displayed on Screen 1
- Displayed on Screen 4 (Review) with correction option

### Validation
- Business name: required, 2+ characters
- Description: required, 20+ characters
- Revenue: required (one band selected)
- Continue button disabled until all 3 are valid
- No inline errors until user attempts to Continue with empty fields
- Error state: red border on field, red helper text "Please enter your business name"

### Mobile Considerations
- Revenue pills stack to 1 column
- Textarea gets 4 rows on mobile (taller for thumb typing)
- All touch targets 48px minimum height

---

## Screen 2: Business Profile (~90 seconds)

### Purpose
Collect 5 core structural factors that drive valuation methodology. These replace the hardcoded defaults that created the trust-destroying bait-and-switch when users later corrected values in settings.

### Layout
5 questions, each presented as a labeled group with 2-3 large tappable option cards. Questions are stacked vertically with 28px gap between groups.

### Content

**Eyebrow:** STEP 2 OF 5

**Headline:** "How does your business operate?"
(28px, SF Pro bold)

**Subheadline:** "These shape your valuation model. Pick the closest match."
(15px, --text-secondary)

---

Each question follows this pattern:
- **Question label:** 14px semibold, --text-primary
- **Options:** Horizontal row of 2-3 cards (mobile: vertical stack)
- Each card: white bg, 1px --border, 12px radius, 16px padding, min-height 64px
- Selected: --accent-light bg, --accent 2px border, subtle check icon in top-right corner
- Content: Primary text (14px, semibold) + helper text (12px, --text-secondary)

---

**Q1: Revenue Model**
"How do customers pay you?"

| Option | Maps to |
|--------|---------|
| "Recurring contracts or subscriptions" | SUBSCRIPTION_SAAS |
| Helper: "Monthly/annual retainers, SaaS, maintenance contracts" | |
| "Project-based or one-time sales" | PROJECT_BASED |
| Helper: "Custom projects, product sales, event-based" | |
| "A mix of both" | HYBRID |
| Helper: "Some recurring, some project work" | |

**Q2: Your Role**
"How involved are you in daily operations?"

| Option | Maps to |
|--------|---------|
| "My team runs it. I focus on strategy." | MINIMAL |
| Helper: "Could step away for a month" | |
| "I make key decisions but have a capable team." | MODERATE |
| Helper: "Involved weekly, but not daily" | |
| "The business depends on me day-to-day." | CRITICAL |
| Helper: "Would struggle without you present" | |

**Q3: Profit Margins**
"What are your approximate gross margins?"

| Option | Maps to |
|--------|---------|
| "Above 60%" | EXCELLENT |
| Helper: "Software, consulting, professional services" | |
| "30% - 60%" | MODERATE |
| Helper: "Most service businesses, light manufacturing" | |
| "Below 30%" | LOW |
| Helper: "Heavy manufacturing, commodity, distribution" | |

**Q4: Workforce**
"What kind of workforce does your business rely on?"

| Option | Maps to |
|--------|---------|
| "Knowledge workers or automated systems" | LOW labor intensity |
| Helper: "Software, finance, consulting" | |
| "Mix of skilled and support staff" | MODERATE |
| Helper: "Most service businesses" | |
| "Physical labor or on-site presence required" | HIGH |
| Helper: "Construction, manufacturing, healthcare" | |

**Q5: Assets**
"What does the business primarily own?"

| Option | Maps to |
|--------|---------|
| "Digital or intellectual property" | ASSET_LIGHT |
| Helper: "Software, brands, patents, processes" | |
| "Physical assets" | ASSET_HEAVY |
| Helper: "Equipment, real estate, inventory, vehicles" | |

### Validation
- All 5 questions required
- Continue disabled until all answered
- No error states needed -- questions are visually distinct enough that omission is obvious

### Interaction Detail
- Clicking an option selects it immediately (no confirm needed)
- If user changes answer, old selection smoothly deselects (200ms border/bg transition)
- Keyboard: Tab between groups, arrow keys within groups, Enter/Space to select

### Mobile
- Option cards stack vertically (1 column)
- Each card gets full width, 56px min-height for comfortable tapping
- Question groups scroll naturally -- no pagination within this screen

---

## Screen 3: Buyer Confidence Scan (~2:30)

### Purpose
The heart of the assessment. 8 questions that reflect how buyers actually evaluate businesses. These feed directly into the BRI score and risk identification.

### Critical Design Change: 4-Option Scale
Instead of binary Yes/No (which loses signal and makes founders feel boxed in), each question uses a **4-option scale**:

- **Yes** -- fully true
- **Mostly** -- true with caveats
- **Not yet** -- working on it / aspiration
- **No** -- not currently

This is the single most impactful surgical addition from the mocksite review. Binary answers force false precision. "Mostly" and "Not yet" respect the founder's nuanced reality AND give us richer signal for scoring.

### Layout
One question at a time, full-width card, auto-advance after selection.

### Content

**Eyebrow:** BUYER CONFIDENCE SCAN (11px, uppercase, --accent color)

**Sub-header (persistent, above question card):**
"Question N of 8" on left, time remaining "~X min left" on right (13px, --text-secondary)

**Progress:** The main progress bar at top of screen increments per question answered: 40% + (question_number / 8 * 35%) -- so from 40% to 75%.

---

**Question Card Layout:**
- White card, 16px radius, 32px padding (24px mobile), shadow-md
- Category badge: pill shape, accent-light bg, accent text, 11px uppercase bold (e.g., "FINANCIAL", "TRANSFERABILITY")
- Question text: 20px (mobile: 18px), SF Pro semibold, --text-primary, line-height 1.35
- No rationale text shown during question (moved to Results Reveal -- reduces cognitive load during assessment)

**Answer Options:**
4 horizontal buttons in a row (mobile: 2x2 grid):

| Button | Visual | Score Weight |
|--------|--------|-------------|
| Yes | Green-tinted when selected (--green-light bg, --green border) | Full points |
| Mostly | Blue-tinted when selected (--accent-light bg, --accent border) | 70% points |
| Not yet | Orange-tinted when selected (--orange-light bg, --orange border) | 30% points |
| No | Red-tinted when selected (--red-light bg, --red border) | 0 points |

Each button:
- Unselected: 48px height, white bg, 1px --border, 8px radius, 14px semibold, --text-primary
- Selected: colored bg per above, 2px colored border, slight scale(1.02) on selection
- Hover (desktop): 1px colored border preview, background lightens

### Auto-advance Behavior
- On answer selection: 400ms pause, then animate to next question
- During pause: selected button shows a brief check-mark pulse (200ms)
- User CAN click Back button during the pause or after advancing
- On last question: "See My Results" replaces auto-advance

### The 8 Questions

(Carried forward from QuickScanStep.tsx, reframed for 4-option clarity)

**1. Financial Health**
"Would a buyer receive third-party-verified financials without needing to ask?"

**2. Customer Concentration**
"Does any single customer account for more than 10% of your revenue?"
(NOTE: scoring is INVERTED -- "Yes" is the risk here. Score mapping: Yes=0, Mostly=30, Not yet=70, No=100)

**3. Owner Independence**
"Could you show a buyer the business has run profitably without you for 30+ days?"

**4. Successor Readiness**
"Would a buyer meet someone who could step into your role within 90 days?"

**5. Operational Documentation**
"Could a new hire learn your core operations from written documentation alone?"

**6. Legal Contracts**
"Are all key customer and vendor relationships governed by signed contracts?"

**7. Revenue Predictability**
"Is more than half your revenue recurring or contracted for 12+ months?"

**8. Seller Commitment**
"If a buyer asked, could you credibly commit to a completed exit within 6 months?"

### Scoring Model
Each question is worth 12.5 points (8 * 12.5 = 100).
- Yes: 12.5 points
- Mostly: 8.75 points (70%)
- Not yet: 3.75 points (30%)
- No: 0 points
- Question 2 (concentration): inverted (No = 12.5, Not yet = 8.75, Mostly = 3.75, Yes = 0)

Final BRI from this scan: sum of all question scores, clamped to [35, 100] (floor of 35 ensures no one sees a score that feels punitive).

### Mobile
- 4 answer buttons in 2x2 grid (2 columns, 2 rows)
- Each button: full column width, 52px height
- Question text: 18px
- Swipe gesture NOT supported (too error-prone for consequential answers)

---

## Screen 4: Review & Confirm (~30 seconds)

### Purpose
Psychological safety checkpoint. Let the founder verify everything before we calculate. This prevents the "garbage in, garbage out" problem AND gives them one last chance to correct the server-side industry classification.

### Layout
Summary card with all answers organized into 3 sections, each editable.

### Content

**Eyebrow:** STEP 4 OF 5

**Headline:** "Everything look right?"
(28px, SF Pro bold)

**Subheadline:** "Tap any answer to change it. Your results depend on accuracy."
(15px, --text-secondary)

---

**Section 1: Your Business**
White card, 16px radius, 24px padding.

| Label | Value | Edit |
|-------|-------|------|
| Business name | "Reynolds HVAC Services" | pencil icon, inline edit |
| Industry | "HVAC / Mechanical Services" | "Change" link |
| Revenue | "$10M - $25M" | "Change" link |

**Industry correction flow:**
When user taps "Change" on Industry:
- Expands inline to show: "We classified you as HVAC / Mechanical Services. Is this right?"
- Two options: "Yes, that's right" (collapses) or "No, change it" (shows search/dropdown of industries)
- If they correct: update classification, show green check "Updated to [new industry]"

**Section 2: Business Profile**
White card with 5 rows.

| Label | Value | Edit |
|-------|-------|------|
| Revenue model | "Recurring contracts" | "Change" link |
| Your role | "Key decisions, capable team" | "Change" link |
| Margins | "30% - 60%" | "Change" link |
| Workforce | "Mix of skilled and support" | "Change" link |
| Assets | "Physical assets" | "Change" link |

Each "Change" link navigates back to Screen 2 with the relevant question scrolled into view, then returns to Screen 4 on save.

**Section 3: Buyer Confidence Answers**
White card with 8 rows, compact layout.

| # | Question (truncated) | Answer |
|---|----------------------|--------|
| 1 | Third-party financials... | Mostly |
| 2 | Customer concentration... | No |
| 3 | Business without you... | Not yet |
| ... | ... | ... |

Answer shown as colored pill badge matching the 4-option color scheme (green/blue/orange/red).
Each row is tappable -- navigates to that question in Screen 3, then returns.

**Bottom of card:**
"All good? Let's see what your business is worth." in 14px, --text-secondary, centered.

### Continue Button Text (Screen 4 only)
Changes from "Continue" to: **"See My Results"** (primary blue, slightly larger at 16px)

---

## Screen 5: Results Reveal (THE conversion moment)

### Purpose
This is the entire reason the funnel exists. The founder must feel: (1) "This is real and specific to me," (2) "There's clearly a gap I should close," and (3) "I need to save this." The sequence is designed to create an emotional arc from curiosity through recognition to urgency to action.

### Layout
Full viewport, centered content, no bottom bar. This screen breaks from the card-in-shell pattern -- it owns the entire viewport.

### Background
Subtle gradient: #F5F5F7 to #FFFFFF (top to bottom). On mobile, solid #FFFFFF.

### Phase 1: Calculation Interstitial (2 seconds)

The screen shows a brief "calculating" state. This is NOT fake delay -- the POST to /api/assess/calculate is firing. But even if it resolves instantly, we hold for 1.5-2 seconds because the pause creates psychological weight. Instant results feel cheap.

**Visual:**
- Centered in viewport
- Exit OS logo at top (48px, subtle)
- "Analyzing your business..." in 20px, SF Pro semibold, --text-primary
- Below: three animated dots or a subtle circular progress indicator (NOT a spinner -- too generic)
- Below that: rotating helper text that changes every 600ms:
  1. "Comparing to industry benchmarks..."
  2. "Calculating buyer confidence factors..."
  3. "Estimating valuation range..."
- Text: 13px, --text-secondary, fade transition between lines

**prefers-reduced-motion:** Static text "Calculating your results..." with no animation.

### Phase 2: BRI Score Reveal (2 seconds)

**Animation sequence:**
1. Calculation interstitial fades out (300ms)
2. 200ms pause
3. Score container fades in and scales from 0.95 to 1.0 (400ms, ease-out)

**Visual:**
- Centered, max-width 480px
- Large number: BRI score, displayed as a counter animation from 0 to final value
  - Counter duration: 1200ms, cubic ease-out (fast start, slow finish for dramatic landing)
  - Font: SF Pro, 72px (mobile: 56px), font-weight 900, --text-primary
  - Number uses tabular-nums for counter stability
- Below number: "out of 100" in 16px, --text-secondary
- Below that: label "Buyer Readiness Index" in 14px semibold, --accent color
- Below label: Qualitative interpretation based on score:
  - 85-100: "Strong -- you're ahead of most sellers" (--green)
  - 70-84: "Solid foundation with room to grow" (--accent)
  - 55-69: "Typical -- most businesses start here" (--orange)
  - 35-54: "Early stage -- significant upside available" (--red)
- Below interpretation: "Based on 8 buyer confidence factors for [Industry Name] businesses" in 12px, --text-tertiary

**Gauge visualization:**
Semi-circular gauge behind/around the number:
- 180-degree arc, stroke-width 8px
- Background track: --border-light
- Filled arc: gradient from --red (left) through --orange, --accent, to --green (right)
- Fill animates from 0 to score position over 1200ms, synchronized with counter
- Small marker dot at the score position, 12px diameter, white fill with 2px colored border

### Phase 3: Valuation Range (appears 1 second after BRI settles)

**Animation:** Fades in from below (translateY 20px --> 0, opacity 0 --> 1, 400ms ease-out)

**Visual:**
- White card below the BRI score, 16px radius, 1px border, 32px padding
- Two-column layout (mobile: stacked):

**Left column: "Current Estimated Value"**
- Dollar amount: 32px, SF Pro bold, --text-primary
- Example: "$4.2M - $6.8M"
- Below: "Based on [Revenue Band] revenue in [Industry]" in 12px, --text-secondary
- Below: "Industry multiple: 3.2x - 5.5x EBITDA" in 12px, --text-tertiary

**Right column: "Potential Value"**
- Dollar amount: 32px, SF Pro bold, --green
- Example: "$5.8M - $9.4M"
- Below: "If all buyer confidence gaps were closed" in 12px, --text-secondary

**Between columns (desktop) / Below both (mobile):**
- Gap callout: "You're leaving $1.2M - $2.6M on the table"
- Style: 16px, SF Pro semibold, --orange color
- Small info icon that on tap shows: "This range reflects the typical valuation impact of closing the gaps identified in your Buyer Confidence Scan."

**Methodology link:**
"How we calculated this" in 13px, --accent, underline on hover. Opens a slide-over panel with:
- Industry multiple source and range
- BRI-to-multiple mapping explanation
- Data limitations disclaimer
- "This is an estimate, not an appraisal" legal footnote

### Phase 4: Top Risk (appears 1 second after valuation)

**Animation:** Fades in from below, same pattern.

**Visual:**
Single card highlighting the #1 risk identified:
- Heading: "Your biggest value gap" in 14px semibold
- Risk name: e.g., "Owner Dependence" in 18px bold
- What a buyer would see: e.g., "A buyer would see that the business depends on you daily, which typically reduces offers by 15-25%." in 14px, --text-secondary
- Dollar impact: "Estimated impact: -$840K to -$1.4M" in 14px semibold, --red
- This single focused risk creates more urgency than showing all 8 results

### Phase 5: Soft Email Capture (appears 1.5 seconds after risk)

**This is the critical surgical addition.** Before the hard account gate, we capture email with a softer ask. If they bounce after this point, we can re-engage via email sequence.

**Animation:** Fades in below the risk card.

**Visual:**
- NOT a modal. NOT a popup. Inline in the scroll flow.
- White card with subtle --accent left border (3px)
- Heading: "Save your results" in 18px, SF Pro semibold
- Subheading: "We'll email you a summary and a link to pick up where you left off." in 14px, --text-secondary
- Email input: 48px height, 15px font, placeholder "your@email.com"
- Button: "Send My Results" (primary blue, full-width on mobile, 48px height)
- Below button: "No spam. Unsubscribe anytime." in 12px, --text-tertiary
- Skip link: "Skip for now" in 13px, --text-secondary, underline on hover

**After email submission:**
- Input + button replaced with: checkmark + "Sent! Check your inbox." in 14px, --green
- The email they receive contains:
  - BRI score and valuation range
  - Top 3 risks with dollar impact
  - Deep link: "Create your free account to start improving your score"
  - Link expires in 7 days (creates urgency without being manipulative)

**If they skip:**
- The skip link simply scrolls them to Phase 6 (account gate)
- No penalty, no guilt. They can always come back.
- Session data persists in sessionStorage for 24 hours

### Phase 6: Account Creation Gate

**This appears below the email capture (whether they submitted email or skipped).**

**What they can see without an account (visible above the gate):**
- BRI score and gauge (Phase 2)
- Valuation range (Phase 3)
- Top risk (Phase 4)

**What the gate locks:**
- Full breakdown of all 8 buyer confidence factors with individual scores
- Category-by-category dollar attribution
- Personalized action plan (tasks with dollar impact)
- Progress tracking over time
- What-if scenarios

**Gate Visual:**
- Clear divider line with "Create a free account to unlock your full results" centered on it
- Below divider: blurred preview of the category breakdown (6 horizontal bars, score numbers visible but details blurred)
- Below blurred preview: account creation card

**Account Creation Card:**
- White card, 16px radius, 40px padding, prominent shadow-lg
- Heading: "Your full exit readiness report is ready" in 22px bold
- Subheading: "Create a free account to see your complete breakdown and personalized action plan." in 15px, --text-secondary
- Bullet list (3 items, with accent-colored check icons):
  - "Detailed breakdown of all 8 buyer confidence factors"
  - "Personalized action items with dollar impact"
  - "Track your progress over time"
- Email input: pre-filled if they entered email in Phase 5 (key UX detail!)
- Full name input: 48px, placeholder "Your full name"
- Password input: 48px, with strength indicator (from signup.html pattern)
- "Create Account" button: primary blue, full width, 48px
- OR divider + "Continue with Google" button (secondary style, Google icon)
- Terms text: "By creating an account, you agree to our Terms and Privacy Policy" in 12px, --text-tertiary
- Below: "Already have an account? Sign in" link

**After account creation:**
- Assessment data (stored in sessionStorage) is saved to database via POST /api/assess/save
- Company, snapshot, and initial tasks are created
- User is redirected to /dashboard (first-visit state)
- Magic link is sent to email for future logins (if email/password auth)

---

## First-Visit Dashboard (after account creation)

### Purpose
The founder just saw their score and gaps. Now they need exactly ONE thing: the single highest-impact action they can take. Not three tasks. Not a checklist. One clear next move.

### Layout
The authenticated app shell appears for the first time: sidebar + header + main content. But the main content is dramatically simplified.

### What They See

**Header:** Standard app header with company name promoted (per header-redesign-spec). Valuation ticker shows the range from their assessment. No BRI badge in header.

**Sidebar:** Full navigation visible, but nothing is grayed out or locked. The sidebar signals "there's a whole product here" without blocking anything.

**Main content (max-width 5xl / 64rem):**

#### Section 1: Welcome Banner
- Full-width card, subtle gradient bg (white to --accent-light)
- Left: "Welcome, [First Name]" in 24px bold
- Below: "Your Buyer Readiness Index is [Score]/100. Here's your biggest opportunity." in 15px, --text-secondary
- Right: BRI score in a 64px circular progress ring (colored by score tier)
- Dismiss: "x" button in top-right, once dismissed it never returns

#### Section 2: Your First Move (the centerpiece)

This is a single, prominent action card. NOT a list of 3 tasks. One task. The one with the highest dollar impact and lowest effort barrier.

**Card design:**
- White card, 16px radius, generous 32px padding
- Top-left: Orange "RECOMMENDED" badge (11px uppercase, --orange-light bg, --orange text)
- Title: The task title in 20px bold (e.g., "Document your top 5 customer relationships")
- Why it matters: 1-2 sentences explaining the buyer consequence. e.g., "Buyers discount businesses where key customer relationships live in the owner's head. Documenting them signals transferability and directly improves your Buyer Readiness Index." (14px, --text-secondary)
- Dollar impact: "Estimated value impact: +$340K - $680K" in 14px semibold, --green
- Time estimate: clock icon + "About 45 minutes" in 13px, --text-tertiary
- Primary CTA: "Start This Action" (primary blue button, full width on mobile)
- Secondary: "See all actions" link below button (13px, --text-secondary)

**How the "first move" is selected:**
- From the 8 buyer confidence scan answers, identify the answer with the lowest score (ties broken by category dollar impact)
- Map that answer's category to the highest-impact task in that category
- If the lowest-scoring answer was "Owner Dependence," the first move might be "Document your top 5 customer relationships" or "Identify and brief a potential successor"

#### Section 3: Quick Wins (beneath the first move, low-key)

A compact row of 2-3 small cards showing other available actions, but visually subordinate to the First Move:
- Each card: 160px wide (scrollable horizontal on mobile), white bg, 12px radius, 16px padding
- Title only (14px semibold, truncated to 2 lines)
- Dollar impact pill: "+$XXK" in --green, 11px
- No CTA button -- just clickable to view detail

#### Section 4: Quiet Footer
Below the fold, barely visible unless they scroll:
- "Want a deeper picture? Take the full assessment (15 min)" link
- "Connect your financials for a precise valuation" link
- "Edit your business profile" link
- Each is a simple text link, 13px, --text-secondary, with a small right-arrow icon

### What is NOT on the first-visit dashboard
- No ValuationBridge component (available in Value mode but not front-and-center)
- No CategoryPanels (available in Diagnosis mode)
- No EvidenceBar (available in Evidence mode)
- No DealRoom preview
- No PlatformTour modal
- No "Getting Started" checklist with 3-5 steps

### Transition to Full Dashboard
After ANY of these conditions:
- User starts their first action
- User visits the dashboard 3+ times
- User completes the full assessment (from Diagnosis page)
- 7 days pass since account creation

...the Welcome Banner is replaced by the standard HeroMetricsBar, and the full ValueHome layout loads (with NextMoveCard in position 3 per the redesign plan). The First Move card remains visible in the Actions tab.

---

## "Why We Ask" Pattern

Per the directive: this is applied POST-AUTH in task detail views, NOT during the onboarding assessment.

During onboarding, the assessment is fast and frictionless. No explanatory sidebars, no "why we ask" cards alongside questions. That information would slow down the flow and add cognitive load at the wrong moment.

Post-auth, when a user opens a specific task detail, the "Why We Ask" pattern (from mocksite onboarding.html) appears as a collapsible sidebar card:
- Header: "Why this matters" with info icon
- 2-3 bullet points explaining buyer perspective
- Link to methodology
- Shown on first viewing, collapsed on return visits

---

## State Management

### Session Storage (pre-auth)
Key: `exitosx-assessment-v2`
Value: JSON object containing:
```json
{
  "step": 3,
  "businessName": "Reynolds HVAC",
  "description": "Commercial and residential HVAC...",
  "revenueBand": "10M_25M",
  "icbClassification": { "code": "...", "name": "HVAC / Mechanical Services", "confidence": 0.87 },
  "coreFactors": {
    "revenueModel": "HYBRID",
    "ownerInvolvement": "MODERATE",
    "grossMargins": "MODERATE",
    "laborIntensity": "MODERATE",
    "assetProfile": "ASSET_HEAVY"
  },
  "buyerScan": {
    "financial-1": "mostly",
    "financial-2": "no",
    "transferability-1": "not_yet",
    ...
  },
  "email": null,
  "timestamp": 1708300000000
}
```
- Persists across browser refresh
- Expires after 24 hours (user must restart)
- Cleared on account creation (data moves to database)

### URL State
- `/assess` -- Screen 1
- `/assess?step=2` -- Screen 2
- `/assess?step=3` -- Screen 3
- `/assess?step=4` -- Review
- `/assess/results` -- Screen 5 (Results Reveal)

Browser back button works correctly at every step.

---

## Analytics Events

| Event | Screen | Data |
|-------|--------|------|
| `assess_started` | 1 | source (landing page, direct, referral) |
| `assess_business_basics_completed` | 1 | revenueBand, hasDescription |
| `assess_industry_classified` | 1 | industryName, confidence |
| `assess_profile_completed` | 2 | all 5 core factors |
| `assess_scan_question_answered` | 3 | questionId, answer (yes/mostly/not_yet/no), timeOnQuestion |
| `assess_scan_completed` | 3 | briScore, riskCount, totalTime |
| `assess_review_completed` | 4 | changesCount, industryChanged |
| `assess_results_viewed` | 5 | briScore, valuationLow, valuationHigh |
| `assess_email_captured` | 5 | (no PII in event) |
| `assess_email_skipped` | 5 | - |
| `assess_account_created` | 5 | method (email/google), briScore |
| `assess_abandoned` | any | lastStep, timeSpent |
| `dashboard_first_visit` | dashboard | briScore, firstMoveTaskId |
| `first_move_started` | dashboard | taskId, taskCategory |

---

## Accessibility (WCAG AA)

- All answer options use `role="radiogroup"` and `role="radio"` with `aria-checked`
- Progress bar: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Focus management: on screen transition, focus moves to the screen headline (h1/h2)
- Skip link: "Skip to main content" at top of assessment shell
- Counter animation on Results Reveal: `aria-live="polite"` region announces final score
- All color indicators have text equivalents (not color-alone)
- Minimum 4.5:1 contrast ratio on all text
- All interactive elements 44px minimum touch target
- prefers-reduced-motion: all transitions instant, counter shows final value immediately

---

## Component Inventory (New)

| Component | Path | Purpose |
|-----------|------|---------|
| `AssessmentShell.tsx` | `/src/components/assess/` | Layout shell for /assess route (no sidebar) |
| `AssessmentFlow.tsx` | `/src/components/assess/` | State machine orchestrating 5 screens |
| `BusinessBasicsStep.tsx` | `/src/components/assess/steps/` | Screen 1 |
| `BusinessProfileStep.tsx` | `/src/components/assess/steps/` | Screen 2 |
| `BuyerScanStep.tsx` | `/src/components/assess/steps/` | Screen 3 (refactored from QuickScanStep) |
| `ReviewStep.tsx` | `/src/components/assess/steps/` | Screen 4 |
| `ResultsReveal.tsx` | `/src/components/assess/` | Screen 5 (phased animation) |
| `SoftEmailCapture.tsx` | `/src/components/assess/` | Inline email capture (Phase 5) |
| `AccountGate.tsx` | `/src/components/assess/` | Account creation form (Phase 6) |
| `ScoreGauge.tsx` | `/src/components/assess/` | Semi-circular BRI gauge with counter |
| `MethodologyPanel.tsx` | `/src/components/assess/` | Slide-over explaining calculation |
| `FirstVisitDashboard.tsx` | `/src/components/value/` | Curated first-visit main content |
| `FirstMoveCard.tsx` | `/src/components/value/` | Single featured action card |
| `RevenueBandSelector.tsx` | `/src/components/assess/` | 7-option pill grid |
| `ProfileOptionCard.tsx` | `/src/components/assess/` | Reusable option card for Screen 2 |
| `AnswerScale.tsx` | `/src/components/assess/` | 4-option (Yes/Mostly/Not yet/No) selector |

## API Endpoints (New)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/assess/classify` | POST | No | ICB classification from description |
| `/api/assess/calculate` | POST | No | BRI + valuation from all assessment data. Rate-limited: 10/hour per IP |
| `/api/assess/save` | POST | No | Create user + company + snapshot + tasks. Sends magic link. |
| `/api/assess/email` | POST | No | Save email for drip sequence (soft capture). Rate-limited. |

---

## Key Tradeoffs (Updated from v1.0)

| Decision | Gain | Sacrifice |
|----------|------|-----------|
| Revenue bands instead of exact dollar | Reduces hesitation, faster completion | Less precise valuation input (mitigated by industry multiples) |
| 4-option scale instead of binary | Richer signal, founders feel heard | More complex scoring model, slightly longer per question |
| Soft email before hard gate | Recoverable leads, higher total capture | Extra friction (mitigated by "skip" option) |
| Server-side ICB with correction | Simpler primary flow, AI-powered accuracy | User must correct if wrong (mitigated by review screen) |
| Single first move instead of 3 tasks | Reduces decision paralysis, higher start rate | Less immediate visibility into full action plan |
| No "Why We Ask" during assessment | Faster flow, less cognitive load | Founders may wonder "why does this matter" (mitigated by review screen context) |
| 1.5-2 sec calculation pause | Creates psychological weight, feels real | Technically unnecessary delay (mitigated by actual API call) |
| No rationale text during Buyer Scan | Faster question answering, cleaner UI | Less educational value during assessment (moved to results) |

---

## Implementation Priority

**Phase 1 (Week 1-2): Core Flow**
- AssessmentShell + AssessmentFlow state machine
- BusinessBasicsStep + RevenueBandSelector
- BusinessProfileStep + ProfileOptionCard
- /api/assess/classify endpoint
- Session storage persistence

**Phase 2 (Week 2-3): Assessment + Scoring**
- BuyerScanStep + AnswerScale (4-option)
- ReviewStep with industry correction
- Scoring engine (4-option weights)
- /api/assess/calculate endpoint

**Phase 3 (Week 3-4): Results + Conversion**
- ResultsReveal (all 6 phases)
- ScoreGauge with counter animation
- SoftEmailCapture + /api/assess/email
- AccountGate (pre-filled email, Google OAuth)
- /api/assess/save endpoint

**Phase 4 (Week 4-5): First Visit Dashboard**
- FirstVisitDashboard layout
- FirstMoveCard with task selection logic
- Welcome banner
- Transition logic (3 visits / first action / 7 days)

**Phase 5 (Week 5-6): Polish + Mobile**
- Animation timing refinement
- Mobile layout testing (iPhone SE through 15 Pro Max)
- Accessibility audit (NVDA, VoiceOver)
- Analytics instrumentation
- A/B test framework for soft email capture vs. skip

---

## Open Questions for PM/Engineering

1. **Rate limiting on /api/assess/calculate:** 10/hour per IP sufficient? Need CAPTCHA at any point?
2. **Email drip sequence content:** Who writes the 3-email sequence triggered by soft email capture? What's the cadence? (Suggested: Day 0, Day 2, Day 5)
3. **Google OAuth scope:** Do we request company/organization info from Google profile, or just email + name?
4. **Assessment data retention:** How long do we keep unauthenticated assessment data? 24h sessionStorage + 7-day server-side for email-captured leads?
5. **Multiple assessment attempts:** If someone completes assessment, doesn't create account, comes back later -- do they see their old results (from sessionStorage) or start fresh?
6. **BRI floor of 35:** Engineering team needs to confirm this matches the scoring engine expectations. Original code uses `Math.max(35, ...)`.
