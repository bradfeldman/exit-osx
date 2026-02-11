# Streamlined Onboarding Flow - PROD-003

## Overview

The streamlined onboarding flow eliminates redundant data entry and creates a single progressive experience that completes in under 5 minutes. Users flow through 4 steps with inline editing and background processing—no blocking screens, no repeated fields.

## Key Improvements

### 1. Zero Redundant Data Entry
- **Before**: Company name asked twice (signup + onboarding), business description asked twice (AI classification + "tell us more")
- **After**: Each field asked once, data flows through all steps

### 2. Inline Processing
- **Before**: Blocking "Analyzing..." screens, separate valuation preview page
- **After**: Background processing with inline progress indicators, seamless transitions

### 3. Progressive Enhancement
- **Before**: Must complete all fields before seeing any results
- **After**: Auto-trigger industry classification when description reaches 30 chars, immediate feedback

### 4. Inline Editing
- **Before**: Browser back button to edit previous answers, loses context
- **After**: Click step dots to navigate, all data preserved, instant context switching

## Flow Architecture

### Step 1: Company Basics (CompanyBasicsStep.tsx)
**Data Collected:**
- Company name (pre-filled from signup if available)
- Business description (20-500 chars)
- Industry classification (auto-classified via AI when description >= 30 chars)

**UX Features:**
- Auto-triggers AI industry classification after 1-second debounce
- Inline recommendation with "Accept" or "Choose Different" options
- Manual industry list fallback
- Edit capability: click "Change" to re-classify
- Completion indicator when all fields valid

**Background Processing:**
- None (AI classification happens inline as user types)

### Step 2: Financial Quick Scan (FinancialQuickScanStep.tsx)
**Data Collected:**
- Annual revenue (required)
- EBITDA estimate (optional)
- Employee count (optional)
- Years in business (optional)

**UX Features:**
- Hero-style revenue input with decorative glow effect
- Currency formatting with commas
- Optional fields clearly marked
- Completion indicator when revenue entered

**Background Processing:**
- User sync (non-fatal)
- Brief "Setting up your profile..." delay for perceived processing

### Step 3: Risk Assessment (RiskAssessmentStep.tsx)
**Data Collected:**
- 7 binary risk questions (Yes/No)
- Categories: Financial (2), Transferability (2), Operational (1), Legal (1), Market (1)

**UX Features:**
- Progress bar with question count
- Visual question navigator (dots showing answered/unanswered)
- Category badges on each question
- Rationale for each question
- Click any dot to jump to that question
- Auto-advance after answering (300ms delay)
- Disclaimer: "Most strong businesses answer No to more than half"
- Completion screen with review option

**Background Processing (Step 2 → 3 transition):**
- Create company in database
- Save core factors with optimal defaults
- Set selected company in context
- Processing overlay: "Creating your company profile..."

### Step 4: Exit Readiness Summary (ReadinessSummaryStep.tsx)
**Data Displayed:**
- Animated BRI score (0-100)
- Current valuation with animated counter
- Potential valuation with animated counter
- Value gap with animated counter
- Progress bar from current to potential
- Top 3 risk categories with scores
- Top 3 action items from generated task list

**UX Features:**
- Staged reveal animations (600ms delay for details)
- Animated number counters (2-second duration)
- Color-coded risk bars (red/amber/blue/green)
- Prominent CTA: "Start Improving My Business"
- Exit to dashboard

**Background Processing (Step 3 → 4 transition):**
- Calculate category scores from risk answers
- Fetch industry valuation multiples
- Calculate current/potential/gap using canonical formula
- Create onboarding snapshot for task value calculation
- Generate personalized task list (top 3 shown)
- Processing overlay: "Calculating your readiness score..." → "Calculating your valuation range..." → "Generating your action plan..."

## State Management

### Single State Object (`OnboardingState`)
```typescript
{
  // Step 1
  companyName: string
  businessDescription: string
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string

  // Step 2
  annualRevenue: number
  ebitdaEstimate: number
  employeeCount: number
  yearsInBusiness: number

  // Step 3
  riskAnswers: Record<string, boolean>

  // Calculated (Step 4)
  briScore: number
  categoryScores: Record<string, number>
  currentValue: number
  potentialValue: number
  valueGap: number

  // Backend
  companyId: string | null
  createdTasks: Array<{ id: string; title: string }>
}
```

### Persistence
- **sessionStorage**: Full state persisted on every update
- **localStorage**: `pendingCompanyName` from signup (consumed on mount)
- **Recovery**: State restored from sessionStorage on page refresh

### Validation
- **Step 1**: `companyName && businessDescription.length >= 20 && icbSubSector`
- **Step 2**: `annualRevenue > 0`
- **Step 3**: `Object.keys(riskAnswers).length === 7`
- **Step 4**: Always can proceed (display-only)

## API Endpoints Used

### Step 1
- `POST /api/industries/match` - AI industry classification
  - Input: `{ description: string }`
  - Output: `{ match: { icbIndustry, icbSuperSector, icbSector, icbSubSector, subSectorLabel, reasoning }, source: 'ai' | 'keyword' | 'default' }`

### Step 2 → 3 Transition
- `POST /api/user/sync` - Sync user to database (non-fatal)
- `POST /api/companies` - Create company
  - Input: `{ name, icbIndustry, icbSuperSector, icbSector, icbSubSector, annualRevenue, annualEbitda, ownerCompensation, businessDescription }`
  - Output: `{ company: { id, ... } }`
- `PUT /api/companies/[id]/core-factors` - Save optimal defaults
  - Input: `{ revenueSizeCategory, revenueModel, laborIntensity, assetIntensity, ownerInvolvement, grossMarginProxy }`

### Step 3 → 4 Transition
- `GET /api/companies/[id]/initial-valuation` - Fetch industry multiples
  - Output: `{ multipleLow, multipleHigh, adjustedEbitda, industryName, valuationLow, valuationHigh }`
- `POST /api/companies/[id]/onboarding-snapshot` - Create snapshot for task calculation
  - Input: `{ briScore, categoryScores }`
- `POST /api/tasks/generate` - Generate personalized task list
  - Input: `{ companyId, riskResults, riskQuestionAnswers }`
  - Output: `{ tasks: Array<{ id, title, description, category, estimatedValue }> }`

### Step 4 Complete
- `POST /api/email/onboarding-complete` - Send summary email (non-blocking)
  - Input: `{ companyId, currentValue, potentialValue, valueGap, briScore, categoryScores, topRisks }`

## Performance Optimizations

### Debouncing
- Industry classification debounced 1 second after typing stops
- Prevents excessive API calls while user is still typing

### Background Processing
- All heavy operations happen during step transitions
- Processing overlays with progress messages
- Non-fatal operations (user sync, email) don't block flow

### Animation Timing
- Entry animations: 300-400ms
- Number counters: 2000ms (feels substantial but not slow)
- Staged reveals: 600-800ms delays for visual hierarchy

### State Persistence
- sessionStorage prevents data loss on refresh
- Restore logic on mount handles tab refresh gracefully

## Testing the Streamlined Flow

### Enable Feature Flag
Access the streamlined flow via URL parameter:
```
/onboarding?streamlined=true
```

### Test Scenarios

**Happy Path:**
1. Enter company name + description (30+ chars)
2. AI auto-classifies industry → Accept recommendation
3. Enter revenue → Continue
4. Answer 7 risk questions
5. See summary with animated counters → Complete

**Edge Cases:**
1. **Tab refresh during flow**: State restored from sessionStorage
2. **AI classification fails**: Manual industry list available
3. **Reject AI recommendation**: Choose from manual list
4. **Edit previous answers**: Click step dots to navigate
5. **Company creation fails**: Error message shown, retry available
6. **Task generation fails**: Summary still shows, graceful degradation

### Comparison Metrics
- **Time to completion**: Target < 5 minutes
- **Abandonment rate**: Track by step
- **AI classification accuracy**: % of accepted recommendations
- **Field re-entry**: Should be 0 (no redundant fields)

## Migration Plan

### Phase 1: A/B Test (2 weeks)
- Feature flag: 50% of new signups see streamlined flow
- Track: completion rate, time to complete, NPS after onboarding
- Compare: old flow vs streamlined flow

### Phase 2: Full Rollout
- If streamlined flow shows >= 10% improvement in completion rate
- Remove feature flag, make streamlined default
- Keep old flow available via `?legacy=true` for 1 month

### Phase 3: Deprecate Old Flow
- After 1 month with no regressions
- Remove old OnboardingFlow component
- Clean up legacy code

## File Structure

```
src/components/onboarding/
├── OnboardingFlow.tsx                    # OLD: 6-step flow (PROD-002)
├── StreamlinedOnboardingFlow.tsx         # NEW: 4-step flow (PROD-003)
└── streamlined-steps/
    ├── CompanyBasicsStep.tsx             # Step 1: Name + description + industry
    ├── FinancialQuickScanStep.tsx        # Step 2: Revenue + optional metrics
    ├── RiskAssessmentStep.tsx            # Step 3: 7 binary questions
    └── ReadinessSummaryStep.tsx          # Step 4: BRI score + next steps

src/app/(onboarding)/onboarding/page.tsx  # Route with feature flag logic
```

## Design Decisions

### Why 4 Steps Instead of 6?
1. **Step 1 (Basics)**: Combined company name + description + industry (were separate in old flow)
2. **Step 2 (Financials)**: Single screen for all financial inputs (revenue was separate page)
3. **Step 3 (Risk)**: Same 7 questions, better navigation (was 8 questions, removed Personal for onboarding)
4. **Step 4 (Summary)**: Inline results, not separate results + first move pages

### Why Auto-Trigger Industry Classification?
- Reduces cognitive load: user doesn't need to know to click "Find Industry"
- Faster completion: classification happens while user is still thinking
- Fallback available: manual list if AI fails or user wants different option

### Why Inline Editing Instead of Back Button?
- Preserves context: see other answers while editing
- Faster navigation: click dot to jump directly to question
- Better UX: visual feedback on which questions are answered

### Why Background Processing Overlays?
- Transparency: user knows something is happening
- Progress messages: specific status updates reduce anxiety
- Non-blocking: can't proceed until processing complete (prevents errors)

## Known Limitations

1. **No "Save & Resume" on Step 3**: If user leaves during risk assessment, sessionStorage is lost (browser-scoped, not server-persisted)
2. **Company created on Step 2→3 transition**: If user abandons after Step 2, orphaned company exists (acceptable—cleaned up by cron job)
3. **Task generation happens in Step 3→4**: If generation fails, summary shows but no tasks (graceful degradation)

## Future Enhancements

1. **Server-side state persistence**: Store onboarding progress in database for cross-device resume
2. **Smart defaults**: Pre-fill EBITDA estimate based on revenue + industry averages
3. **Contextual help**: Tooltips for each risk question explaining why it matters
4. **Progress save prompts**: "We've saved your progress" toasts after each step
5. **Mobile optimization**: Swipe gestures for step navigation
6. **Voice input**: Dictate business description on mobile
7. **Skip logic**: If BRI score is excellent, skip tasks step and go straight to dashboard

## Success Metrics

**Primary KPIs:**
- Onboarding completion rate (target: +15% vs old flow)
- Time to completion (target: < 5 minutes)
- Activation rate: % who complete first task within 24 hours

**Secondary KPIs:**
- AI classification acceptance rate (target: > 80%)
- Step-by-step abandonment funnel
- Support tickets related to onboarding (target: -50%)

## Rollback Plan

If completion rate drops or critical bugs found:
1. Set `useStreamlined = false` in page.tsx (1 line change)
2. Deploy immediately—no data migration needed
3. Debug in staging with `?streamlined=true` flag
4. Fix and re-enable when stable
