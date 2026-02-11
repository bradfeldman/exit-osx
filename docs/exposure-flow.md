# Exposure System Flow Diagram

## State Machine

```
┌──────────────────────────────────────────────────────────────────┐
│                         NEW USER SIGNUP                          │
│                              ↓                                   │
│                    exposureState = LEARNING                      │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                    LEARNING STATE (Initial)                      │
│                                                                  │
│  - Auto-trigger PlatformTour on first dashboard visit           │
│  - Tour shows 5 modes + value modeling + capital sections       │
│  - User can explore tour or skip it                             │
│                                                                  │
│  Actions:                                                        │
│    [Complete Tour] → completeTour() → VIEWING                   │
│    [Skip Tour]     → completeTour() → VIEWING                   │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                    VIEWING STATE (Read-Only)                     │
│                                                                  │
│  - Dashboard fully visible with real data                        │
│  - Actions page shows ViewOnlyBanner                             │
│  - Tasks visible but disabled (opacity-60, pointer-events-none)  │
│  - "Start This Task" buttons disabled in UpNextQueue             │
│  - User can explore without modifying state                      │
│                                                                  │
│  UI Elements:                                                    │
│    - ViewOnlyBanner with "Start Acting" CTA                      │
│    - Eye icon + explanation text                                 │
│                                                                  │
│  Actions:                                                        │
│    [Start Acting] → startActing() → ACTING                       │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                    ACTING STATE (Full Access)                    │
│                                                                  │
│  - All features enabled                                          │
│  - Tasks fully interactive                                       │
│  - No ViewOnlyBanner shown                                       │
│  - Normal app experience                                         │
│  - PERMANENT STATE (no regression)                               │
└──────────────────────────────────────────────────────────────────┘
```

## Component Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                        DashboardShell                           │
│                                                                 │
│  CompanyProvider                                                │
│    └─ UserRoleProvider                                          │
│         └─ SubscriptionProvider                                 │
│              └─ ProgressionProvider                             │
│                   └─ ExposureProvider ◄──────┐                  │
│                        └─ ExitCoachProvider  │                  │
│                                              │                  │
│  Provides to all children:                  │                  │
│    - exposureState                           │                  │
│    - isLearning, isViewing, isActing         │                  │
│    - completeTour(), startActing()           │                  │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
                                               │
                    ┌──────────────────────────┼──────────────────┐
                    │                          │                  │
        ┌───────────▼──────────┐   ┌───────────▼──────────┐     │
        │   ValueHome          │   │   ActionsPage        │     │
        │                      │   │                      │     │
        │  - useExposure()     │   │  - useExposure()     │     │
        │  - Auto-show tour    │   │  - Show banner if    │     │
        │    if isLearning     │   │    isViewing         │     │
        │                      │   │  - Disable tasks if  │     │
        │  PlatformTour        │   │    isViewing         │     │
        │    - completeTour()  │   │                      │     │
        │      on finish       │   │  ViewOnlyBanner      │     │
        └──────────────────────┘   │    - startActing()   │     │
                                   │      button          │     │
                                   │                      │     │
                                   │  ActiveTaskCard      │     │
                                   │    - disabled prop   │     │
                                   │                      │     │
                                   │  UpNextQueue         │     │
                                   │    - disabled prop   │     │
                                   └──────────────────────┘     │
                                                                │
                                      API Endpoint              │
                                      /api/user/exposure-state  │
                                        - GET: fetch state      │
                                        - PATCH: update state   │
                                                                │
                    Database                                    │
                    users.exposure_state ───────────────────────┘
                      ENUM('LEARNING', 'VIEWING', 'ACTING')
                      DEFAULT 'LEARNING'
```

## User Journey Timeline

```
Time →
│
├─ T0: User signs up
│      exposureState = LEARNING
│
├─ T1: First login, navigates to dashboard
│      ValueHome auto-shows PlatformTour after 600ms
│
├─ T2: User clicks through tour or skips
│      PlatformTour.handleNext() or .handleSkip()
│      → completeTour() called
│      → PATCH /api/user/exposure-state { exposureState: 'VIEWING' }
│      → exposureState = VIEWING
│
├─ T3: User navigates to Actions page
│      ActionsPage detects isViewing === true
│      → ViewOnlyBanner displayed
│      → Tasks visible but disabled
│
├─ T4: User explores dashboard, diagnosis, etc.
│      All read-only views work normally
│
├─ T5: User ready to start working
│      Clicks "Start Acting" button in ViewOnlyBanner
│      → startActing() called
│      → PATCH /api/user/exposure-state { exposureState: 'ACTING' }
│      → exposureState = ACTING
│
├─ T6: Full app access
│      All features enabled
│      Normal task interactions work
│
└─ T7+: Permanent ACTING state
       No further exposure gates
```

## Progressive Disclosure Layers

Exit OSx has multiple progressive disclosure systems working in harmony:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: EXPOSURE (User-level, one-time)                   │
│   - LEARNING → VIEWING → ACTING                             │
│   - Prevents immediate overwhelm                            │
│   - Guides through tour first                               │
└─────────────────────────────────────────────────────────────┘
                        ↓ (independent)
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: PROGRESSION (Milestone-based, per company)        │
│   - Actions: requires hasAssessment                         │
│   - Evidence: requires hasAssessment                        │
│   - Deal Room: requires evidencePercentage >= 70            │
└─────────────────────────────────────────────────────────────┘
                        ↓ (independent)
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: SUBSCRIPTION (Plan-based, per user)               │
│   - Foundation: Core 5 modes only                           │
│   - Growth: + Business Financials, PFS, Loans               │
│   - Exit-Ready: + DCF Valuation, Retirement Calculator      │
└─────────────────────────────────────────────────────────────┘
```

All three can apply simultaneously without conflict.

## Implementation Checklist

- [x] Database schema: ExposureState enum + User.exposureState field
- [x] Migration created and deployed
- [x] ExposureContext provider created
- [x] Context integrated into DashboardShell
- [x] API endpoint: GET /api/user/exposure-state
- [x] API endpoint: PATCH /api/user/exposure-state
- [x] PlatformTour calls completeTour() on finish/skip
- [x] ValueHome checks isLearning before auto-showing tour
- [x] ViewOnlyBanner component created
- [x] ActionsPage shows banner when isViewing
- [x] ActiveTaskCard accepts disabled prop
- [x] UpNextQueue accepts disabled prop
- [x] Documentation created
- [x] Memory updated

## Notes

- **No regression**: Users cannot go backward in exposure state
- **Session persistence**: State stored in database, not localStorage
- **Independent gating**: Exposure works alongside progression + subscription
- **Escape hatch**: Can be manually overridden via API for testing
- **Analytics**: Tour completion already tracked; consider adding state transitions
