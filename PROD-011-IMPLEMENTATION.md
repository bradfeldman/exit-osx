# PROD-011: QuickBooks Auto-Sync on Connection - Implementation Summary

## Changes Made

### 1. Auto-sync on Initial Connection (Server-Side)
**File:** `src/app/api/integrations/quickbooks/callback/route.ts`

- Added server-side fire-and-forget sync trigger after OAuth callback completes
- Import `syncQuickBooksData` from sync module
- Call `syncQuickBooksData(integration.id, 'initial')` as fire-and-forget (no await)
- This ensures sync starts immediately even if user closes browser tab
- Client-side sync polling still exists as backup (existing behavior)

**Code added:**
```typescript
// Trigger initial sync as fire-and-forget (don't await)
// Client-side will also poll for sync completion
syncQuickBooksData(integration.id, 'initial').catch((err) => {
  console.error('Background initial sync failed:', err)
})
```

### 2. Auto-refresh on Login (Client-Side Staleness Check)
**File:** `src/components/integrations/QuickBooksCard.tsx`

- Added `isDataStale()` helper function (checks if lastSyncAt > 24 hours ago)
- Added `useEffect` hook that triggers auto-refresh when:
  - Integration is connected
  - Data is stale (>24 hours)
  - Not already syncing
- Runs non-blocking background sync
- Shows visual indicator during auto-refresh

**Code added:**
```typescript
// Auto-refresh if data is stale (>24 hours)
useEffect(() => {
  if (!integration || !connected) return
  if (integration.lastSyncStatus === 'SYNCING') return
  if (isSyncing) return

  if (isDataStale(integration.lastSyncAt)) {
    console.log('QuickBooks data is stale (>24 hours), triggering auto-refresh')
    setIsSyncing(true)
    fetch('/api/integrations/quickbooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync', companyId }),
    })
      .then(...)
      .finally(() => setIsSyncing(false))
  }
}, [integration, connected, isSyncing, companyId, fetchStatus, onSyncComplete])
```

### 3. Collapsed UI After Initial Sync
**File:** `src/components/integrations/QuickBooksCard.tsx`

- Added `isExpanded` state (defaults to `true`)
- Auto-collapse card after first successful sync (in `fetchStatus()`)
- Shows compact status line with:
  - Last sync timestamp (relative time: "2 hours ago")
  - Sync status badge (Up to date / Syncing / Failed / Data may be outdated)
  - Quick "Sync Now" button
  - Expand/collapse toggle (chevron icon)
- Expanded state shows:
  - Error messages (if any)
  - Detailed sync progress text
  - Force Sync button
  - Disconnect button
  - Cancel Sync button (when syncing)

**UI States:**
- **Never synced:** Large card, expanded by default
- **First sync complete:** Auto-collapses to compact 1-line status
- **User can toggle:** Chevron button expands/collapses details on demand

### 4. Improved Timestamp Display
**File:** `src/components/integrations/QuickBooksCard.tsx`

- Added `formatRelativeTime()` helper function
- Shows human-readable relative times:
  - "just now" (< 1 minute)
  - "5 minutes ago"
  - "3 hours ago"
  - "2 days ago"
  - "1 week ago"
  - Falls back to absolute date for older syncs

### 5. Stale Data Warning
**File:** `src/components/integrations/QuickBooksCard.tsx`

- Shows amber warning badge if data > 24 hours old
- Displays "Data may be outdated" status
- Auto-triggers refresh (see #2)

### 6. Enhanced Sync Progress Indicator
**File:** `src/components/integrations/QuickBooksCard.tsx`

- Shows "Syncing financial data from QuickBooks..." with spinner
- Adds explanatory text: "Fetching P&L and Balance Sheet reports for the last 6 years"
- More informative than generic "Syncing..." message

## Files Modified

1. **src/app/api/integrations/quickbooks/callback/route.ts**
   - Added import for `syncQuickBooksData`
   - Added fire-and-forget sync trigger

2. **src/components/integrations/QuickBooksCard.tsx**
   - Added `isExpanded` state
   - Added `formatRelativeTime()` helper
   - Added `isDataStale()` helper
   - Added auto-refresh logic in `useEffect`
   - Added auto-collapse logic in `fetchStatus()`
   - Refactored UI to show compact/expanded states
   - Added stale data warning badge
   - Enhanced sync progress text

## Testing Checklist

### Manual Testing
- [ ] Connect QuickBooks for the first time
  - [ ] Verify sync starts automatically (check network tab for POST to sync endpoint)
  - [ ] Verify server-side fire-and-forget sync (check Vercel logs)
  - [ ] Verify UI shows "Syncing..." status
  - [ ] After sync completes, verify card auto-collapses
- [ ] Disconnect and reconnect QuickBooks
  - [ ] Verify sync starts again automatically
- [ ] Wait 25+ hours (or manually update lastSyncAt in DB)
  - [ ] Reload page
  - [ ] Verify auto-refresh triggers
  - [ ] Verify amber "Data may be outdated" badge shows before refresh
- [ ] Test manual "Sync Now" button
  - [ ] Verify sync progress appears
  - [ ] Verify relative timestamp updates after sync
- [ ] Test expand/collapse toggle
  - [ ] Verify details show/hide correctly
  - [ ] Verify state persists while on page
- [ ] Test error handling
  - [ ] Disconnect from internet
  - [ ] Try manual sync
  - [ ] Verify error message shows in expanded state

### Edge Cases
- [ ] Never synced (newly connected) - should show expanded by default
- [ ] Sync in progress when page loads - should show syncing state
- [ ] Failed sync - should show error in expanded state + red badge
- [ ] Multiple rapid manual syncs - should prevent concurrent syncs

## API Rate Limiting Notes

QuickBooks API has rate limits. The sync function:
- Fetches 6 years of data (12 API calls: 6 P&L + 6 Balance Sheet)
- Auto-refresh only triggers if >24 hours stale
- Server-side fire-and-forget may cause double-sync on initial connection (client + server)
  - This is acceptable for initial connection (happens once)
  - Client-side sync serves as fallback if server-side fails

## Security Notes

- No token values are logged (existing security measures maintained)
- State parameter HMAC validation still enforced (CSRF protection)
- All sync operations require authenticated user with company access

## Performance Notes

- Server-side fire-and-forget sync doesn't block OAuth redirect
- Client-side auto-refresh is non-blocking (shows existing data while refreshing)
- Collapsed UI reduces visual clutter after initial setup
- Relative timestamps don't require re-fetch (calculated client-side)

## Rollback Plan

If issues arise:
1. Revert callback route to remove fire-and-forget sync
2. Remove auto-refresh logic from QuickBooksCard
3. Keep UI improvements (collapsed state, relative time) - they're backwards compatible
