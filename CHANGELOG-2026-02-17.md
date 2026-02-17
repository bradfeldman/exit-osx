# Changelog — February 17, 2026

35 items fixed across 13 phases. 62 files changed, +1,450 / -531 lines.

---

## Phase 1: Copy Fixes
1. Softened revenue volatility copy ("may see unpredictable cash flow")
2. Softened margin copy ("may be room to improve")
3. Softened labor cost copy ("may compress value")

## Phase 2: Simple UI Bug Fixes
4. Task menu stuck open — added click-outside handler
5. Display Name duplication in Settings — removed from Company tab
6. Privacy/ToS links logging user out — changed to open in new tabs

## Phase 3: Feature Gating
7. DCF moved from Exit Ready → Growth tier
8. Verified Retirement Calculator gate at Growth tier
9. Deal Room verified at Exit Ready tier

## Phase 4: Number Input Fixes
10. Fixed broken number inputs across DCF, PFS, Retirement (typing 5.1 was impossible)
11. Created shared TextNumericInput component — free typing, format on blur
12. FCF formatted with $ and commas

## Phase 5: Value Page UI
13. Fixed card alignment (BRI gauge + Benchmark cards)
14. "Close Your Gap" overhaul — removed upgrade gate, value impact $, date text
15. Fixed time estimate (2 hours → 15 minutes for financials task)
16. Clarified "preventable value gaps" → "quick-win value gaps you could close within 30 days"
17. Removed DCF toggle from valuation page

## Phase 6: Critical Backend Bugs
18. Stripe checkout — added error details, fixed payment method config
19. PFS validation — fixed Zod schema mismatches from bad number inputs
20. 2FA "Failed to initialize" — improved error handling and env var checks
21. Active Sessions delete — added actual session invalidation
22. Team invite validation — fixed Zod schema mismatch, better error messages

## Phase 7: Assessment Flow
23. Category cards no longer greyed out for free users
24. "Where to Improve" click navigates to correct assessment
25. "Find My Gaps" / "Start Assessment" buttons go directly to assessments
26. Assessment sequence flows to next category after completion
27. After 2 completed, remaining show upgrade prompt (not greyed out)

## Phase 8: Header & Valuation Display
28. Valuation ticker redesigned with animation/glow
29. Valuation shown as range ($14.4M – $17.5M)

## Phase 9: Notification System
30. Onboarding notifications: "Verify email" + "Complete assessments"
31. Bell badge shows unread count

## Phase 10: AI Coach
32. "New Conversation" button in coach drawer

## Phase 11: Evidence Room
33. File type restrictions, size limits, upload dialog improvements

## Phase 12: Task System Redesign
34. Evidence-based task completion, monthly journey framing, task status actions

## Phase 13: Deal Room
35. Prospect access panel, virtual data room sub-tabs, participant detail improvements
