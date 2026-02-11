# Exposure System API Reference

## Context Hook

### `useExposure()`

```tsx
import { useExposure } from '@/contexts/ExposureContext'

function MyComponent() {
  const {
    exposureState,    // 'LEARNING' | 'VIEWING' | 'ACTING'
    isLoading,        // boolean
    isLearning,       // boolean - exposureState === 'LEARNING'
    isViewing,        // boolean - exposureState === 'VIEWING'
    isActing,         // boolean - exposureState === 'ACTING'
    completeTour,     // () => Promise<void> - LEARNING → VIEWING
    startActing,      // () => Promise<void> - VIEWING → ACTING
    refetch,          // () => Promise<void> - refresh state from API
  } = useExposure()

  return (
    <>
      {isViewing && <ViewOnlyMessage />}
      <button disabled={isViewing} onClick={doAction}>
        Action
      </button>
    </>
  )
}
```

## REST API

### GET `/api/user/exposure-state`

Fetch current user's exposure state.

**Auth**: Required (Bearer token)

**Response**:
```json
{
  "exposureState": "VIEWING"
}
```

**Status Codes**:
- `200` - Success
- `401` - Unauthorized (no auth token)
- `404` - User not found in database
- `500` - Internal server error

---

### PATCH `/api/user/exposure-state`

Update user's exposure state.

**Auth**: Required (Bearer token)

**Request Body**:
```json
{
  "exposureState": "ACTING"
}
```

**Valid Values**: `"LEARNING"`, `"VIEWING"`, `"ACTING"`

**Response**:
```json
{
  "exposureState": "ACTING"
}
```

**Status Codes**:
- `200` - Success
- `400` - Invalid exposure state value
- `401` - Unauthorized (no auth token)
- `500` - Internal server error

**Example**:
```ts
const response = await fetch('/api/user/exposure-state', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ exposureState: 'ACTING' }),
})
const { exposureState } = await response.json()
```

## Common Patterns

### Conditionally Render Based on State

```tsx
import { useExposure } from '@/contexts/ExposureContext'

export function MyFeature() {
  const { isViewing, isActing } = useExposure()

  if (isViewing) {
    return <ReadOnlyView />
  }

  return <InteractiveView />
}
```

### Disable Interactions in View Mode

```tsx
import { useExposure } from '@/contexts/ExposureContext'

export function ActionButton() {
  const { isViewing } = useExposure()

  return (
    <button
      disabled={isViewing}
      onClick={handleAction}
    >
      Perform Action
    </button>
  )
}
```

### Show Upgrade Banner

```tsx
import { useExposure } from '@/contexts/ExposureContext'

export function TaskList() {
  const { isViewing, startActing } = useExposure()

  return (
    <div>
      {isViewing && (
        <Banner>
          <p>View-only mode. Ready to start?</p>
          <button onClick={startActing}>Start Acting</button>
        </Banner>
      )}
      <TaskItems />
    </div>
  )
}
```

### Transition on Tour Completion

```tsx
import { useExposure } from '@/contexts/ExposureContext'

export function PlatformTour({ onClose }) {
  const { completeTour } = useExposure()

  async function handleFinish() {
    await completeTour()  // LEARNING → VIEWING
    onClose()
  }

  return (
    <TourDialog>
      <button onClick={handleFinish}>Finish Tour</button>
    </TourDialog>
  )
}
```

## Database Schema

### User Table

```prisma
model User {
  // ... other fields
  exposureState  ExposureState  @default(LEARNING) @map("exposure_state")
}

enum ExposureState {
  LEARNING
  VIEWING
  ACTING
}
```

### Query Examples

```ts
// Fetch user with exposure state
const user = await prisma.user.findUnique({
  where: { authId: 'abc123' },
  select: { exposureState: true },
})

// Update exposure state
await prisma.user.update({
  where: { authId: 'abc123' },
  data: { exposureState: 'ACTING' },
})
```

## Testing Utilities

### Manual State Override (for testing)

```ts
// In browser console or test setup
await fetch('/api/user/exposure-state', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ exposureState: 'LEARNING' }),
})

// Refresh page to see effect
location.reload()
```

### Reset Tour for Testing

```ts
// Clear localStorage tour flag
localStorage.removeItem('exitosx-tour-seen')

// Reset exposure state to LEARNING
await fetch('/api/user/exposure-state', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ exposureState: 'LEARNING' }),
})

// Navigate to dashboard
window.location.href = '/dashboard'
```

## State Transition Rules

1. **LEARNING → VIEWING**: Automatic on tour completion/skip
2. **VIEWING → ACTING**: Manual via "Start Acting" button
3. **No regression**: Cannot go backward (ACTING → VIEWING not allowed)
4. **One-time journey**: Most users complete LEARNING → VIEWING → ACTING once

## Related Systems

### Progression Context
```tsx
const { canAccessActions, canAccessEvidence, canAccessDealRoom } = useProgression()
```
- Milestone-based feature unlocking
- Company-scoped (not user-scoped)
- Works alongside exposure system

### Subscription Context
```tsx
const { planTier, canAccessFeature } = useSubscription()
```
- Plan-based feature gating
- User-scoped (based on subscription)
- Works alongside exposure system

## Performance Notes

- ExposureContext loads state once on mount
- State cached in React state (no unnecessary API calls)
- Transitions trigger immediate UI updates (optimistic)
- Database update happens async (fire-and-forget)

## Accessibility

- ViewOnlyBanner uses semantic HTML
- Disabled buttons respect `disabled` attribute
- Screen readers announce disabled state
- Focus management preserved during transitions

## Browser Support

- Modern browsers with fetch API
- React 19 concurrent features
- No IE11 support required
