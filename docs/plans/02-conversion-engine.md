# Conversion Engine Design — Growth Engineer
**Date:** February 15, 2026
**Agent:** Growth Engineer (a518495)
**Target:** 10 paying customers in 30 days

## 1. Free-to-Paid Boundary

### Foundation (Free) — Full Access
- Complete Exit Readiness Assessment (8 questions)
- Full BRI Score (0-100) with 6-category breakdown
- Valuation estimate (industry multiple method)
- Value gap visualization (current vs potential)
- Top 3 prioritized tasks with dollar impact

### Locked (Requires Growth+)
- Task #4+ (grayed cards with lock icons)
- Detailed task instructions (show first 2 sentences, then gate)
- Evidence upload and tracking
- Task completion tracking
- Score improvement tracking
- Re-assessment (lock after first assessment)
- QuickBooks sync
- Personal financial planning
- Data room + Deal tracker

## 2. Upgrade Triggers

### In-App Triggers
| Trigger | UI | Copy | Timing |
|---------|----|------|--------|
| Clicks task #4+ | Modal | "Unlock Your Full Action Plan" | Immediate |
| Tries to re-assess | Modal | "Track Your Score Over Time" | After 1st assessment |
| Views gap >$1M | Slide-in banner | "You could capture [VALUE]..." | 5sec after load |
| 30+ sec on task #3 | Tooltip | "Ready to see what's next?" | After 30sec |
| Returns 3+ days later | Dashboard banner | "Welcome back! 47 tasks waiting." | On 3rd+ visit |
| Clicks "Upload Evidence" | Modal | "Evidence tracking requires Growth" | Immediate |

### Sales-Assisted Triggers
**High-Value Prospect criteria:** Revenue >$5M, value gap >$2M, 10+ min in app, returned 2+ times.

Day 3 email from Brad:
> Subject: [First Name] - your $[VALUE_GAP] gap (I saw your assessment)
> "I'm not pitching software. I'm offering 15 minutes to walk through your specific assessment..."

## 3. Trial Strategy
- 7-day free trial, **credit card required**
- Full access during trial
- Trial countdown visible in top nav
- Loss aversion: show what they built (tasks, BRI improvement, evidence, QuickBooks sync)
- Day 6 banner: specific progress stats + subscribe CTA
- Day 8 (expired): show accumulated progress + reactivate CTA + PDF download

## 4. Email Sequences

### Sequence A: Foundation User (Never Upgraded)
- Day 0: Assessment results + value gap + top 3 tasks
- Day 2: "$[TOP_TASK_IMPACT] task you haven't started"
- Day 5: "I thought it was too early to think about an exit"
- Day 10: Case study — "$5M company closed $1.8M gap in 14 months"
- Day 21: Final nudge — "Your $[VALUE_GAP] gap is still there"

### Sequence B: Trial User (Day 1-7)
- Day 1: Trial welcome + focus plan for 7 days
- Day 3: Progress check + halfway reminder
- Day 5: Loss-framed — "2 days left, you'll lose access to..."
- Day 7: Final day — "Your trial expires tonight"

### Sequence C: Expired Trial (Winback)
- Day 8: "Your progress is still here (for now)" — 30-day archive warning
- Day 14: "What happens if you don't fix [TOP_CATEGORY]?" — risk framing
- Day 30: "Last call — your data gets archived tomorrow"

### Sequence D: Sales-Assisted (High-Value)
- Day 3: Personal email from Brad
- Day 7: Follow-up
- Day 14: Case study
- Day 30: Final check-in

## 5. Pricing Page Redesign

**Headline:** "See What's Broken. Fix What Costs You the Most."

| Tier | Tagline | Price (Annual) | CTA | Top 5 Features |
|------|---------|----------------|-----|-----------------|
| Foundation | "See what buyers see" | $0 | "Get Your Free Exit Score" | Assessment, BRI, Valuation, Gap, Top 3 tasks |
| Growth (Most Popular) | "Close your value gap" | $149/mo | "Start 7-Day Free Trial" | Full action plan, Task instructions, BRI tracking, QuickBooks |
| Exit-Ready | "Prepare for the deal" | $379/mo | "Start 7-Day Free Trial" | Data room, DCF, Deal pipeline, Unlimited team |

**Trust signals:** 30-day money-back guarantee, social proof counter, FAQ on same page.

## 6. Sales-Assist Motion
- Auto-tag high-value prospects (cron job)
- Day 3 email from brad@exitosx.com via Resend
- 15-min Zoom: walk through their 2-3 highest-ROI tasks
- Post-call: personalized Loom walkthrough
- Calendly with pre-call questions (revenue, timeline, concerns)

## 7. Conversion Metrics

| Stage | Target Conv% |
|-------|-------------|
| Visit → Signup | 40% |
| Signup → Onboard | 85% |
| Onboard → Assess | 90% |
| Assess → Trial | 25% |
| Trial → Paid | 60% |
| **Overall Signup → Paid** | **~13%** |

### New Analytics Events
- `value_gap_viewed` (gap, value, category, duration)
- `locked_task_clicked` (taskId, position, impact)
- `trial_conversion` (tasks completed, BRI improvement, value captured, days used)
- `sales_call_booked` (revenue, gap, days after signup, source)

## Implementation Priority

### Week 1: Core Gates
1. Credit card requirement for trial
2. Task #4+ locking on Actions page
3. Upgrade modal for locked task clicks
4. NextMoveCard `isFreeUser` prop
5. Trial countdown banner

### Week 2: Email Sequences
1. Enhance Day 0 email with value gap data
2. Foundation sequence (Day 2, 5, 10, 21)
3. Trial sequence (Day 1, 3, 5, 7)
4. Expired sequence (Day 8, 14, 30)

### Week 3: Sales-Assisted
1. High-value prospect tagging cron
2. Day 3 outreach email template
3. Calendly setup
4. Follow-up sequence

### Week 4: Pricing Page & Polish
1. Pricing page redesign (3-tier, simplified)
2. FAQ section on pricing page
3. Progress Report PDF export
4. Analytics instrumentation
5. Weekly conversion dashboard

## Decisions Needed from Brad
1. Credit card required for trial? (Recommended: YES)
2. 7-day or 14-day trial?
3. Willing to do sales calls for first 10-20 customers?
4. Calendly booking page copy confirmation
5. Email "from" address: brad@exitosx.com vs noreply?
