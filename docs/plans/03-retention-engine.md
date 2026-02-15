# Retention & Value Delivery Engine — Product Manager
**Date:** February 15, 2026
**Agent:** Product Manager (a184aad)

## Core Problem
> "The product has no natural frequency. Tasks are offline. The valuation doesn't change. There's no reason to open the app." — Elena Verna

> "The weekly check-in is manufactured frequency, not natural frequency." — Dan Martell

**Root cause:** The valuation number — the single most important number in the product — only changes when the user does something. The product is dead between user actions.

**The fix:** Reflect reality, don't manufacture urgency. A founder's exit readiness changes every week whether they open Exit OSx or not (market multiples shift, documents age, time passes).

## Weekly Return Loop

### 1. Weekly Valuation Refresh (highest-leverage single feature)
- New cron: `weekly-valuation-refresh/route.ts` — runs Monday 5am
- Applies time-decay micro-adjustments to category BRI scores
- Carries forward market multiple interpolations
- Creates new ValuationSnapshot if value changes by >$1,000
- Records ValueLedgerEntry for material changes
- THIS creates natural frequency: numbers actually move weekly

### 2. "Since Last Visit" Diff Banner
- Dismissible banner at top of ValueHome.tsx
- Shows: valuation changes, new signals, task progress since last session
- Uses `UserSession.lastActiveAt` for comparison
- NOT a modal — doesn't block access

### 3. Redesigned Weekly Email
- Subject always contains specific dollar change (creates curiosity)
- Body: WHY the number changed, not just the number
- Single insight + single action (not a report)
- No cheerleading unless actual progress happened
- Example: "Your business value dropped $12K this week. Here's why."

### 4. 30-Second Pulse (replaces 5-question Weekly Check-In)
**Step 1 — GIVE:** Show 3 bullets of what happened this week:
- "Your valuation changed by +$8,200 (market multiples shifted in your sector)"
- "Your insurance documentation expires in 14 days"
- "Competitor [X] raised Series B (market intelligence)"

**Step 2 — ASK:** "Anything happen this week we should know?" (single freeform field)
- AI classifies freeform input via `process-signals.ts`
- Immediate feedback showing what user's input changed

**Step 3:** Confidence rating: Higher / Same / Lower (3 options, not 5)

## Progress Engine

### Sub-Step Auto-Generation with Proportional Credit
- Auto-generate 3-7 sub-steps per task from rich description
- Each sub-step completion awards proportional BRI improvement
- Creates mini ValuationSnapshot per sub-step
- 120-hour task becomes 5 moments of visible progress, not months of silence
- Uses existing `TaskSubStep` model in schema

### Momentum Meter
- Visual component showing 30-day rolling progress
- Inputs: sub-steps completed, tasks completed, documents uploaded, check-ins done, signals processed
- Displayed on dashboard as compact progress indicator

### Value Ledger Enhancement
- Every sub-step completion gets a narrative entry
- Weekly valuation refresh gets a narrative entry
- Users see a living record of every value change and why

## Journey Phase Adaptation

| Phase | BRI Range | Focus | Cadence |
|-------|-----------|-------|---------|
| EARLY_PLANNING | <40 | Gap identification, task activation | Weekly email + weekly check-in |
| ACTIVE_PREPARATION | 40-70 | Momentum, progress tracking | Weekly email + weekly check-in |
| FINAL_PUSH | 70-85 | Benchmarking, final gaps | Bi-weekly email (less noise) |
| DEAL_ACTIVE | >85 + Deal Room | Buyer activity notifications | Daily during active deal |

## "Can't Cancel" Moments (5 compounding value events)

1. **Dollar-Specific Value Gap Reveal** — "Your financial stability gap is costing you $740K"
2. **First Task Moves the Needle** — Valuation changes, Value Ledger records it, confetti
3. **Signal System Catches Something You Missed** — "Your largest customer contract expires in 90 days"
4. **90-Day Intelligence Accumulation** — Quarterly report with trajectory, comps, projections
5. **Deal Room Assembles Buyer Package** — Evidence organized, data room populated

## Stickiness Architecture (what users build that can't be recreated)

1. **Assessment History Graph** — trajectory with predictive power
2. **Value Ledger** — audit trail of every change
3. **Signal Archive** — institutional memory of risk management
4. **Retirement Alignment** — live connection between business value and personal freedom
5. **Evidence Package** — organized, monitored, buyer-facing

## Churn Prevention

### Warning Levels
| Level | Trigger | Intervention |
|-------|---------|-------------|
| L1 | 14 days no login | Re-engagement email with specific valuation change |
| L2 | 21 days no task progress | AI Coach outreach with 3 alternatives (smaller step, delegate, different task) |
| L3 | 30+ days inactive | Personal email from Brad (real human reply) |
| L4 | Clicks cancel | Quantified loss display with specific accumulated value |

### Cancellation Save Flow
Show specific, quantified accumulated value:
```
If you cancel today:
- Your Value Ledger with 23 entries tracking $127K in recovered value — archived
- Your weekly valuation monitoring stops
- Your 14 uploaded evidence documents — deleted after 30 days
- Your BRI assessment history and trend data — no longer accessible

You've recovered $127K. Subscription cost: $2,148 total. ROI: 59x.
```

### Churn Reason Taxonomy
| Reason | Response |
|--------|----------|
| "Too expensive" | Offer annual discount or 60-day pause |
| "Not enough time" | Offer bi-weekly cadence, auto-defer tasks |
| "Accomplished goals" | Offer $49/mo maintenance plan, convert to alumni referral |
| "Didn't see results" | Route to founder for debrief (product failure) |
| "Found better solution" | Competitive intelligence — ask specifics |
| "Exit timeline changed" | Offer pause, set 6-month re-engagement |

## Build Sequence

### Tranche 1: Foundation (3-4 eng days) — BUILD NOW
1. Weekly valuation refresh cron
2. "Since Last Visit" diff banner
3. Sub-step auto-generation + proportional credit
4. Redesigned weekly digest email

### Tranche 2: Intelligence Layer (5-6 eng days) — BUILD NEXT
5. 30-Second Pulse check-in redesign
6. Momentum Meter component
7. Adaptive task prioritization
8. Cadence adaptation by journey phase

### Tranche 3: Compounding Value (4-5 eng days) — BUILD LATER
9. Exit readiness trajectory prediction
10. Comparable transaction feed
11. Quarterly report generation
12. Cancellation save flow

## What NOT to Build
| Feature | Why Not Now |
|---------|-----------|
| AI Coach conversations | 10% of build cost gets 80% of value via Pulse + adaptive tasks |
| Gamification beyond streaks | Patronizing for $3M-$15M business owners |
| Push notifications / mobile app | Weekly frequency, not hourly. Email is right channel. |
| Social/community features | Exit planning is private |
| Integration marketplace | Core value must be proven first |
| Advisor portal | Phase 3-4 ($1M-$3M MRR) |

## Key Files
- NEW: `src/app/api/cron/weekly-valuation-refresh/route.ts`
- NEW: `src/components/value/SinceLastVisitBanner.tsx`
- NEW: `src/components/value/MomentumMeter.tsx`
- REWRITE: `src/lib/email/send-weekly-digest-email.ts`
- REWRITE: `src/components/weekly-check-in/WeeklyCheckInPrompt.tsx`
- ENHANCE: `src/lib/playbook/generate-tasks.ts` (sub-step generation)
- ENHANCE: `src/lib/valuation/improve-snapshot-for-task.ts` (sub-step proportional credit)
- ENHANCE: `src/lib/weekly-check-in/process-signals.ts` (AI freeform classification)

## Metrics
| Metric | Target (90 Days) |
|--------|-----------------|
| WAU (% of paid users) | 60% |
| Weekly check-in completion | 50% of WAU |
| Monthly task completion | 2 tasks or 5 sub-steps per user |
| Monthly churn rate | 8% (from estimated 15%) |
| Time to first task completion | < 7 days |
| Value Ledger entries/user/month | 4+ |
| Email open rate (weekly digest) | 45% |
| Cancellation save rate | 25% |
