# Exit OSx 13-Wave Execution Plan

**Created:** 2026-02-10
**Managed By:** project-manager agent
**Total Items:** 95 (81 remaining after 14 completed)

---

## Execution Strategy

This plan sequences 81 remaining backlog items into 13 waves based on:
- **Dependency chains** (blockers first)
- **Risk reduction** (critical bugs before features)
- **Foundational infrastructure** (enables parallel work)
- **Logical workstreams** (minimize context switching)
- **Agent optimization** (parallel execution where possible)

**Wave Execution Model:**
- Waves 1-4: Sequential (each blocks the next)
- Waves 5-8: Partially parallel (grouped by workstream)
- Waves 9-13: Fully parallel (cleanup, polish, future features)

---

## Wave 1: Testing & Security Foundation (CRITICAL BLOCKER)

**Duration:** 5-6 days
**Agents:** qa-test-engineer, security-compliance-engineer, devops-platform-engineer
**Why First:** Enables all future automated testing and prevents security incidents

### Items (8)

| PROD | Item | Agent | Size | Why Critical |
|------|------|-------|------|--------------|
| 089 | Test User & Seed Data | qa-test-engineer + devops-platform-engineer | S | Blocks all automated testing |
| 091 | Fix 6 Security Vulnerabilities | security-compliance-engineer | M | Cookie flags, staging auth, rate limiting, CSP |
| 088 | CI/CD Pipeline | devops-platform-engineer + qa-test-engineer | M | Gates all future deploys on passing tests |
| 090 | Security Test Suite (14 modules) | qa-test-engineer + security-compliance-engineer | L | Zero coverage on auth/RBAC/security is unacceptable |
| 064 | DocumentStatus Enum Verification | backend-systems-architect | S | Common pitfall causing bugs |
| 065 | DealActivity2 Model Verification | backend-systems-architect | S | Common pitfall causing bugs |
| 072 | Pricing Tier Names Verification | qa-test-engineer + full-stack-engineer | S | Verify correct tier logic |
| 061 | Prisma Migration Process Documentation | devops-platform-engineer + backend-systems-architect | S | Prevent future migration failures |

**Dependencies:** None (foundation layer)
**Unblocks:** All testing items (PROD-092, 093, 094, 095)
**Parallel Execution:** All 8 items can run simultaneously across 3 agents

---

## Wave 2: Product Foundation Layer (ARCHITECTURAL)

**Duration:** 4-5 days
**Agents:** financial-modeling-engineer, backend-systems-architect, full-stack-engineer, content-knowledge-architect
**Why Second:** Creates shared utilities that 13+ other items depend on

### Items (4)

| PROD | Item | Agent | Size | Blocks |
|------|------|-------|------|--------|
| 009 | Shared calculateValuation() Utility | financial-modeling-engineer + backend-systems-architect + qa-test-engineer | M | PROD-007, 008, 012, 016, 062, 063 |
| 019 | Email Notification System | full-stack-engineer + content-knowledge-architect + growth-engineer | M | PROD-018, 035, 054, 055, 074, 077 |
| 024 | Company Intelligence Layer | backend-systems-architect + applied-ai-rules-engine + saas-data-architect | XL | PROD-036, 058, 059, 076 |
| 060 | API Rate Limiting & Error Handling Audit | security-compliance-engineer + backend-systems-architect | M | Quality gate for all API routes |

**Dependencies:** Wave 1 (testing infrastructure allows verification)
**Unblocks:** 13 items (valuation consistency, email features, AI personalization)
**Parallel Execution:** All 4 can run in parallel (different codebases)

---

## Wave 3: Valuation Formula Consistency (HIGHEST USER IMPACT BUG)

**Duration:** 3-4 days
**Agents:** financial-modeling-engineer, qa-test-engineer, backend-systems-architect
**Why Third:** Fixes the 29% valuation discrepancy bug (most critical data integrity issue)

### Items (6)

| PROD | Item | Agent | Size | What It Fixes |
|------|------|-------|------|---------------|
| 007 | Fix LINEAR vs NON-LINEAR Formula | financial-modeling-engineer + qa-test-engineer | M | 16-29% onboarding vs dashboard difference |
| 008 | Standardize Core Score Calculation | financial-modeling-engineer + backend-systems-architect | M | 6 factors vs 5 factors inconsistency |
| 092 | Valuation Golden-File Tests | qa-test-engineer + financial-modeling-engineer | M | Prevents regression of formula bugs |
| 010 | Financial Calculation Audit | financial-modeling-engineer + qa-test-engineer | L | Cash flow, working capital, FCF, EBITDA fixes |
| 016 | Category Value Gap Reconciliation | financial-modeling-engineer + backend-systems-architect | M | Category gaps don't sum to total |
| 062 | Remove shouldUseSnapshotValues Conditional | backend-systems-architect + financial-modeling-engineer | M | Prevents valuation "jumps" |

**Dependencies:** Wave 2 (PROD-009 shared utility must exist)
**Unblocks:** PROD-063 (server-side recalc), PROD-012 (method selection)
**Parallel Execution:** PROD-010 can run parallel to 007/008/092

---

## Wave 4: Assessment & Scoring Engine Fixes (HIGH USER FRUSTRATION)

**Duration:** 4-5 days
**Agents:** backend-systems-architect, lead-frontend-engineer, applied-ai-rules-engine, qa-test-engineer
**Why Fourth:** Fixes broken assessment flow causing data loss and fake scores

### Items (6)

| PROD | Item | Agent | Size | What It Fixes |
|------|------|-------|------|---------------|
| 013 | Fix Assessment Reset & Zeroing Bugs | backend-systems-architect + qa-test-engineer | L | Re-assessing one category zeros others |
| 014 | Enforce Assessment Flow Logic | backend-systems-architect + lead-frontend-engineer | M | Advanced questions before initial questions |
| 015 | BRI Range Graphic Fix | lead-frontend-engineer + product-designer-ux | S | Company shown at bottom instead of inside range |
| 017 | Assessment Cadence Control | backend-systems-architect + applied-ai-rules-engine | M | Weekly + monthly + category = fatigue |
| 070 | Lowest Confidence Category Prompt | qa-test-engineer + lead-frontend-engineer | S | Verify prompt renders |
| 063 | Onboarding-Snapshot Server-Side Recalc | backend-systems-architect | M | Prevent UI bugs from persisting to DB |

**Dependencies:** Wave 2 (PROD-024 Intelligence Layer), Wave 3 (PROD-009 valuation utility)
**Unblocks:** Nothing (but high user impact)
**Parallel Execution:** PROD-015, 070 (frontend) parallel to 013/014 (backend)

---

## Wave 5: Onboarding Rebuild (ACQUISITION FUNNEL)

**Duration:** 6-7 days
**Agents:** security-compliance-engineer, applied-ai-rules-engine, lead-frontend-engineer, growth-engineer, product-designer-ux
**Why Fifth:** Reduces signup friction and improves activation rate

### Items (5)

| PROD | Item | Agent | Size | Impact |
|------|------|-------|------|--------|
| 001 | Magic-Link Signup | security-compliance-engineer + lead-frontend-engineer + growth-engineer | L | Removes password friction at signup |
| 002 | Freeform Business Description with AI | applied-ai-rules-engine + full-stack-engineer + content-knowledge-architect | L | Removes rigid GICS dropdown |
| 003 | Streamline Onboarding Flow | lead-frontend-engineer + full-stack-engineer + product-designer-ux | M | Eliminates redundant data entry |
| 005 | Animated Progress During Plan Generation | lead-frontend-engineer | S | Better UX during processing wait |
| 006 | Tour-First, Task-Later Onboarding | lead-frontend-engineer + product-designer-ux + growth-engineer | M | Reduces overwhelm, improves activation |

**Dependencies:** Wave 2 (PROD-019 email for magic link)
**Unblocks:** PROD-068 (onboarding step count verification)
**Sequential:** 001 → 002 → 003 → 005, 006 parallel

---

## Wave 6: Financial Integrations & Calculations (DATA ACCURACY)

**Duration:** 5-6 days
**Agents:** full-stack-engineer, financial-modeling-engineer, backend-systems-architect, saas-data-architect
**Why Sixth:** Ensures accurate financial data input and valuation methods

### Items (6)

| PROD | Item | Agent | Size | Impact |
|------|------|-------|------|--------|
| 011 | QuickBooks Auto-Sync | full-stack-engineer + backend-systems-architect | M | Auto-sync on connection, force sync button |
| 056 | QB Scheduled Sync Cron | full-stack-engineer + backend-systems-architect | M | Daily automated sync |
| 012 | Simplify DCF vs EBITDA Method Selection | financial-modeling-engineer + product-designer-ux | M | System auto-selects best method |
| 004 | Comparable Company & Multiple Engine | financial-modeling-engineer + applied-ai-rules-engine + saas-data-architect | XL | Investment-banker-grade multiples |
| 057 | Benchmark/Multiple Refresh Cron | financial-modeling-engineer + saas-data-architect | M | Monthly multiple updates |
| 044 | Remove Retirement Calculator Lock | lead-frontend-engineer | S | Unlock for all tiers |

**Dependencies:** Wave 3 (valuation formulas fixed)
**Unblocks:** PROD-046 (retirement math), PROD-081 (tax API)
**Parallel Execution:** PROD-011/056 parallel, PROD-004/057 parallel, PROD-012/044 parallel

---

## Wave 7: Sustained Value System (RETENTION ENGINE)

**Duration:** 7-8 days
**Agents:** applied-ai-rules-engine, backend-systems-architect, lead-frontend-engineer, content-knowledge-architect
**Why Seventh:** Primary retention mechanism (monthly drift reports)

### Items (7)

| PROD | Item | Agent | Size | Impact |
|------|------|-------|------|--------|
| 020 | Complete Signal Pipeline (Channels 2-5) | backend-systems-architect + applied-ai-rules-engine | L | Task signals, cron signals, advisor workflow |
| 021 | Signal Confidence Scoring | applied-ai-rules-engine + backend-systems-architect | M | Confidence weighting, fatigue prevention |
| 022 | Value-at-Risk Monitoring | backend-systems-architect + financial-modeling-engineer | M | Aggregates active signals into value gap |
| 018 | Drift Detection Engine & Monthly Report | applied-ai-rules-engine + backend-systems-architect + lead-frontend-engineer + content-knowledge-architect | XL | 3-screen in-app flow, email notifications |
| 054 | Monthly Drift Report Cron | backend-systems-architect + devops-platform-engineer | M | Automated monthly generation |
| 055 | Inactivity Signal Cron | backend-systems-architect + growth-engineer | S | 21-day inactivity detection |
| 058 | AI-Powered Buyer Consequence Generation | applied-ai-rules-engine + content-knowledge-architect | M | Personalized task consequences |

**Dependencies:** Wave 2 (PROD-019 email, PROD-024 Intelligence Layer)
**Unblocks:** Nothing (but critical for retention)
**Sequential:** 020 → 021 → 022 → 018 → 054, 055 parallel

---

## Wave 8: Navigation & Legacy Cleanup (ARCHITECTURE DEBT)

**Duration:** 4-5 days
**Agents:** lead-frontend-engineer, full-stack-engineer, backend-systems-architect, devops-platform-engineer
**Why Eighth:** Removes killed features still cluttering codebase

### Items (9)

| PROD | Item | Agent | Size | What It Removes |
|------|------|-------|------|-----------------|
| 026 | Remove Dev/Global from Sidebar | lead-frontend-engineer | S | Admin tools in user nav |
| 027 | Remove Exit Tools Section | lead-frontend-engineer | S | Duplicate Deal Room nav |
| 025 | Remove Legacy Routes & Redirects | full-stack-engineer + devops-platform-engineer | M | 15+ old routes |
| 028 | Replace Stage-Based with Milestone-Based | backend-systems-architect + lead-frontend-engineer | L | Killed 7-stage progression |
| 031 | Remove Monte Carlo Panels | full-stack-engineer + qa-test-engineer | M | Killed feature still in codebase |
| 032 | Remove Sprint Model | backend-systems-architect + devops-platform-engineer | M | Killed feature, schema cleanup |
| 033 | Remove Old Dashboard Components | full-stack-engineer | S | 100KB+ dead code |
| 034 | Remove Old Playbook/Deal/Data Room Components | full-stack-engineer | M | Audit + remove dead code |
| 030 | Change Nav Label "Home" to "Value" | lead-frontend-engineer | XS | Spec compliance |

**Dependencies:** None (cleanup can happen anytime, but best after core features stabilized)
**Unblocks:** Nothing (improves maintainability)
**Parallel Execution:** 026/027/030 (frontend), 031/033/034 (component cleanup), 025/028/032 (backend/schema)

---

## Wave 9: Actions, Tasks & Evidence (WORKFLOW IMPROVEMENTS)

**Duration:** 4-5 days
**Agents:** full-stack-engineer, backend-systems-architect, lead-frontend-engineer, customer-success-engineer
**Why Ninth:** Improves core task execution workflow

### Items (6)

| PROD | Item | Agent | Size | Impact |
|------|------|-------|------|--------|
| 035 | Task Delegation Email Invites | full-stack-engineer + customer-success-engineer | M | Enable delegation feature |
| 036 | Task Notes Persistence & Search | backend-systems-architect + full-stack-engineer | M | Notes feed Intelligence Layer |
| 037 | Task Sub-Steps Persistence | backend-systems-architect + qa-test-engineer | M | Verify/fix sub-step storage |
| 038 | Pace Indicator on Actions Page | full-stack-engineer + content-knowledge-architect | S | "Close gap in 8 months" metric |
| 039 | Organize Data Room by Diligence Categories | backend-systems-architect + lead-frontend-engineer | M | 5 diligence sections |
| 040 | Evidence Category Mapping Verification | backend-systems-architect + content-knowledge-architect | S | Verify BRI alignment |

**Dependencies:** Wave 2 (PROD-019 email, PROD-024 Intelligence Layer)
**Unblocks:** Nothing
**Parallel Execution:** All 6 can run in parallel (different features)

---

## Wave 10: Deal Room & Mobile UX (SALES WORKFLOW)

**Duration:** 4-5 days
**Agents:** lead-frontend-engineer, mobile-experience-engineer, full-stack-engineer, qa-test-engineer
**Why Tenth:** Improves deal management and mobile experience

### Items (7)

| PROD | Item | Agent | Size | Impact |
|------|------|-------|------|--------|
| 041 | Pipeline Drag-and-Drop | lead-frontend-engineer + mobile-experience-engineer | M | Intuitive stage movement |
| 042 | Fix Contacts Refresh Bug | lead-frontend-engineer | M | Partial state updates |
| 043 | Verify 6-Stage Visual Pipeline | qa-test-engineer + lead-frontend-engineer | S | Spec compliance |
| 023 | Fix Mobile Login Bug | mobile-experience-engineer + lead-frontend-engineer | M | Page jump on mobile |
| 045 | Improve Age Input UX | lead-frontend-engineer + full-stack-engineer | M | Birthday once, adaptive retirement age |
| 046 | Retirement Math Consistency | financial-modeling-engineer + qa-test-engineer | M | Roth IRA tax logic |
| 029 | Consolidate Settings into Tabs | lead-frontend-engineer + mobile-experience-engineer | M | One page with tabs |

**Dependencies:** None (independent UX improvements)
**Unblocks:** Nothing
**Parallel Execution:** Deal Room items (041/042/043), Mobile items (023), Retirement items (045/046), Settings (029)

---

## Wave 11: Comprehensive Test Coverage (QUALITY GATE)

**Duration:** 5-6 days
**Agents:** qa-test-engineer, mobile-experience-engineer, devops-platform-engineer, financial-modeling-engineer
**Why Eleventh:** After all major features shipped, ensure quality

### Items (4)

| PROD | Item | Agent | Size | Coverage |
|------|------|-------|------|----------|
| 093 | Visual Regression Expansion | qa-test-engineer + mobile-experience-engineer | M | 40+ screenshots (5 modes x 4 viewports) |
| 094 | E2E Journey Tests | qa-test-engineer | L | 6 full user journeys |
| 095 | Performance Budget Enforcement | devops-platform-engineer + qa-test-engineer | M | Lighthouse CI, bundle size, k6 expansion |
| 059 | AI Ledger Narrative Summaries | applied-ai-rules-engine + content-knowledge-architect | M | Personalized ledger copy |

**Dependencies:** Wave 1 (CI/CD), Wave 2-10 (features to test)
**Unblocks:** Production launch confidence
**Parallel Execution:** All 4 can run simultaneously

---

## Wave 12: UX Polish & Minor Improvements (REFINEMENT)

**Duration:** 3-4 days
**Agents:** lead-frontend-engineer, product-designer-ux, growth-engineer, content-knowledge-architect, exit-osx-product-lead
**Why Twelfth:** Final polish before declaring product "complete"

### Items (11)

| PROD | Item | Agent | Size | Type |
|------|------|-------|------|------|
| 047 | Gradual Exit Readiness Exposure | product-designer-ux + lead-frontend-engineer + growth-engineer | M | Learn → See → Act |
| 048 | Remove Deal Room Locks | lead-frontend-engineer | S | Reduce friction |
| 049 | Fix Free Tier NextMoveCard | lead-frontend-engineer | S | Pass isFreeUser prop |
| 050 | Fix NextMoveCard Navigation | lead-frontend-engineer | XS | /playbook → /actions |
| 051 | Fix Empty State Copy | lead-frontend-engineer OR exit-osx-product-lead | XS | Product decision |
| 052 | Verify "Industry Preview" Badge | qa-test-engineer | XS | Verification |
| 053 | Disclosure Trigger Copy Update | content-knowledge-architect + lead-frontend-engineer | XS | Buyer-framed copy |
| 066 | Value Gap Card Color | lead-frontend-engineer | XS | Brand color compliance |
| 067 | ValueLedgerSection Documentation | exit-osx-product-lead + content-knowledge-architect | XS | Document decision |
| 068 | Onboarding Step Count Verification | growth-engineer + product-designer-ux | S | ≤7 fields verification |
| 069 | Deferred Tasks Full Flow | qa-test-engineer + full-stack-engineer | M | Verify defer logic |
| 071 | Deal Room Activation Gate Copy | exit-osx-product-lead + content-knowledge-architect | XS | Product approval |

**Dependencies:** Wave 5 (onboarding for PROD-068), Wave 9 (tasks for PROD-069)
**Unblocks:** Nothing (polish layer)
**Parallel Execution:** All items can run in parallel (minor fixes)

---

## Wave 13: Mobile App & Future Features (EXPANSION)

**Duration:** Ongoing (8-12 weeks)
**Agents:** react-native-engineer, mobile-api-engineer, devops-platform-engineer, applied-ai-rules-engine
**Why Thirteenth:** New platform (React Native) and Phase 2 features

### Items (9 Mobile + 13 Future)

**Mobile App (PROD-096 to 104):**
1. **096** - Expo Project Setup (react-native-engineer) — M — Foundation for all mobile
2. **097** - Push Notification Backend (mobile-api-engineer + react-native-engineer) — M — Retention via push
3. **098** - Value Dashboard Screen (react-native-engineer + mobile-api-engineer) — M — Core mobile experience
4. **099** - Actions Queue & Task Completion (react-native-engineer) — M — Mobile task workflow
5. **100** - Diagnosis Screen (react-native-engineer) — S — BRI categories mobile
6. **101** - Evidence Upload (Camera + Files) (react-native-engineer + mobile-api-engineer) — M — Mobile-native feature
7. **102** - Deal Room & Pipeline View (react-native-engineer) — M — Mobile sales workflow
8. **103** - Offline Sync & Delta API (mobile-api-engineer + react-native-engineer) — L — Mobile reliability
9. **104** - App Store Submission Prep (react-native-engineer + devops-platform-engineer) — M — Launch to stores

**Sequential:** 096 → (097, 098, 099, 100, 101, 102 parallel) → 103 → 104

**Future Features (Parking Lot):**
- **073** - "What If" Scenario Modeling (Phase 2)
- **074** - Weekly Check-In Mobile (Phase 2)
- **075** - Benchmark Comparisons (Phase 2)
- **076** - AI Exit Coach (Phase 2a)
- **077** - Accountability Partner System (Phase 2)
- **078** - External Public Signal Ingestion (Phase 2b)
- **079** - Advisor Signal Confirmation Workflow (Phase 2)
- **080** - Stripe Billing Integration (Blocked on pricing)
- **081** - Tax API Integration (Phase 3)
- **082** - Capital Qualification (Phase 4)
- **083** - Advanced Data Room Permissions (Phase 3)
- **084** - Multi-Language Support (Phase 3+)
- **085** - Deal Comparison Tool Enhancement (Phase 2)
- **086** - White-Label Advisor Portal (Phase 4+)
- **087** - Exit Success Stories Database (Phase 3)

**Dependencies:** Waves 1-12 complete (product stable)
**Unblocks:** New platform expansion
**Execution:** Mobile items sequential (096 first), Future items TBD by roadmap

---

## Critical Path Summary

**Longest dependency chain (must be sequential):**

1. **Wave 1** (Testing/Security) — 5-6 days
2. **Wave 2** (Foundation Layer) — 4-5 days
3. **Wave 3** (Valuation Fixes) — 3-4 days
4. **Wave 4** (Assessment Fixes) — 4-5 days
5. **Wave 5** (Onboarding Rebuild) — 6-7 days
6. **Wave 6** (Financial Integrations) — 5-6 days
7. **Wave 7** (Sustained Value) — 7-8 days

**Total Critical Path:** ~40-45 days sequential work

**Parallel Work Available:**
- Wave 8 (Navigation Cleanup) can start after Wave 1
- Wave 9 (Actions/Tasks) can start after Wave 2
- Wave 10 (Deal Room/Mobile UX) can start after Wave 1
- Wave 11 (Test Coverage) can start after Wave 1 (runs continuously)
- Wave 12 (UX Polish) can start after Wave 5

**Realistic Timeline with 17-agent team:**
- **Weeks 1-2:** Waves 1-2 (foundation)
- **Weeks 3-4:** Waves 3-4 (critical bugs)
- **Weeks 5-6:** Waves 5-6 (onboarding + financials)
- **Weeks 7-8:** Wave 7 (retention) + Wave 8 (cleanup) parallel
- **Weeks 9-10:** Waves 9-10 (workflow improvements) parallel
- **Weeks 11-12:** Waves 11-12 (quality + polish)
- **Weeks 13+:** Wave 13 (mobile app + future features)

**Total to "Product Complete" (Waves 1-12):** ~12 weeks
**Total with Mobile App:** ~20-24 weeks

---

## Wave Execution Checklist

For each wave:
- [ ] Review dependencies (all prior wave items complete?)
- [ ] Assign items to specialist agents
- [ ] Create subtasks in TaskCreate for complex items
- [ ] Run items in parallel where no dependencies exist
- [ ] QA verification after each item
- [ ] Update PRODUCT-BACKLOG.md status
- [ ] Commit to git with wave tag (e.g., `wave-1-testing`)
- [ ] Deploy to staging for integration testing
- [ ] Run full regression suite before marking wave complete

---

## Agent Capacity Planning

**Opus agents (8) — Strategic/Architectural:**
- backend-systems-architect: 17 items (Waves 1-4, 7-9)
- financial-modeling-engineer: 15 items (Waves 2-3, 6-7, 10-11)
- applied-ai-rules-engine: 9 items (Waves 4-5, 7, 11)
- security-compliance-engineer: 3 items (Waves 1-2, 5)
- product-designer-ux: 7 items (Waves 4-5, 10, 12)
- content-knowledge-architect: 9 items (Waves 5, 7, 9, 11-12)
- exit-osx-product-manager: 2 items (Wave 13)
- exit-osx-product-lead: 3 items (Wave 12)

**Sonnet agents (9) — Execution/Implementation:**
- lead-frontend-engineer: 22 items (Waves 4-5, 7-10, 12)
- full-stack-engineer: 13 items (Waves 5-6, 8-10)
- qa-test-engineer: 11 items (Waves 1, 3-4, 9-11)
- growth-engineer: 5 items (Waves 5, 7, 12)
- devops-platform-engineer: 4 items (Waves 1, 6-8, 11, 13)
- mobile-experience-engineer: 4 items (Waves 10-11)
- customer-success-engineer: 2 items (Wave 9)
- saas-data-architect: 5 items (Waves 2, 6)
- react-native-engineer: 8 items (Wave 13)
- mobile-api-engineer: 3 items (Wave 13)

**Load Distribution:**
- Heaviest: lead-frontend-engineer (22), backend-systems-architect (17), financial-modeling-engineer (15)
- Lightest: customer-success-engineer (2), exit-osx-product-manager (2), exit-osx-product-lead (3)

---

## Success Metrics

**Wave 1-4 Success (Foundation + Critical Bugs):**
- CI/CD pipeline running with 100% test pass rate
- Valuation discrepancy ≤1% across all pages
- Assessment flow doesn't zero scores on re-assess
- Security test suite at 90%+ coverage

**Wave 5-7 Success (Onboarding + Retention):**
- Signup conversion rate increase (magic link vs password)
- Onboarding completion time ≤5 minutes
- Monthly drift reports generating for all active users
- Email open rates >40% for drift notifications

**Wave 8-10 Success (Cleanup + Workflow):**
- Zero legacy routes accessible
- Task completion time improved (delegation working)
- Mobile login 100% stable
- Deal pipeline drag-and-drop adoption rate

**Wave 11-12 Success (Quality + Polish):**
- Visual regression tests passing (40+ screenshots)
- E2E journeys passing (6 flows)
- Lighthouse scores >90 for all 5 modes
- User-reported bugs ≤5 per week

**Wave 13 Success (Mobile + Future):**
- iOS and Android apps in stores
- Mobile active users >20% of web users
- Phase 2 features validated with beta users

---

**Next Steps:**
1. Review this plan with exit-osx-product-lead
2. Confirm prioritization and sequencing
3. Start Wave 1 immediately (testing foundation is critical)
4. Set up weekly wave completion reviews with project-manager
5. Track velocity per wave to refine estimates for Waves 6-13
