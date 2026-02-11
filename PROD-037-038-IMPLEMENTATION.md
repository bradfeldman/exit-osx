# PROD-037 & PROD-038 Implementation Summary

## PROD-037: Task Sub-Steps Persistence

### Problem
Sub-steps were dynamically generated from `richDescription.subTasks` with completion state stored in `taskProgress` JSON field using composite keys (`"0-1": true`). This was fragile - if richDescription changed, the mapping broke, and progress didn't survive those changes.

### Solution
Created a proper `TaskSubStep` model with explicit database relationships.

### Changes Made

#### 1. Database Schema (`prisma/schema.prisma`)
- Added `TaskSubStep` model with fields:
  - `id` (cuid primary key)
  - `taskId` (foreign key to Task)
  - `title` (string)
  - `order` (integer for sort order)
  - `completed` (boolean)
  - `completedAt` (timestamp, nullable)
  - `createdAt` / `updatedAt` (timestamps)
- Added `subSteps` relation to Task model
- Created index on `[taskId, order]` for efficient querying

#### 2. Migration
- Created migration file: `20260210205418_add_task_sub_steps/migration.sql`
- Applied migration to database
- Created data migration script: `scripts/migrate-task-substeps.ts`
  - Reads all tasks with `richDescription.subTasks`
  - Creates TaskSubStep records for each sub-task
  - Migrates completion state from `taskProgress` JSON
  - Preserves old `taskProgress` as backup

#### 3. API Updates

**`src/app/api/companies/[id]/actions/route.ts`:**
- Replaced `deriveSubSteps()` function with `formatSubSteps()`
- Updated task query to include `subSteps` relation
- Sub-steps now fetched from database instead of derived

**`src/app/api/tasks/[id]/route.ts`:**
- Updated GET endpoint to include `subSteps` in response
- Changed PATCH endpoint to accept `subStepId` and `subStepCompleted` instead of `subStepProgress`
- Sub-step toggle now updates `TaskSubStep` record directly via Prisma
- Sets `completedAt` timestamp when marking complete

#### 4. Task Generation (`src/lib/playbook/generate-tasks.ts`)
- Added `createSubStepsForTask()` helper function
- Updated `generateTasksForCompany()` to create TaskSubStep records after creating tasks
- Extracts sub-tasks from `richDescription.subTasks` and creates database records
- Preserves order with sequential `order` field

#### 5. Frontend Updates

**`src/components/actions/ActionsPage.tsx`:**
- Updated `handleSubStepToggle()` to send `{ subStepId, subStepCompleted }` payload
- Removed old `subStepProgress` JSON approach

### Result
- Sub-steps are now persisted in their own table
- Progress survives task updates and richDescription changes
- Completion timestamps are tracked
- Order is explicitly managed
- Database relationships ensure referential integrity (cascade delete)

---

## PROD-038: Add Pace Indicator to Actions Page

### Problem
Actions page showed "this month" stats but no forward-looking projection. Users couldn't see "At this rate, you'll close your Value Gap in ~X months."

### Solution
Created pace calculation API and integrated into HeroSummaryBar.

### Changes Made

#### 1. Pace API (`src/app/api/companies/[id]/pace/route.ts`)
- Calculates:
  - `monthlyCompletionRate`: tasks completed per month
  - `averageValuePerTask`: average value of completed tasks
  - `projectedMonthsToClose`: time to close remaining value gap at current pace
  - `remainingValueGap`: current value gap from latest snapshot
  - `hasEnoughHistory`: true if 3+ months of completion data exists

- Algorithm:
  1. Fetch completed tasks from last 3+ months
  2. Calculate time span between earliest and latest completion
  3. Compute monthly rate: `tasksCount / timeSpanMonths`
  4. Compute average value: `totalValue / tasksCount`
  5. Project pace: `remainingGap / (monthlyRate * averageValue)`

- Edge cases handled:
  - No completed tasks → null projection
  - Less than 3 months history → `hasEnoughHistory: false`
  - Zero value gap → null projection (already at target)
  - Zero pace → null projection (not completing tasks)

#### 2. UI Integration (`src/components/actions/HeroSummaryBar.tsx`)
- Added `useCompany()` hook to get `selectedCompanyId`
- Created `fetchPaceData()` callback to call `/api/companies/[id]/pace`
- Displays pace message when:
  - `hasEnoughHistory` is true
  - `projectedMonthsToClose` is not null
  - Completed tasks this month > 0

- Message format: "At this rate, you'll close your Value Gap in ~X months"
- Styled in emerald color to indicate forward progress
- Positioned below "This Month" stats
- Silently fails if API call errors (non-critical feature)

#### 3. Tests (`src/app/api/companies/[id]/pace/route.test.ts`)
- Test: Returns zero pace when no completed tasks exist
- Test: Calculates pace correctly with 3+ months of history
- Test: Handles edge case where value gap is already zero
- Test: Marks hasEnoughHistory as false when timespan < 3 months
- All tests passing ✓

### Result
- Users see forward-looking projection: "At this rate, you'll close your Value Gap in ~8 months"
- Only shows when meaningful (3+ months history, active completion)
- Calculation accounts for task completion rate AND value per task
- Gracefully handles edge cases (no gap, no tasks, insufficient history)

---

## Testing

### Unit Tests
- Created `src/app/api/companies/[id]/pace/route.test.ts` with 4 test cases
- All tests passing ✓

### Integration Testing Checklist
- [ ] Verify sub-steps persist across page refresh
- [ ] Verify sub-step completion updates progress bar
- [ ] Verify pace indicator appears after completing tasks for 3+ months
- [ ] Verify pace projection updates as tasks are completed
- [ ] Verify pace indicator handles zero value gap gracefully
- [ ] Verify new tasks with richDescription.subTasks create TaskSubStep records

## Migration Notes

### For Local Development
1. Prisma schema updated with TaskSubStep model
2. Migration applied locally: `20260210205418_add_task_sub_steps`
3. Run data migration: `npx tsx scripts/migrate-task-substeps.ts`
4. Prisma client regenerated with new model

### For Production Deployment
1. Run migration on production database:
   ```bash
   npx prisma migrate deploy
   ```
2. Run data migration script:
   ```bash
   npx tsx scripts/migrate-task-substeps.ts
   ```
3. Verify existing tasks with sub-steps display correctly
4. Monitor pace API performance (queries completed tasks from last 3+ months)

### Database Impact
- New table: `task_sub_steps` (initially empty, populated on task creation)
- Existing `tasks.taskProgress` field preserved for backwards compatibility
- Index added: `task_sub_steps(task_id, order)` for efficient querying

## Files Changed

### Schema & Migrations
- `prisma/schema.prisma` - Added TaskSubStep model
- `prisma/migrations/20260210205418_add_task_sub_steps/migration.sql` - DDL
- `scripts/migrate-task-substeps.ts` - Data migration script

### Backend
- `src/app/api/companies/[id]/actions/route.ts` - Use TaskSubStep model
- `src/app/api/tasks/[id]/route.ts` - Sub-step toggle logic
- `src/app/api/companies/[id]/pace/route.ts` - NEW: Pace calculation
- `src/lib/playbook/generate-tasks.ts` - Create sub-steps on task generation

### Frontend
- `src/components/actions/ActionsPage.tsx` - Updated sub-step toggle payload
- `src/components/actions/HeroSummaryBar.tsx` - Pace indicator integration

### Tests
- `src/app/api/companies/[id]/pace/route.test.ts` - NEW: 4 test cases

## Technical Debt Addressed
- Removed fragile JSON-based sub-step tracking
- Added proper database relationships
- Improved sub-step persistence and integrity
- Added forward-looking UX metric (pace projection)

## Future Enhancements
- Consider adding trend analysis (accelerating vs decelerating pace)
- Add pace indicator to dashboard home page
- Track pace history over time for charts
- Expose pace metrics via GraphQL/REST for external integrations
