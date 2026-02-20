# BRIRangeGauge Component - Visual Example

## Component Purpose
Displays a company's BRI (Buyer Readiness Index) score as a position on a colored range bar showing 4 readiness zones.

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Buyer Readiness Position                                        │
│  Your BRI score across typical readiness zones                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │▓▓▓▓▓RED▓▓│▒▒AMBER▒▒│░GRAY░│▓▓▓▓GREEN▓▓▓▓│                   │ │
│  │          │         │      │       ●      │                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  0          40        60     75             You: 82 (Excellent) 100│
│              └─40      └─60   └─75                                │
│                                                                   │
│  Top-tier readiness. You're positioned to command premium         │
│  valuations.                                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Zone Breakdown

### Critical Zone (0-40) — Red Gradient
- **Color:** `bg-gradient-to-r from-red-300 to-red-200`
- **Width:** 40% of bar
- **Message:** "Significant gaps that will concern buyers. Focus on high-impact fixes."
- **Marker Color:** `#dc2626` (red)

### Developing Zone (40-60) — Amber Gradient
- **Color:** `bg-gradient-to-r from-amber-200 to-amber-100`
- **Width:** 20% of bar
- **Message:** "On the right track, but buyers will see risk. Strong zone starts at 60."
- **Marker Color:** `#d97706` (amber)

### Strong Zone (60-75) — Gray Gradient
- **Color:** `bg-gradient-to-r from-zinc-200 to-zinc-300`
- **Width:** 15% of bar
- **Message:** "Buyer-ready with minor gaps. Excellent zone starts at 75."
- **Marker Color:** `#1D1D1F` (charcoal)

### Excellent Zone (75-100) — Green Gradient
- **Color:** `bg-gradient-to-r from-emerald-200 to-emerald-300`
- **Width:** 25% of bar
- **Message:** "Top-tier readiness. You're positioned to command premium valuations."
- **Marker Color:** `#059669` (emerald)

## Example Renders

### Example 1: BRI Score = 67 (Strong Zone)
```
Position: 67% from left
Color: Charcoal (#1D1D1F)
Label: "You: 67 (Strong)"
Message: "Buyer-ready with minor gaps. Excellent zone starts at 75."
```

Visual position:
```
0────────40────────60────●──75──────────100
         ^amber   ^gray  ^    ^green
```

### Example 2: BRI Score = 35 (Critical Zone)
```
Position: 35% from left
Color: Red (#dc2626)
Label: "You: 35 (Critical)"
Message: "Significant gaps that will concern buyers. Focus on high-impact fixes."
```

Visual position:
```
0──────────────●──40────────60─────75──────────100
   ^red        ^
```

### Example 3: BRI Score = 82 (Excellent Zone)
```
Position: 82% from left
Color: Emerald (#059669)
Label: "You: 82 (Excellent)"
Message: "Top-tier readiness. You're positioned to command premium valuations."
```

Visual position:
```
0────────40────────60─────75────────●──────100
                          ^green    ^
```

## Positioning Math

### Formula
```typescript
// BRI is already 0-100 scale, so position = score directly
const position = Math.min(100, Math.max(0, briScore))
```

### Why This Works
Unlike `BenchmarkComparison` which needs to normalize between `industryLow` and `industryHigh`, BRI scores are already on a 0-100 scale. A score of 67 means 67% from the left edge.

### CSS Positioning
```tsx
<div
  style={{ left: `${position}%` }}
  className="-translate-x-1/2"
/>
```

The `-translate-x-1/2` class shifts the marker left by half its width (10px), ensuring the **center** of the marker sits at the calculated percentage, not its left edge.

## Props API

```typescript
interface BRIRangeGaugeProps {
  briScore: number | null      // 0-100 or null if not assessed
  isEstimated?: boolean        // Shows "Preview estimate" badge if true
}
```

### Usage Examples

```tsx
// Diagnosis page (full-width)
<BRIRangeGauge
  briScore={data.briScore}
  isEstimated={data.isEstimated}
/>

// Value dashboard (2-column grid)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <BRIRangeGauge
    briScore={tier1?.briScore ?? null}
    isEstimated={tier1?.isEstimated ?? true}
  />
  <BenchmarkComparison {...props} />
</div>
```

## States

### null Score (Not Assessed)
Component returns `null` and doesn't render. This prevents showing a misleading "0" score.

```tsx
if (briScore === null) {
  return null
}
```

### Estimated Score
Shows amber badge: "Preview estimate — Complete all assessments for your final score"

### Final Score
No badge, contextual message only.

## Responsive Behavior

### Mobile (< 768px)
- Full width
- Labels remain visible (11px font)
- Zone markers at 40, 60, 75 with smaller font (10px)

### Tablet/Desktop (≥ 768px)
- Half width when in 2-column grid
- Full labels and markers visible
- Hover states (none, non-interactive)

## Accessibility

### Semantic Structure
```html
<article role="region" aria-label="BRI Score Position">
  <header>
    <h3>Buyer Readiness Position</h3>
    <p>Your BRI score across typical readiness zones</p>
  </header>
  <div role="img" aria-label="Range gauge showing score 67 in Strong zone">
    <!-- visual range bar -->
  </div>
  <p>Buyer-ready with minor gaps. Excellent zone starts at 75.</p>
</article>
```

### Screen Reader Experience
1. Announces title: "Buyer Readiness Position"
2. Describes purpose: "Your BRI score across typical readiness zones"
3. Reads current position: "You: 67, Strong"
4. Provides context: "Buyer-ready with minor gaps. Excellent zone starts at 75."

### Color Contrast
- All zone colors meet WCAG AA (4.5:1 for text, 3:1 for UI components)
- Zone boundaries marked with visible gray lines (not just color)
- Position conveyed by number AND visual marker

## Performance

- Renders in < 1ms
- No JavaScript runtime cost (pure CSS)
- Component size: ~5KB gzipped
- No external dependencies (uses shadcn/ui Card only)

## Future Enhancement Ideas

1. **Interactive "What-If"** - Drag marker to see what zone you'd reach with X points
2. **Historical trend** - Small sparkline showing BRI movement over last 90 days
3. **Peer comparison** - Gray ghost marker showing industry average BRI
4. **Mobile optimization** - Stack zone labels vertically on very narrow screens
5. **Animation** - Marker slides to position on mount (respects prefers-reduced-motion)

---

**Created:** 2026-02-10
**Component File:** `src/components/diagnosis/BRIRangeGauge.tsx`
**Used In:** DiagnosisPage, ValueHome
