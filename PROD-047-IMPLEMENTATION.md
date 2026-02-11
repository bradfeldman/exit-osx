# PROD-047: Gradual Exit Readiness Exposure Implementation

## Summary
Implemented a 3-stage gradual exposure system (Learn → See → Act) to prevent new user overwhelm. Users now progress through a guided journey before gaining full access to task management.

## Changes Made

### 1. Database Schema
**File**: `prisma/schema.prisma`
- Added `ExposureState` enum with values: LEARNING, VIEWING, ACTING
- Added `exposureState` field to User model (default: LEARNING)
- Created migration: `prisma/migrations/20260210_add_exposure_state/migration.sql`

### 2. Context Provider
**File**: `src/contexts/ExposureContext.tsx` (NEW)
- Created ExposureProvider context with state management
- Exposes: `exposureState`, `isLearning`, `isViewing`, `isActing`
- Actions: `completeTour()`, `startActing()`, `refetch()`
- Integrated into DashboardShell provider hierarchy (after ProgressionProvider)

**File**: `src/components/layout/DashboardShell.tsx`
- Added ExposureProvider to context hierarchy

### 3. API Endpoints
**File**: `src/app/api/user/exposure-state/route.ts` (NEW)
- **GET**: Fetch current user's exposure state
- **PATCH**: Update exposure state (validates against enum values)

### 4. Tour Integration
**File**: `src/components/value/PlatformTour.tsx`
- Integrated with ExposureContext
- Calls `completeTour()` when tour completes or is skipped
- Transitions user from LEARNING → VIEWING state

**File**: `src/components/value/ValueHome.tsx`
- Updated auto-tour trigger to only show when `isLearning === true`
- Prevents tour from showing to users who already completed it

### 5. View Mode UI
**File**: `src/components/actions/ViewOnlyBanner.tsx` (NEW)
- Displays prominent banner when in VIEWING mode
- Explains view-only state with "Start Acting" CTA
- Uses Eye icon and gradient background for visibility

**File**: `src/components/actions/ActionsPage.tsx`
- Imports and uses ExposureContext
- Shows ViewOnlyBanner when `isViewing && activeTasks > 0`
- Passes `disabled={isViewing}` to ActiveTaskCard and UpNextQueue

**File**: `src/components/actions/ActiveTaskCard.tsx`
- Added `disabled` prop
- Applies `opacity-60 pointer-events-none` when disabled
- Prevents all task interactions in View mode

**File**: `src/components/actions/UpNextQueue.tsx`
- Added `disabled` prop
- Disables "Start This Task" button when disabled

## User Flow

### Stage 1: LEARNING (Default)
- New users start here automatically
- ValueHome auto-shows PlatformTour after 600ms
- Tour explains the 5 core modes + value modeling + capital
- User can skip or complete tour → both transition to VIEWING

### Stage 2: VIEWING
- Dashboard fully visible with real company data
- Actions page displays all tasks but interactions are disabled
- ViewOnlyBanner shows explanation + "Start Acting" button
- User can explore without accidentally modifying task state

### Stage 3: ACTING
- Full feature access enabled
- All task interactions work normally
- This is the permanent end state

## Technical Notes

### Design Decisions
1. **User-scoped state**: ExposureState stored on User model (not Company) — it's per-user, not per-company
2. **Simple state machine**: Linear progression only (no regression)
3. **Orthogonal to other locks**: Works alongside subscription and progression gates
4. **Lightweight implementation**: Reused existing PlatformTour, no new libraries
5. **Non-intrusive UX**: Banner approach (not modal) for view-only state

### State Transitions
```
LEARNING --[completeTour()]--> VIEWING --[startActing()]--> ACTING
    ↑                               ↑
    └─────────[skip tour]───────────┘
```

### Migration Safety
- Migration adds column with default value (LEARNING)
- Existing users will be in LEARNING state initially
- They'll complete tour once and transition to VIEWING → ACTING
- No user data loss or breaking changes

## Testing Checklist
- [ ] New user signup → starts in LEARNING state
- [ ] Tour auto-opens on first dashboard visit
- [ ] Skip tour → transitions to VIEWING state
- [ ] Complete tour → transitions to VIEWING state
- [ ] ViewOnlyBanner appears on Actions page in VIEWING mode
- [ ] Tasks are disabled in VIEWING mode (opacity + pointer-events)
- [ ] "Start Acting" button transitions to ACTING state
- [ ] Tasks become interactive in ACTING state
- [ ] State persists across sessions
- [ ] Tour does not re-show for users in VIEWING/ACTING states

## Files Created
1. `src/contexts/ExposureContext.tsx`
2. `src/app/api/user/exposure-state/route.ts`
3. `src/components/actions/ViewOnlyBanner.tsx`
4. `prisma/migrations/20260210_add_exposure_state/migration.sql`
5. `PROD-047-IMPLEMENTATION.md` (this file)

## Files Modified
1. `prisma/schema.prisma` (User model + ExposureState enum)
2. `src/components/layout/DashboardShell.tsx` (provider hierarchy)
3. `src/components/value/PlatformTour.tsx` (tour completion hook)
4. `src/components/value/ValueHome.tsx` (tour trigger condition)
5. `src/components/actions/ActionsPage.tsx` (view-only integration)
6. `src/components/actions/ActiveTaskCard.tsx` (disabled state)
7. `src/components/actions/UpNextQueue.tsx` (disabled state)

## Next Steps
1. Test with real users to validate flow
2. Consider analytics tracking for each transition
3. Monitor if users get stuck in VIEWING mode (add escape hatch if needed)
4. Potentially add onboarding hints for other sections (Evidence, Deal Room)
5. A/B test tour timing (immediate vs 600ms delay)

## Related Systems
- **ProgressionContext**: Milestone-based feature gating (orthogonal to exposure)
- **SubscriptionContext**: Plan-based feature gating (orthogonal to exposure)
- **PlatformTour**: Existing tour component, now integrated with exposure
- **Analytics**: Tour completion already tracked; consider adding exposure state transitions

---

**Completed**: February 10, 2026
**Agent**: Lead Frontend Engineer (Claude Sonnet 4.5)
**Ticket**: PROD-047
