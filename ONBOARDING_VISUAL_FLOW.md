# Streamlined Onboarding Flow - Visual Reference

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         SIGNUP PAGE                              │
│  User enters: email, password, name, [company name optional]     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 1: COMPANY BASICS                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Company Name: [Pre-filled from signup if available]       │ │
│  │ ✓ Acme Corp                                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ What does your business do?                                │ │
│  │ [Textarea: "We manufacture custom mouthguards..."]         │ │
│  │ 250/500 chars                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [AUTO-TRIGGERED when description >= 30 chars]                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ✨ Analyzing your business description...                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [AI RECOMMENDATION APPEARS]                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ✨ Recommended Classification                              │ │
│  │ Medical Equipment & Services                               │ │
│  │ "Based on your description of manufacturing medical..."    │ │
│  │ [Accept] [Choose Different]                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [AFTER ACCEPTING]                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ✓ Medical Equipment & Services                             │ │
│  │   Healthcare → Medical Equipment → Medical Devices         │ │
│  │   [Change]                                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [Back]                                      [Continue ▶]        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 STEP 2: FINANCIAL QUICK SCAN                     │
│  Progress: ● ● ○ ○                                               │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                Annual Revenue                               │ │
│  │         $    [2,500,000]                                    │ │
│  │ (Hero-style large input with glow effect)                  │ │
│  │ Don't worry about precision. We'll refine this as we go.   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Optional: Help us refine your estimate                          │
│  ┌─────────────┬─────────────┬─────────────────────────────┐   │
│  │ EBITDA      │ Employees   │ Years in Business           │   │
│  │ $[250,000]  │ [5]         │ [7]                         │   │
│  └─────────────┴─────────────┴─────────────────────────────┘   │
│                                                                   │
│  [Back]                                      [Continue ▶]        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ [BACKGROUND PROCESSING]
                         │  "Creating your company profile..."
                         │  • User sync
                         │  • Company creation
                         │  • Core factors save
                         │
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 3: RISK ASSESSMENT                        │
│  Progress: ● ● ● ○                                               │
│  ═════════════════════════ 5 of 7                                │
│  ○ ✓ ✓ ✓ ✓ ● ○                                                  │
│                                                                   │
│  ⚠️ Note: Most strong businesses answer "No" to more than       │
│     half of these. That's normal—and why value gaps exist.       │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [Financial]                              Question 5 of 7    │ │
│  │                                                              │ │
│  │ Could a buyer's new hire learn your core operations         │ │
│  │ from written documentation alone?                           │ │
│  │                                                              │ │
│  │ Tribal knowledge doesn't transfer. Buyers discount          │ │
│  │ what they can't systematize.                                │ │
│  │                                                              │ │
│  │        [Yes]                    [No]                        │ │
│  │                                                              │ │
│  │                    [Back]                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [Click any dot above to jump to that question]                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ [BACKGROUND PROCESSING]
                         │  "Calculating your readiness score..."
                         │  "Calculating your valuation range..."
                         │  "Generating your action plan..."
                         │  • Category scores calculation
                         │  • Valuation fetch
                         │  • Snapshot creation
                         │  • Task generation
                         │
┌─────────────────────────────────────────────────────────────────┐
│               STEP 4: EXIT READINESS SUMMARY                     │
│  Progress: ● ● ● ●                                               │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │       Your Exit Readiness Report                            │ │
│  │  Here's what buyers will see when they evaluate Acme Corp   │ │
│  │                                                              │ │
│  │          BUYER READINESS SCORE                              │ │
│  │                 [68] / 100                                  │ │
│  │                  Strong                                     │ │
│  │  ─────────────────────────────────────────────────────      │ │
│  │  Current Value  |  Potential Value  |  Value Gap           │ │
│  │    $8.5M        |      $12.2M       |   $3.7M              │ │
│  │                                                              │ │
│  │  Current ━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░ Potential          │ │
│  │  $8.5M                                   $12.2M             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  🎯 Top Areas for Improvement                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Founder Dependency               [▓▓▓▓▓▓▓░░░] 65           │ │
│  │ Financial Health                 [▓▓▓▓▓▓▓░░░] 70           │ │
│  │ Operational Systems              [▓▓▓▓▓▓▓▓░░] 72           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  📈 Your Personalized Action Plan                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ We've generated 12 high-impact tasks. Start with:          │ │
│  │ ① Obtain CPA-reviewed financial statements                 │ │
│  │ ② Create written SOPs for core operations                  │ │
│  │ ③ Reduce customer concentration below 10%                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│       [Start Improving My Business ▶]                            │
│                                                                   │
│  Your complete report and action plan are waiting in dashboard   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                          DASHBOARD                               │
│  User lands with full context:                                   │
│  • Company created and selected                                  │
│  • BRI score calculated                                          │
│  • Tasks generated and visible                                   │
│  • Onboarding snapshot saved                                     │
│  • Email sent with summary                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Key UX Moments

### 1. Auto-Classification Magic ✨

**Before (Old Flow):**
```
User types description →
User clicks "Find Industry" button →
Blocking wait with spinner →
Recommendation appears →
User clicks "Accept" →
Description field appears AGAIN ("Tell us more")
```

**After (Streamlined Flow):**
```
User types description →
[Reaches 30 chars] →
[1 second debounce] →
Inline "Analyzing..." message appears →
Recommendation appears inline →
User clicks "Accept" →
Done! (No re-entry)
```

### 2. Inline Editing Navigation

**Before (Old Flow):**
```
User on Question 6 →
Wants to change answer to Question 2 →
Clicks browser back 4 times →
Loses context of other answers →
Re-answers Question 2 →
Clicks Continue 4 times to get back
```

**After (Streamlined Flow):**
```
User on Question 6 →
Sees visual navigator: ○ ✓ ✓ ✓ ✓ ● ○ →
Clicks dot #2 →
Instantly jumps to Question 2 (all answers preserved) →
Changes answer →
Clicks dot #6 →
Instantly back to Question 6
```

### 3. Background Processing

**Before (Old Flow):**
```
User clicks Continue from Step 2 →
Full-screen blocking page appears →
"Creating company..." (2-3 seconds) →
Finally sees Step 3
```

**After (Streamlined Flow):**
```
User clicks Continue from Step 2 →
Modal overlay appears with progress →
"Creating your company profile..." →
User sees it's working but not blocked →
Overlay dismisses smoothly →
Step 3 appears with fade transition
```

### 4. Combined Summary

**Before (Old Flow):**
```
Results page: Shows BRI score + gap →
User clicks "Show Me How to Close It" →
First Move page: Shows single task →
User clicks "Start This Task" →
Finally lands in dashboard
```

**After (Streamlined Flow):**
```
Summary page: Shows BRI + valuation + gap + top 3 tasks all at once →
User sees complete picture →
User clicks "Start Improving My Business" →
Lands in dashboard with full context
```

## Animation Timings

### Step 1: Company Basics
- Name input: `0.1s delay`
- Description field: `0.2s delay`
- Industry result: `0.3s delay`
- Check icons: `spring animation` on appear

### Step 2: Financial Quick Scan
- Revenue input: `0.1s delay`
- Optional fields grid: `0.2s delay`
- Glow effect: `fade in` when revenue > 0

### Step 3: Risk Assessment
- Progress bar: `instant update`
- Question card: `0.3s slide in/out`
- Navigator dots: `instant highlight`

### Step 4: Readiness Summary
- BRI score: `2s animated counter`
- Valuation numbers: `2s animated counters`
- Progress bar: `1.5s fill animation from 0.8s delay`
- Risk bars: `0.8s staggered (0.1s between)`
- Action plan: `fade in at 1s delay`

## Responsive Breakpoints

### Mobile (< 640px)
- Single column layout
- Stack optional fields vertically
- Large touch targets (44px minimum)
- Sticky header with progress dots
- Bottom navigation (Back/Continue)

### Tablet (640px - 1024px)
- Two-column grid for optional fields
- Larger card padding
- Same navigation

### Desktop (> 1024px)
- Max-width: 800px centered
- Three-column grid for optional fields
- Generous whitespace

## Color System

### Progress Indicators
- Completed: `bg-primary` (Burnt Orange #B87333)
- Current: `w-8 bg-primary` (wider dot)
- Upcoming: `bg-muted-foreground/30`

### Status Colors
- Success/Check: `text-primary` (Burnt Orange)
- Error: `text-destructive` (Red)
- Warning: `bg-amber-50 border-amber-200`
- Info: `bg-muted/50`

### Risk Score Zones
- Critical (0-40): `bg-red-500`
- Developing (40-60): `bg-amber-500`
- Strong (60-75): `bg-blue-500`
- Excellent (75-100): `bg-green-500`

## Accessibility Features

### Keyboard Navigation
- Tab through all inputs
- Enter to submit
- Arrow keys in navigator dots
- Escape to close overlays

### Screen Readers
- Progress announced as "Step X of 4"
- Navigator dots: "Question X of 7, answered/unanswered"
- Processing overlays: "Processing: [message]"
- Animated counters: Final value announced

### Focus Management
- Visible focus rings (ring-2 ring-primary)
- Focus trap in modal overlays
- Logical tab order

### Motion Preferences
- `useCountUp` respects `prefers-reduced-motion`
- Instant updates instead of animations
- No motion sickness triggers

## Error States

### API Errors
```
┌────────────────────────────────────────────────────┐
│ ⚠️ Unable to classify industry                    │
│ Please choose from the manual list below.         │
│ [Show Industry List]                              │
└────────────────────────────────────────────────────┘
```

### Validation Errors
```
┌────────────────────────────────────────────────────┐
│ Company Name                              [X]      │
│ [Error: Company name is required]                 │
│ [Input field with red border]                     │
└────────────────────────────────────────────────────┘
```

### Processing Errors
```
┌────────────────────────────────────────────────────┐
│ ❌ Failed to create company                       │
│ Please try again. If the problem persists,        │
│ contact support.                                  │
│ [Retry] [Contact Support]                         │
└────────────────────────────────────────────────────┘
```

## Empty States

### No Tasks Generated
```
┌────────────────────────────────────────────────────┐
│ 📈 Your score is excellent!                        │
│ You're already well-positioned for exit.          │
│ [Go to Dashboard ▶]                               │
└────────────────────────────────────────────────────┘
```

## Loading States

### Step Transitions
```
┌────────────────────────────────────────────────────┐
│         [Spinner animation]                        │
│    Creating your company profile...                │
│  This will just take a moment...                   │
└────────────────────────────────────────────────────┘
```

### Inline Processing
```
✨ Analyzing your business description...
```

### Question Navigation
```
[Fade out current question]
[Fade in selected question]
(300ms transition)
```

This visual reference should help QA and stakeholders understand the exact user experience.
