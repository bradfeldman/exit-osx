# PRODUCT COUNCIL DECISION RECORD: COUNCIL-002

## Actions Section Enrichment -- Task Personalization with Financial Context

**Date:** 2026-02-13
**Type:** Feature Change
**Verdict:** APPROVED WITH CHANGES (Unanimous 3-0)
**Owner:** Engineering lead (implementation), Product Lead (quality gate)
**Review Date:** 2026-03-15

---

## DECISION SUMMARY

Generic tasks are the #1 product quality problem. The system has rich financial data (IncomeStatement, IndustryMultiple, CoreFactors, CompanyDossier) that is NOT being passed to AI task generation prompts. This decision approves enriching tasks with personalized financial context using a three-tier model (HIGH/MODERATE/LOW) based on data availability.

---

## WHAT WE'RE DOING

### 1. Build `gatherTaskPersonalizationContext()`
- **Location:** `src/lib/tasks/personalization-context.ts`
- **Fetches:** IncomeStatement (latest), IndustryMultiple (sector benchmarks), CoreFactors (business model), CompanyDossier (narrative), ValuationSnapshot (BRI scores)
- **Returns:** Typed `PersonalizationContext` with tier property
  - **HIGH:** Financials + benchmarks both available
  - **MODERATE:** CoreFactors + benchmarks (no detailed financials)
  - **LOW:** Assessment data only

### 2. Modify AI Task Generation Prompts
- `src/lib/dossier/ai-tasks.ts`: Add PersonalizationContext to prompt
- `src/lib/playbook/generate-tasks.ts`: Enrich template-based tasks post-creation

### 3. Define `companyContext` Block Schema in `richDescription`
```typescript
interface CompanyContext {
  yourSituation: { metric: string; value: string; source: string }
  industryBenchmark: { range: string; source: string }
  financialImpact: {
    gapDescription: string
    dollarImpact: string
    enterpriseValueImpact: string
    calculation: string
  }
  contextNote: string  // "acknowledge context" escape hatch
  dataQuality: 'HIGH' | 'MODERATE' | 'LOW'
  addFinancialsCTA: boolean
}
```

### 4. Update ActiveTaskCard.tsx
- Add `CompanyContextBlock` component between title/meta and BuyerContextBlock
- HIGH: full data display (metric, range, dollar impact)
- MODERATE: categorical insights with "add financials" CTA
- LOW: blurred/muted preview with "Add Financials" CTA

### 5. Analytics Instrumentation
- `enrichment_tier` property on all task events
- `financial_upload_cta_clicked` event
- `task_context_expanded` event

---

## WHAT WE'RE NOT DOING

- NOT retroactively enriching existing tasks (Phase 2)
- NOT adding gross margin benchmarks to IndustryMultiple (future)
- NOT deriving gross margin from EBITDA margin (inaccurate)
- NOT computing context at read time (latency)
- NOT redesigning ActiveTaskCard layout (extending)
- NOT touching other modes
- NOT building drift detection (Phase 3)
- NOT building "your data changed" notifications (Phase 2)

---

## REQUIRED CHANGES (from Product Lead)

1. Founder's actual number labeled with source: "From your 2025 P&L" or "Estimated from assessment"
2. Industry benchmarks must be ranges, never point estimates
3. Dollar impact shows calculation: "26-point gap x $2M = $520K/year"
4. Every enriched task includes acknowledge-context note
5. Missing benchmarks gracefully degrade to MODERATE tier

---

## SEQUENCING

### Phase 1 (This Sprint -- ~5 engineering days)
- Day 1: Build `gatherTaskPersonalizationContext()` + tests
- Day 2: Modify AI task generation to include context
- Day 3: Update richDescription schema, template enrichment
- Day 4: Build CompanyContextBlock + integrate into ActiveTaskCard
- Day 5: Analytics + QA + edge cases

### Phase 2 (Next Sprint)
- Post-generation enrichment trigger on financial data upload
- "Your action plan updated" notification
- Retroactive enrichment of existing tasks

### Phase 3 (Future)
- Financial drift detection
- Cross-task context
- Benchmark tracking over time
- Expand enrichment to Diagnosis mode

---

## THE "REDUCE COGS" TEST

### BEFORE (current):
```
Title: Reduce cost of goods sold
Description: Identify and implement strategies to reduce your cost of goods sold.
```

### AFTER (HIGH tier):
```
Title: Reduce cost of goods sold

YOUR SITUATION
  Your COGS: $1.36M (68% of $2M revenue) -- From your 2025 P&L
  Industry range: 42-55% for Industrial Services (Q4 2025 benchmarks)
  The gap: 13-26 points above range
  Impact: $260K/year margin improvement = $650K-$1.3M enterprise value
  Calculation: ($2M x 0.68) - ($2M x 0.55) = $260K x 2.5-5.0x multiple

  Note: If higher COGS reflects deliberate strategy (premium materials,
  vertical integration), document that rationale for buyers.
```

### AFTER (LOW tier):
```
Title: Reduce cost of goods sold

YOUR SITUATION
  [blurred preview] Add your financials to see how your costs compare
  to industry benchmarks and calculate enterprise value impact.
  [Add Your Financials -->]
```

---

## SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Task start rate: HIGH vs LOW tier | 2x improvement |
| Task completion rate: HIGH vs LOW tier | 1.5x improvement |
| Financial upload from LOW tier CTA | 15% conversion |
| 30-day retention: HIGH tier vs baseline | +20% relative |
| Actions page NPS | +10 points |

---

## SPECIALIST INPUTS

| Specialist | Recommendation | Confidence |
|------------|---------------|------------|
| Buyer Intelligence | 5-dimension enrichment model | HIGH |
| Business Appraiser | Ranges not point estimates; transparent math | MEDIUM |
| Customer Success | Generic tasks = #1 churn accelerator; LOW tier drives activation | HIGH |
| UX Designer | CompanyContextBlock above BuyerContextBlock; extend don't redesign | HIGH |
| Backend Architect | Follow buyer-consequences pattern; no schema migration | HIGH |
| Growth Engineer | Track enrichment_tier on all events; measure by tier | MEDIUM |
| Content Architect | Lead with their number; dollars not percentages; acknowledge context | HIGH |

---

## RISKS ACCEPTED

1. Some sectors may have null benchmarks -- mitigated by tier degradation
2. Stale financial data may show outdated numbers -- mitigated by source labels
3. AI may misinterpret data -- mitigated by showing calculations
4. Phase 1 only enriches new tasks -- existing users wait for Phase 2
