# PROD-003 QA Checklist - Streamlined Onboarding Flow

## Pre-Test Setup

- [ ] Clear browser cache and cookies
- [ ] Clear localStorage and sessionStorage
- [ ] Test in incognito/private browsing mode for clean slate
- [ ] Test URL: `/onboarding?streamlined=true`

## Environment Setup

- [ ] Staging environment accessible
- [ ] Test user accounts created
- [ ] Database can be reset between tests
- [ ] Email delivery testable (check logs or test inbox)

---

## Step 1: Company Basics

### Field Validation
- [ ] Company name field is pre-filled if came from signup
- [ ] Company name shows check icon when valid
- [ ] Business description shows character counter (0/500)
- [ ] Business description minimum 20 chars enforced
- [ ] Business description check icon appears at 20+ chars
- [ ] Continue button disabled until all fields valid

### Auto-Classification
- [ ] AI classification doesn't trigger before 30 chars
- [ ] AI classification triggers 1 second after typing stops (30+ chars)
- [ ] "Analyzing..." message appears during classification
- [ ] Classification recommendation appears inline
- [ ] "Accept" button applies recommendation
- [ ] "Choose Different" button shows manual list
- [ ] Manual list can be accessed via link at bottom
- [ ] Selected industry shows with "Change" link
- [ ] Clicking "Change" resets industry selection

### Error Handling
- [ ] API failure shows error message with fallback
- [ ] Manual list opens if AI fails
- [ ] Can still proceed with manual selection

### Visual/UX
- [ ] Welcome message shows user's first name
- [ ] Progress dots show Step 1 active (4 dots total)
- [ ] All animations smooth (no jank)
- [ ] Info box explains why industry matters
- [ ] Completion indicator appears when all fields valid

---

## Step 2: Financial Quick Scan

### Field Validation
- [ ] Revenue input accepts numbers only
- [ ] Revenue input formats with commas (e.g., 2,500,000)
- [ ] Revenue input shows large hero style
- [ ] Revenue input shows decorative glow when > 0
- [ ] Optional fields clearly marked as "Optional"
- [ ] EBITDA estimate accepts numbers only
- [ ] Employee count accepts integers only
- [ ] Years in business accepts integers only
- [ ] Continue button disabled until revenue > 0
- [ ] Completion indicator appears when revenue entered

### Visual/UX
- [ ] Progress dots show Step 2 active
- [ ] Step title shows "Step 2 of 4"
- [ ] Optional fields in responsive grid (3 cols desktop, 1 col mobile)
- [ ] Info box explains how data is used
- [ ] Currency symbol ($) aligned properly

---

## Step 2 → 3 Transition

### Background Processing
- [ ] Processing overlay appears
- [ ] Message: "Creating your company profile..."
- [ ] Spinner animation displays
- [ ] UI is non-interactive during processing
- [ ] Processing completes without errors
- [ ] Overlay dismisses smoothly
- [ ] Step 3 appears with fade transition

### Error Handling
- [ ] Company creation failure shows error message
- [ ] Error message includes retry option
- [ ] Can retry without losing data
- [ ] Can go back to edit if needed

### Data Integrity
- [ ] Company created in database
- [ ] Core factors saved with optimal defaults
- [ ] Company selected in context
- [ ] All Step 1 and 2 data preserved

---

## Step 3: Risk Assessment

### Question Navigation
- [ ] Progress bar shows X of 7
- [ ] Visual navigator shows 7 dots
- [ ] Current question highlighted
- [ ] Answered questions show check icon
- [ ] Unanswered questions show empty circle
- [ ] Can click any dot to jump to that question
- [ ] Jumping preserves all previous answers
- [ ] Back button works (goes to previous question)
- [ ] Auto-advance after answering (300ms delay)

### Question Display
- [ ] Category badge shows (Financial, Transferability, etc.)
- [ ] Question text clear and readable
- [ ] Rationale in italics below question
- [ ] Yes/No buttons large and clear
- [ ] Selected answer highlighted
- [ ] Can change answer by clicking again

### Completion
- [ ] Completion screen appears after 7th answer
- [ ] Can review answers via "Back" or clicking dots
- [ ] Continue button shows "Calculate My Score"
- [ ] Disclaimer visible: "Most businesses answer No..."

### Visual/UX
- [ ] Progress dots show Step 3 active
- [ ] Question cards animate smoothly (300ms)
- [ ] No layout shift during navigation
- [ ] Navigator dots keyboard accessible

---

## Step 3 → 4 Transition

### Background Processing
- [ ] Processing overlay appears
- [ ] Message 1: "Calculating your readiness score..."
- [ ] Message 2: "Calculating your valuation range..."
- [ ] Message 3: "Generating your action plan..."
- [ ] Messages change as processing progresses
- [ ] Spinner animation displays throughout
- [ ] UI is non-interactive during processing
- [ ] Processing completes without errors
- [ ] Overlay dismisses smoothly

### Error Handling
- [ ] Valuation fetch failure handled gracefully
- [ ] Task generation failure doesn't block summary
- [ ] Partial results still displayed if some APIs fail
- [ ] Error messages shown if critical failure

### Data Integrity
- [ ] BRI score calculated correctly
- [ ] Category scores calculated from answers
- [ ] Current valuation matches industry multiples
- [ ] Potential valuation calculated correctly
- [ ] Value gap = potential - current
- [ ] Snapshot created in database
- [ ] Tasks generated (or empty array if failed)

---

## Step 4: Exit Readiness Summary

### Score Display
- [ ] BRI score animates from 0 to actual value (2s)
- [ ] BRI score shows X / 100 format
- [ ] BRI zone label correct (Critical/Developing/Strong/Excellent)
- [ ] Current value animates with counter
- [ ] Potential value animates with counter
- [ ] Value gap animates with counter
- [ ] All currency formatted correctly (M/K notation)
- [ ] Progress bar fills from current to potential

### Risk Breakdown
- [ ] Top 3 risk categories displayed
- [ ] Category labels correct (friendly names)
- [ ] Risk bars animate with stagger (0.1s between)
- [ ] Bar colors match score zones (red/amber/blue/green)
- [ ] Percentages shown for each category

### Action Plan
- [ ] Top 3 tasks displayed
- [ ] Task titles clear and actionable
- [ ] Numbered list (1, 2, 3)
- [ ] Message shows total task count
- [ ] Section styled with amber gradient

### Completion
- [ ] CTA button: "Start Improving My Business"
- [ ] Clicking CTA navigates to dashboard
- [ ] Company is selected in dashboard
- [ ] Tasks are visible in Actions mode
- [ ] Onboarding state cleared from sessionStorage

### Visual/UX
- [ ] Progress dots show Step 4 active (all filled)
- [ ] All animations smooth (2s counters)
- [ ] Staged reveals work (600ms delay)
- [ ] Content doesn't jump or shift
- [ ] Mobile responsive layout

---

## Cross-Cutting Concerns

### State Persistence
- [ ] Refresh on Step 1 → State restored, no data loss
- [ ] Refresh on Step 2 → State restored, no data loss
- [ ] Refresh on Step 3 → State restored, answers preserved
- [ ] Refresh on Step 4 → State restored (or redirect to dashboard)
- [ ] sessionStorage key: `streamlined_onboarding_state`
- [ ] localStorage cleared after completion

### Navigation
- [ ] Back button works on Steps 1-3
- [ ] Back button hidden on Step 1
- [ ] Continue button disabled when invalid
- [ ] Continue button shows loading state when processing
- [ ] Progress dots accurate throughout
- [ ] Can't skip steps by URL manipulation

### Error Recovery
- [ ] Network timeout shows error message
- [ ] 500 errors show user-friendly message
- [ ] 400 errors show validation feedback
- [ ] Can retry after error
- [ ] Can go back and edit data after error
- [ ] No data loss on error

### Accessibility
- [ ] All inputs keyboard accessible (Tab)
- [ ] Focus visible (ring-2 ring-primary)
- [ ] Screen reader labels present
- [ ] aria-label on navigator dots
- [ ] Color contrast WCAG AA compliant
- [ ] No motion for prefers-reduced-motion users
- [ ] Overlays trap focus when active

### Performance
- [ ] Initial load < 2s
- [ ] Step transitions smooth (no jank)
- [ ] AI classification < 3s
- [ ] Company creation < 3s
- [ ] Task generation < 5s
- [ ] Animations don't block interaction
- [ ] No console errors or warnings

### Mobile Responsiveness
- [ ] iPhone 12 (390px): All content visible, no horizontal scroll
- [ ] iPad (768px): Layout adapts appropriately
- [ ] Desktop (1440px): Max-width enforced (800px)
- [ ] Touch targets >= 44px (buttons, dots, inputs)
- [ ] Numeric keyboard on mobile for revenue input
- [ ] Pinch-to-zoom disabled on inputs

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS 15+)
- [ ] Mobile Chrome (Android)

---

## Comparison Testing

### Side-by-Side with Old Flow
- [ ] Old flow: `/onboarding` (no param)
- [ ] New flow: `/onboarding?streamlined=true`
- [ ] Both flows complete successfully
- [ ] Both create company with same data structure
- [ ] Both generate tasks
- [ ] Both send completion email

### Data Consistency
- [ ] Company data matches between flows
- [ ] BRI scores consistent for same answers
- [ ] Valuations consistent for same inputs
- [ ] Tasks similar for same risk profile
- [ ] Snapshots format identical

---

## Edge Cases

### Empty/Missing Data
- [ ] No company name from signup → Field is empty
- [ ] Very short business description (< 20 chars) → Validation error
- [ ] Very long business description (> 500 chars) → Truncated
- [ ] Revenue = 0 → Continue disabled
- [ ] Negative revenue → Validation error
- [ ] Non-numeric revenue → Parsing error caught

### AI Classification Edge Cases
- [ ] Generic description → Falls back to keyword match
- [ ] Typos in description → Still classifies correctly
- [ ] Non-English description → API error handled
- [ ] Empty description → No classification triggered
- [ ] Description changed after classification → Can re-classify

### Risk Assessment Edge Cases
- [ ] All Yes answers → BRI ~90-100
- [ ] All No answers → BRI ~35-40
- [ ] Mix of answers → BRI 40-80 range
- [ ] Rapid clicking → Doesn't break navigation
- [ ] Clicking same dot twice → No issue

### Session Edge Cases
- [ ] Multiple tabs → State synced across tabs (if possible)
- [ ] Tab closed mid-flow → State preserved in sessionStorage
- [ ] Browser restart → State lost (expected, sessionStorage scoped)
- [ ] Switch devices → State lost (expected, no server persistence)
- [ ] Logout during flow → Redirected to login

---

## Email Verification

### Completion Email
- [ ] Email sent to user after Step 4 complete
- [ ] Email contains BRI score
- [ ] Email contains valuation summary
- [ ] Email contains top risks
- [ ] Email styled correctly (no broken images)
- [ ] Links in email work (back to dashboard)
- [ ] Email arrives within 1 minute

---

## Analytics Tracking

### Events Tracked
- [ ] `onboarding_started` - Step 1 loaded
- [ ] `industry_search` - AI classification triggered
- [ ] `industry_selected` - Industry accepted/selected
- [ ] `step_completed` - Each step completed
- [ ] `onboarding_completed` - Full flow completed
- [ ] `onboarding_abandoned` - User leaves mid-flow

### Properties Captured
- [ ] `step_number` - Current step
- [ ] `time_on_step` - Seconds spent on each step
- [ ] `total_time` - Total completion time
- [ ] `ai_classification_source` - ai/keyword/manual
- [ ] `bri_score` - Final score
- [ ] `value_gap` - Dollar amount

---

## Rollback Verification

### Feature Flag Toggle
- [ ] Setting `streamlined=false` (or removing param) → Old flow loads
- [ ] Old flow still works after new flow deployed
- [ ] Can switch between flows without breaking
- [ ] Both flows coexist without conflicts

---

## Success Criteria

### Functional
- [ ] 100% of test cases pass
- [ ] Zero critical bugs
- [ ] Zero TypeScript errors
- [ ] Zero console errors
- [ ] All API calls return 200/201

### User Experience
- [ ] Completion time < 5 minutes (tested with stopwatch)
- [ ] No redundant data entry (checked by hand)
- [ ] Inline editing works smoothly
- [ ] Processing feels fast (perceived performance)
- [ ] Animations delightful, not distracting

### Performance
- [ ] Lighthouse score >= 90
- [ ] No layout shift (CLS < 0.1)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No memory leaks (DevTools profiler)

---

## Sign-Off

**QA Engineer:** _________________________ Date: _________

**Lead Frontend Engineer:** _________________________ Date: _________

**Product Manager:** _________________________ Date: _________

---

## Notes

Use this section to document any bugs found, edge cases discovered, or observations:

```
Example:
- Bug: AI classification fails for description with emojis
- Edge case: User enters revenue as "2.5M" instead of "2500000"
- Observation: Step 3 navigation feels slightly laggy on slow networks
```

---

## Test Data

Use these test scenarios for consistent testing:

### Scenario A: SaaS Company
- Name: TechFlow Solutions
- Description: We build project management software for remote teams with 15 employees and 3 years in business
- Revenue: $2,500,000
- Risk answers: 4 Yes, 3 No
- Expected BRI: ~65-70

### Scenario B: Manufacturing Company
- Name: Precision Parts Co
- Description: We manufacture precision machined components for the aerospace industry with 50 employees and 20 years in business
- Revenue: $15,000,000
- Risk answers: 6 Yes, 1 No
- Expected BRI: ~85-90

### Scenario C: Service Business
- Name: Elite Consulting
- Description: We provide management consulting to mid-market companies with 8 employees and 5 years in business
- Revenue: $1,200,000
- Risk answers: 2 Yes, 5 No
- Expected BRI: ~40-50
