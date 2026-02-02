# Operations Risk Diagnosis - Content Template

> **How to use this template:**
> - [EXISTING] = Content already in your database
> - [FILL] = You need to write this content
> - [EXAMPLE] = Sample content showing the pattern

---

## Overview

When a user completes onboarding and clicks "See Your Action Plan", they enter a weekly improvement cycle focused on the category with the highest value gap.

**Weekly Flow:**
1. System identifies highest-value sub-category to address
2. User answers 5 diagnostic questions (Week N assignment)
3. System generates 3 tasks based on identified drivers
4. User completes tasks (or marks N/A)
5. User re-takes diagnostic → score improves
6. System advances to next sub-category (Week N+1)

**Sub-categories for Operations (equal weight: 25% each):**
1. Scalability
2. Technology Infrastructure
3. Vendor Agreements
4. Employee Retention

---

## Key Design Principles

### 1. No Free Pass
If user marks all 3 tasks as "Not Applicable":
- **Do NOT give them a week off**
- **Immediately pivot** to the next sub-category in priority order
- Message: "These tasks didn't fit your business. Let's move to [Technology Infrastructure] where we can make progress this week."

### 2. Tasks Have Static Benchmark Targets
Every task includes an industry benchmark - not personalized to their current state.
- Example: "Target: 15+ covers per labor hour" (restaurant industry standard)
- User doesn't need to input their baseline for the system to work

### 3. Delegation Role on Every Task
Each task specifies WHO should do it:
- `Owner` - Strategic decisions, final approval
- `GM` - Day-to-day management tasks
- `Chef/Kitchen Manager` - BOH operations
- `Admin` - Paperwork, data entry, scheduling

### 4. Dollar Impact at Sub-Category Level Only
- Show: "Improving Scalability is worth ~$6K of your $24K Operations gap"
- Don't show: Per-task dollar attribution (too complex, not automatable)

### 5. Three Tasks Per Week
System selects top 3 tasks based on:
1. Severity of drivers identified (high → medium → low)
2. Phase order (Measure → Remove Friction → Implement → Validate)
3. Task display_order within phase

---

## Sub-Category 1: SCALABILITY

### Value Attribution
```
If Operations gap = $24K and Scalability is 25% of Operations:
Scalability value = $6K potential
```

### Initial Assessment Question [EXISTING]

| Field | Value |
|-------|-------|
| Question | How scalable is your current business model? |
| Help Text | Buyers want to grow the business. Scalability means you can add revenue without proportionally adding costs. |
| Max Impact | 12 points |

| Option | Score | Maps to Sub-Category Score |
|--------|-------|---------------------------|
| Every new customer requires proportional new hires/costs | 0.00 | 0/100 |
| Growth requires significant incremental investment | 0.33 | 33/100 |
| Some operational leverage exists | 0.67 | 67/100 |
| Highly scalable; revenue can grow faster than costs | 1.00 | 100/100 |

---

### Diagnostic Questions (5 questions to understand WHY scalability is weak)

**Trigger:** User answered option 1 or 2 on initial question (score ≤ 33)

#### DQ-SCALE-1: Throughput Constraints

| Field | Value |
|-------|-------|
| Question | What limits how many customers you can serve during peak hours? |
| Context | Understanding your bottleneck helps identify where to focus. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Kitchen can't keep up with orders | `throughput_kitchen` | High |
| B. Not enough front-of-house staff | `throughput_foh` | High |
| C. Limited seating/space | `throughput_capacity` | Medium |
| D. Slow table turnover | `throughput_turnover` | Medium |
| E. Not sure / haven't measured | `no_measurement` | High |

#### DQ-SCALE-2: Labor Dependency

| Field | Value |
|-------|-------|
| Question | How much does adding a new revenue stream depend on hiring? |
| Context | High labor dependency limits profitable growth. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Every new service requires dedicated staff | `labor_linear` | High |
| B. Need to hire for significant expansions only | `labor_step` | Medium |
| C. Current team can absorb moderate growth | `labor_leveraged` | Low |
| D. Systems allow growth without proportional hiring | `labor_automated` | Low |
| E. Haven't analyzed this | `no_measurement` | High |

#### DQ-SCALE-3: Process Standardization

| Field | Value |
|-------|-------|
| Question | How documented are your core operational processes? |
| Context | SOPs enable delegation and consistency at scale. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Nothing is written down | `no_sops` | High |
| B. Some informal guidelines exist | `partial_sops` | Medium |
| C. Key processes documented but not followed consistently | `sops_not_enforced` | Medium |
| D. SOPs exist and are actively used | `sops_active` | Low |
| E. Fully documented with training program | `sops_mature` | Low |

#### DQ-SCALE-4: Menu/Service Complexity

| Field | Value |
|-------|-------|
| Question | How does your menu complexity affect operations? |
| Context | Complex menus increase prep time, training needs, and error rates. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Large menu with many prep-intensive items | `menu_complex` | High |
| B. Moderate menu, some items slow us down | `menu_moderate` | Medium |
| C. Streamlined menu, efficient to execute | `menu_optimized` | Low |
| D. Recently simplified based on sales data | `menu_data_driven` | Low |
| E. Haven't analyzed menu efficiency | `no_measurement` | High |

#### DQ-SCALE-5: Revenue Expansion Model

| Field | Value |
|-------|-------|
| Question | How do you currently increase revenue? |
| Context | Reveals whether growth strategy requires proportional cost increases. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Add more hours (open earlier/later) | `growth_hours` | High |
| B. Add more staff during existing hours | `growth_headcount` | High |
| C. Increase prices | `growth_pricing` | Medium |
| D. Increase ticket size (upsells, add-ons) | `growth_ticket` | Low |
| E. Add revenue streams (catering, retail, delivery) | `growth_channels` | Low |

---

### Drivers for Scalability

| Driver ID | Name | Description | Buyer Risk Language |
|-----------|------|-------------|---------------------|
| `throughput_kitchen` | Kitchen Bottleneck | Back-of-house can't keep pace with demand | "Growth is capped by kitchen capacity, requiring capital investment to scale." |
| `throughput_foh` | FOH Staffing Bottleneck | Front-of-house understaffed for peak demand | "Revenue growth requires proportional labor cost increases." |
| `throughput_capacity` | Physical Capacity Limit | Space constraints limit covers | "Fixed seating limits upside without second location." |
| `throughput_turnover` | Slow Table Turns | Tables occupied too long | "Operational inefficiency reduces revenue per square foot." |
| `labor_linear` | Linear Labor Model | Every new dollar requires new labor | "Business cannot scale profitably without restructuring." |
| `labor_step` | Step-Function Labor | Periodic hiring needed for growth | "Moderate scaling friction exists." |
| `no_sops` | No Standard Procedures | Operations depend on tribal knowledge | "High transition risk; operations depend on current staff knowledge." |
| `partial_sops` | Incomplete SOPs | Some documentation, gaps remain | "Partial documentation increases onboarding time and error rates." |
| `sops_not_enforced` | SOPs Not Followed | Docs exist but aren't used | "Process documentation exists but isn't operationalized." |
| `menu_complex` | Menu Complexity | Too many items, prep-intensive | "Menu complexity drives labor costs and slows service." |
| `growth_hours` | Hours-Dependent Growth | Only way to grow is more hours | "Growth strategy is labor-intensive and has diminishing returns." |
| `growth_headcount` | Headcount-Dependent Growth | Growth requires proportional hiring | "Scaling requires linear labor investment." |
| `no_measurement` | No Operational Metrics | Lacks visibility into constraints | "Cannot identify or address operational bottlenecks without measurement." |

---

### Task Library for Scalability

> **Note:** System selects top 3 tasks based on: (1) Driver severity, (2) Phase order, (3) Display order

**Phase 1: Measure Baseline**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| SCALE-T1 | Calculate covers per labor hour | Track total covers served divided by total labor hours for one week. Record daily in a spreadsheet. | Spreadsheet with 7 days of covers/labor hour data | Industry avg: 15+ covers/labor hour | 2-3 hrs total | GM | `no_measurement`, `throughput_kitchen`, `throughput_foh` |
| SCALE-T2 | Time peak-hour ticket completion | During Friday/Saturday dinner rush, time 20 tickets from order entry to plate-up. | List of 20 ticket times with average calculated | Industry avg: <12 min ticket time | 1-2 hrs | Chef/Kitchen Manager | `throughput_kitchen` |
| SCALE-T3 | Map table turn times | Track time from guest seated to table cleared for 20 tables during peak service. | List of 20 turn times with average calculated | Industry avg: 45-60 min per turn | 1-2 hrs | GM | `throughput_turnover` |

**Phase 2: Remove Friction**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| SCALE-T4 | Cut 3 low-margin menu items | Review sales mix report. Identify 3 items with lowest margin AND lowest volume. Remove from menu. | Menu updated, 3 items removed | Target: 20% menu reduction | 2-3 hrs | Owner + Chef | `menu_complex` |
| SCALE-T5 | Reduce prep steps for top 5 dishes | Document current prep steps for 5 highest-volume items. Eliminate or combine at least 1 step per dish. | Written before/after prep steps, at least 5 steps eliminated total | Target: 20% prep time reduction | 3-4 hrs | Chef/Kitchen Manager | `menu_complex`, `throughput_kitchen` |
| SCALE-T6 | Cross-train 2 FOH staff on expo | Train 2 servers to run food from kitchen. Test during slow shift. | 2 staff members can run expo independently | Target: 2+ staff cross-trained | 4-6 hrs | GM | `throughput_foh`, `labor_linear` |

**Phase 3: Implement System/Process**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| SCALE-T7 | Document opening checklist | Write down every task needed to open the restaurant. Include times and responsible role. | 1-page checklist, printed and posted | Target: <30 min open-to-ready | 1-2 hrs | GM | `no_sops`, `partial_sops` |
| SCALE-T8 | Document closing checklist | Write down every task needed to close the restaurant. Include times and responsible role. | 1-page checklist, printed and posted | Target: <45 min last-guest-to-locked | 1-2 hrs | GM | `no_sops`, `partial_sops` |
| SCALE-T9 | Implement pre-shift huddle | Create 5-min pre-shift meeting agenda: covers expected, 86'd items, VIPs, one focus area. Run for 1 week. | Agenda template + 7 days of completed huddles | Target: Daily huddles | 30 min setup + 5 min/day | GM | `sops_not_enforced`, `throughput_foh` |

**Phase 4: Validate Improvement**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| SCALE-T10 | Re-measure covers per labor hour | Repeat SCALE-T1 measurement after completing improvement tasks. Compare to baseline. | Spreadsheet showing before/after comparison | Target: 10%+ improvement | 2-3 hrs | GM | `no_measurement` |
| SCALE-T11 | Re-take Scalability diagnostic | Answer the 5 diagnostic questions again based on current state. | Completed re-assessment | Target: Score increase | 10 min | Owner | ALL |

---

## Sub-Category 2: TECHNOLOGY INFRASTRUCTURE

### Value Attribution
```
If Operations gap = $24K and Technology is 25% of Operations:
Technology value = $6K potential
```

### Initial Assessment Question [EXISTING]

| Field | Value |
|-------|-------|
| Question | What is the quality of your technology infrastructure? |
| Help Text | Modern, well-maintained systems reduce technical debt and integration challenges. |
| Max Impact | 8 points |

| Option | Score | Maps to Sub-Category Score |
|--------|-------|---------------------------|
| Outdated systems with significant technical debt | 0.00 | 0/100 |
| Functional but aging infrastructure | 0.33 | 33/100 |
| Modern systems, some areas need updating | 0.67 | 67/100 |
| Current, well-maintained tech stack | 1.00 | 100/100 |

---

### Diagnostic Questions (5 questions)

**Trigger:** User answered option 1 or 2 on initial question (score ≤ 33)

#### DQ-TECH-1: POS System

| Field | Value |
|-------|-------|
| Question | How would you describe your point-of-sale system? |
| Context | POS is the operational backbone of a restaurant. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Cash register / manual system | `pos_manual` | High |
| B. Old POS, vendor no longer supports it | `pos_legacy` | High |
| C. Functional POS but limited reporting | `pos_limited` | Medium |
| D. Modern cloud POS with integrations | `pos_modern` | Low |
| E. Not sure about our POS capabilities | `no_measurement` | Medium |

#### DQ-TECH-2: Inventory Management

| Field | Value |
|-------|-------|
| Question | How do you track inventory? |
| Context | Inventory visibility prevents waste and stockouts. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. We don't track inventory | `inventory_none` | High |
| B. Manual counts, paper records | `inventory_manual` | Medium |
| C. Spreadsheet updated weekly | `inventory_spreadsheet` | Medium |
| D. Integrated system synced with POS | `inventory_integrated` | Low |
| E. Not sure how inventory is tracked | `no_measurement` | High |

#### DQ-TECH-3: Online Ordering / Delivery Integration

| Field | Value |
|-------|-------|
| Question | How do online orders flow into your kitchen? |
| Context | Multiple tablets create chaos; integration creates efficiency. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. We don't do online orders | `online_none` | Medium |
| B. Multiple tablets (DoorDash, UberEats, etc.) | `online_tablet_chaos` | High |
| C. Staff manually enters orders into POS | `online_manual_entry` | Medium |
| D. Orders flow directly into kitchen display | `online_integrated` | Low |
| E. Not sure how online orders work | `no_measurement` | High |

#### DQ-TECH-4: Reporting & Analytics

| Field | Value |
|-------|-------|
| Question | How do you access sales and labor data? |
| Context | Data visibility enables better decisions. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. We don't have regular reports | `reporting_none` | High |
| B. Manually compiled from receipts/timesheets | `reporting_manual` | Medium |
| C. Basic reports from POS, reviewed occasionally | `reporting_basic` | Medium |
| D. Real-time dashboard, reviewed daily | `reporting_realtime` | Low |
| E. Not sure what reports we have | `no_measurement` | High |

#### DQ-TECH-5: System Integration

| Field | Value |
|-------|-------|
| Question | How well do your systems talk to each other? |
| Context | Disconnected systems require manual data entry and create errors. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Nothing is connected, all manual | `integration_none` | High |
| B. Some exports/imports between systems | `integration_manual` | Medium |
| C. A few systems integrated, others standalone | `integration_partial` | Medium |
| D. Fully connected ecosystem | `integration_full` | Low |
| E. Not sure what's connected | `no_measurement` | High |

---

### Drivers for Technology Infrastructure

| Driver ID | Name | Description | Buyer Risk Language |
|-----------|------|-------------|---------------------|
| `pos_manual` | Manual POS | Cash register or paper tickets | "No transaction data history; requires complete system rebuild." |
| `pos_legacy` | Legacy POS | Unsupported system | "Technical debt requires immediate investment post-acquisition." |
| `pos_limited` | Limited POS | Basic POS, poor reporting | "Limited operational visibility; upgrade needed for scale." |
| `inventory_none` | No Inventory Tracking | No visibility into stock | "Cannot calculate true food costs or prevent theft/waste." |
| `inventory_manual` | Manual Inventory | Paper-based tracking | "High labor cost for inventory; prone to errors." |
| `online_tablet_chaos` | Multiple Delivery Tablets | Separate device per platform | "Operational chaos during peak; orders missed or delayed." |
| `online_manual_entry` | Manual Order Entry | Staff re-keys online orders | "Error-prone; slows service; labor inefficiency." |
| `reporting_none` | No Reporting | No visibility into metrics | "Cannot manage what you can't measure." |
| `reporting_manual` | Manual Reporting | Compiled by hand | "High labor cost; data often stale." |
| `integration_none` | No System Integration | Everything disconnected | "Data silos prevent operational efficiency." |
| `no_measurement` | Unknown Tech State | Don't know current state | "Potential hidden technical debt." |

---

### Task Library for Technology Infrastructure

**Phase 1: Measure Baseline**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| TECH-T1 | Audit current tech stack | List every system used: POS, scheduling, inventory, delivery, accounting. Note vendor, cost, and last update. | 1-page systems inventory | Target: Complete inventory | 1-2 hrs | Admin | `no_measurement` |
| TECH-T2 | Count delivery tablets | Count all tablets in use for delivery platforms. List which platform each serves. | List of tablets with platforms | Target: Know your count | 15 min | GM | `online_tablet_chaos` |
| TECH-T3 | Review POS reporting capabilities | Log into POS back-end. List every report available. Star the ones you've never used. | List of available reports | Target: Know what's available | 30 min | GM | `pos_limited`, `no_measurement` |

**Phase 2: Remove Friction**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| TECH-T4 | Consolidate delivery tablets | Sign up for aggregator (Ordermark, Otter, Cuboh). Connect all delivery platforms. Remove individual tablets. | Single tablet for all delivery | Target: 1 tablet, all platforms | 2-4 hrs | GM | `online_tablet_chaos` |
| TECH-T5 | Set up daily sales email | Configure POS to send daily sales summary email to owner/GM at close. | Receiving daily emails | Target: Daily visibility | 30 min | Admin | `reporting_none`, `reporting_manual` |
| TECH-T6 | Clean up menu in POS | Remove discontinued items from POS. Add modifiers for current items. Fix any broken buttons. | POS menu matches physical menu exactly | Target: 100% menu accuracy | 1-2 hrs | GM | `pos_limited` |

**Phase 3: Implement System/Process**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| TECH-T7 | Schedule POS replacement evaluation | If POS is legacy/manual: Book demos with 3 modern POS vendors (Toast, Square, Clover). | 3 demos scheduled | Target: Decision within 30 days | 1 hr | Owner | `pos_manual`, `pos_legacy` |
| TECH-T8 | Implement weekly inventory count | Choose 10 highest-cost items. Count every Sunday. Track in spreadsheet. | 4 weeks of inventory data | Target: Weekly counts | 1 hr setup + 30 min/week | Chef/Kitchen Manager | `inventory_none`, `inventory_manual` |
| TECH-T9 | Connect scheduling to POS | If using separate scheduling tool, set up integration to compare labor cost to sales. | Labor % visible in daily report | Target: Real-time labor % | 1-2 hrs | Admin | `integration_none`, `integration_manual` |

**Phase 4: Validate Improvement**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| TECH-T10 | Re-take Technology diagnostic | Answer the 5 diagnostic questions again based on current state. | Completed re-assessment | Target: Score increase | 10 min | Owner | ALL |

---

## Sub-Category 3: VENDOR AGREEMENTS

### Value Attribution
```
If Operations gap = $24K and Vendor Agreements is 25% of Operations:
Vendor Agreements value = $6K potential
```

### Initial Assessment Question [EXISTING]

| Field | Value |
|-------|-------|
| Question | Do you have formal vendor/supplier agreements? |
| Help Text | Formal agreements provide stability and can be transferred to new ownership. |
| Max Impact | 6 points |

| Option | Score | Maps to Sub-Category Score |
|--------|-------|---------------------------|
| Informal relationships only | 0.00 | 0/100 |
| Mix of formal and informal | 0.33 | 33/100 |
| Most key vendors under contract | 0.67 | 67/100 |
| All critical suppliers under formal agreement | 1.00 | 100/100 |

---

### Diagnostic Questions (5 questions)

**Trigger:** User answered option 1 or 2 on initial question (score ≤ 33)

#### DQ-VENDOR-1: Food Supplier Agreements

| Field | Value |
|-------|-------|
| Question | What agreements do you have with your primary food suppliers? |
| Context | Formal agreements protect pricing and ensure supply continuity. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. No written agreements, order as needed | `food_no_contract` | High |
| B. Verbal agreement on pricing | `food_verbal` | Medium |
| C. Written agreement with main supplier only | `food_partial` | Medium |
| D. Contracts with all key food suppliers | `food_formal` | Low |
| E. Not sure what agreements we have | `no_measurement` | High |

#### DQ-VENDOR-2: Beverage/Alcohol Supplier

| Field | Value |
|-------|-------|
| Question | What is your arrangement with beverage/alcohol suppliers? |
| Context | Beverage agreements often include equipment loans and exclusivity. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. No beverage program / cash and carry | `beverage_none` | Medium |
| B. Informal relationship with distributor | `beverage_informal` | Medium |
| C. Pouring rights agreement (beer/soda) | `beverage_partial` | Low |
| D. Full beverage contract with rebates | `beverage_formal` | Low |
| E. Not sure about beverage agreements | `no_measurement` | Medium |

#### DQ-VENDOR-3: Equipment/Maintenance

| Field | Value |
|-------|-------|
| Question | How do you handle equipment maintenance? |
| Context | Unexpected equipment failure can shut down operations. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Fix things when they break | `equipment_reactive` | High |
| B. Informal relationship with repair person | `equipment_informal` | Medium |
| C. Maintenance contract on some equipment | `equipment_partial` | Medium |
| D. Full service contracts on all critical equipment | `equipment_formal` | Low |
| E. Not sure about maintenance arrangements | `no_measurement` | High |

#### DQ-VENDOR-4: Lease Terms

| Field | Value |
|-------|-------|
| Question | What is the status of your lease? |
| Context | Lease terms are critical to business value and transferability. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Less than 2 years remaining | `lease_short` | High |
| B. Lease may not transfer to new owner | `lease_no_transfer` | High |
| C. 3-5 years remaining, standard terms | `lease_moderate` | Medium |
| D. 5+ years remaining with options, transferable | `lease_strong` | Low |
| E. Not sure about lease terms | `no_measurement` | High |

#### DQ-VENDOR-5: Price Protection

| Field | Value |
|-------|-------|
| Question | How protected are you from supplier price increases? |
| Context | Locked pricing protects margins; market rates create volatility. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. All prices fluctuate with market | `pricing_exposed` | High |
| B. Some items have stable pricing | `pricing_partial` | Medium |
| C. Most items have agreed pricing for 6+ months | `pricing_protected` | Low |
| D. Annual contracts with price locks | `pricing_locked` | Low |
| E. Not sure about pricing terms | `no_measurement` | High |

---

### Drivers for Vendor Agreements

| Driver ID | Name | Description | Buyer Risk Language |
|-----------|------|-------------|---------------------|
| `food_no_contract` | No Food Supplier Contract | Can be dropped or repriced anytime | "Supply chain risk; pricing unpredictable." |
| `food_verbal` | Verbal Food Agreement | No legal protection | "Informal agreement won't survive ownership change." |
| `beverage_informal` | Informal Beverage | No documented arrangement | "May lose beverage pricing/equipment on sale." |
| `equipment_reactive` | Reactive Maintenance | No preventive care | "Equipment failure risk; hidden deferred maintenance." |
| `equipment_informal` | Informal Maintenance | No guaranteed response | "No SLA for critical equipment repair." |
| `lease_short` | Short Lease Remaining | Under 2 years left | "Lease expires within 2 years, creating location risk." |
| `lease_no_transfer` | Lease Not Transferable | Landlord approval required | "Deal may fail if landlord won't transfer lease." |
| `pricing_exposed` | Market Rate Pricing | No price protection | "Margin volatility from supplier price swings." |
| `no_measurement` | Unknown Agreements | Don't know current state | "Hidden contractual risks." |

---

### Task Library for Vendor Agreements

**Phase 1: Measure Baseline**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| VENDOR-T1 | Create vendor inventory | List all vendors: food, beverage, equipment, services. Note: contract Y/N, expiration date, key contact. | Spreadsheet with all vendors | Target: 100% vendor visibility | 1-2 hrs | Admin | `no_measurement` |
| VENDOR-T2 | Pull lease and review terms | Get copy of lease. Note: expiration date, renewal options, transfer clause, landlord contact. | Lease summary document | Target: Know your terms | 1 hr | Owner | `lease_short`, `lease_no_transfer`, `no_measurement` |
| VENDOR-T3 | Review food cost invoices | Pull last 3 months of invoices from top 3 food suppliers. Note any price changes. | Price trend summary | Target: Know your costs | 1-2 hrs | Admin | `pricing_exposed`, `no_measurement` |

**Phase 2: Remove Friction**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| VENDOR-T4 | Get competitive food quotes | Contact 2 alternative food suppliers. Request pricing on top 20 items. | 2 competitive quotes | Target: Know your options | 2-3 hrs | GM | `food_no_contract`, `pricing_exposed` |
| VENDOR-T5 | Schedule landlord meeting | If lease is short or unclear on transfer: request meeting to discuss renewal/extension. | Meeting scheduled | Target: Start conversation | 30 min | Owner | `lease_short`, `lease_no_transfer` |

**Phase 3: Implement System/Process**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| VENDOR-T6 | Negotiate written agreement with top food supplier | Using competitive quotes as leverage, request written agreement with pricing terms. | Signed agreement | Target: 6+ month price lock | 2-4 hrs | Owner | `food_no_contract`, `food_verbal`, `pricing_exposed` |
| VENDOR-T7 | Set up equipment maintenance contract | Contact equipment repair company. Get quote for preventive maintenance on refrigeration, HVAC, cooking equipment. | Signed maintenance contract or quote in review | Target: PM on critical equipment | 1-2 hrs | Owner/GM | `equipment_reactive`, `equipment_informal` |
| VENDOR-T8 | Request lease extension terms | In writing, request terms for 5-year extension with transfer rights. | Written response from landlord | Target: Know your options | 1 hr | Owner | `lease_short`, `lease_no_transfer` |

**Phase 4: Validate Improvement**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| VENDOR-T9 | Re-take Vendor Agreements diagnostic | Answer the 5 diagnostic questions again based on current state. | Completed re-assessment | Target: Score increase | 10 min | Owner | ALL |

---

## Sub-Category 4: EMPLOYEE RETENTION

### Value Attribution
```
If Operations gap = $24K and Employee Retention is 25% of Operations:
Employee Retention value = $6K potential
```

### Initial Assessment Question [EXISTING]

| Field | Value |
|-------|-------|
| Question | How would you rate your employee retention? |
| Help Text | High turnover signals cultural or operational issues and increases transition risk. |
| Max Impact | 8 points |

| Option | Score | Maps to Sub-Category Score |
|--------|-------|---------------------------|
| High turnover (>30% annually) | 0.00 | 0/100 |
| Moderate turnover (15-30% annually) | 0.33 | 33/100 |
| Low turnover (5-15% annually) | 0.67 | 67/100 |
| Very low turnover (<5% annually) | 1.00 | 100/100 |

---

### Diagnostic Questions (5 questions)

**Trigger:** User answered option 1 or 2 on initial question (score ≤ 33)

#### DQ-RETENTION-1: Turnover Root Cause

| Field | Value |
|-------|-------|
| Question | Why do employees typically leave? |
| Context | Understanding root cause determines the fix. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Better pay elsewhere | `pay_not_competitive` | High |
| B. Scheduling issues / work-life balance | `schedule_issues` | Medium |
| C. Poor management / culture | `culture_issues` | High |
| D. No growth opportunities | `no_advancement` | Medium |
| E. Don't know / haven't asked | `no_measurement` | High |

#### DQ-RETENTION-2: Compensation Competitiveness

| Field | Value |
|-------|-------|
| Question | How does your pay compare to similar restaurants nearby? |
| Context | Below-market pay guarantees turnover. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Below market (we struggle to hire) | `pay_below_market` | High |
| B. At market (competitive but not leading) | `pay_at_market` | Medium |
| C. Above market (we attract good candidates) | `pay_above_market` | Low |
| D. Way above market plus benefits | `pay_premium` | Low |
| E. Not sure how we compare | `no_measurement` | High |

#### DQ-RETENTION-3: Training & Onboarding

| Field | Value |
|-------|-------|
| Question | How do you train new employees? |
| Context | Poor training leads to frustration and early exits. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. Throw them in, learn as they go | `training_none` | High |
| B. Shadow someone for a shift or two | `training_shadow_only` | Medium |
| C. Basic orientation plus shadowing | `training_basic` | Medium |
| D. Structured multi-day training program | `training_formal` | Low |
| E. Not sure what training we do | `no_measurement` | High |

#### DQ-RETENTION-4: Key Person Dependency

| Field | Value |
|-------|-------|
| Question | If your best employee left tomorrow, what would happen? |
| Context | Key person risk scares buyers. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. We'd have to close or reduce hours | `key_person_critical` | High |
| B. Major disruption for weeks | `key_person_high` | High |
| C. Moderate disruption, could recover in days | `key_person_moderate` | Medium |
| D. Minimal impact, others are cross-trained | `key_person_low` | Low |
| E. Not sure how we'd handle it | `no_measurement` | High |

#### DQ-RETENTION-5: Employee Feedback

| Field | Value |
|-------|-------|
| Question | How do you gather and act on employee feedback? |
| Context | Employees who feel heard stay longer. |

| Choice | Driver Mapped | Severity |
|--------|--------------|----------|
| A. We don't ask for feedback | `feedback_none` | High |
| B. Informal conversations sometimes | `feedback_informal` | Medium |
| C. Regular 1:1s but no formal process | `feedback_adhoc` | Medium |
| D. Structured feedback with follow-up | `feedback_formal` | Low |
| E. Not sure how we handle feedback | `no_measurement` | High |

---

### Drivers for Employee Retention

| Driver ID | Name | Description | Buyer Risk Language |
|-----------|------|-------------|---------------------|
| `pay_not_competitive` | Non-Competitive Pay | Losing people to higher-paying competitors | "Compensation below market increases post-acquisition turnover risk." |
| `pay_below_market` | Below-Market Pay | Can't attract talent | "Will require immediate payroll increase to stabilize team." |
| `schedule_issues` | Scheduling Problems | Work-life balance issues | "Schedule unpredictability driving turnover." |
| `culture_issues` | Culture/Management Issues | Toxic or dysfunctional environment | "Cultural issues may drive key staff departures during transition." |
| `no_advancement` | No Career Path | Dead-end jobs | "No growth path leads to inevitable departures." |
| `training_none` | No Training Program | Sink or swim | "New hires fail early; constant hiring cycle." |
| `training_shadow_only` | Shadow-Only Training | Inconsistent quality | "Training quality varies; no standards." |
| `key_person_critical` | Critical Key Person Risk | Business can't operate without one person | "Business cannot operate without specific individual." |
| `key_person_high` | High Key Person Risk | Major disruption if key person leaves | "Significant transition risk tied to key employee." |
| `feedback_none` | No Feedback Channel | Employees have no voice | "Issues fester until people quit." |
| `no_measurement` | No Exit Data | Don't know why people leave | "Cannot fix what you don't understand." |

---

### Task Library for Employee Retention

**Phase 1: Measure Baseline**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| RET-T1 | Calculate actual turnover rate | Count employees at start of year. Count departures during year. Calculate: departures ÷ starting count. | Turnover rate calculated | Industry avg: <30% for restaurants | 30 min | Admin | `no_measurement` |
| RET-T2 | Conduct exit interviews | For next 2 departures, ask: Why leaving? What would have made you stay? Document answers. | 2 exit interviews completed | Target: Capture real reasons | 30 min each | GM | `no_measurement` |
| RET-T3 | Benchmark local pay rates | Check Indeed, Poached, or ask peers: What are servers/cooks paid at 3 similar restaurants? | Pay comparison document | Target: Know where you stand | 1 hr | Admin | `pay_not_competitive`, `pay_below_market`, `no_measurement` |

**Phase 2: Remove Friction**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| RET-T4 | Post schedule 2 weeks out | Set rule: Schedule posted every Sunday for 2 weeks ahead. Communicate to team. | 2 consecutive weeks of on-time schedules | Target: 14-day visibility | 30 min setup | GM | `schedule_issues` |
| RET-T5 | Implement shift swap system | Create process for employees to swap shifts without manager approval (within rules). | Process documented and communicated | Target: Empower staff | 1 hr | GM | `schedule_issues` |
| RET-T6 | Identify key person backup | For your most critical employee: Who could cover 50% of their duties tomorrow? Document gaps. | Backup person identified + gap list | Target: Know your risk | 1 hr | Owner | `key_person_critical`, `key_person_high` |

**Phase 3: Implement System/Process**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| RET-T7 | Create Day 1 onboarding checklist | Document everything a new hire needs: paperwork, uniform, tour, intro to team, first shift expectations. | 1-page checklist | Target: Consistent Day 1 | 1-2 hrs | GM | `training_none`, `training_shadow_only` |
| RET-T8 | Cross-train backup on key tasks | Using gap list from RET-T6: schedule 3 training sessions to teach backup person critical tasks. | 3 training sessions completed | Target: 50% coverage | 3-6 hrs | Owner + Key Person | `key_person_critical`, `key_person_high` |
| RET-T9 | Start monthly team check-in | Schedule 15-min 1:1 with each employee monthly. Ask: What's working? What's frustrating? | First round of check-ins completed | Target: Every employee heard | 15 min per person | GM | `feedback_none`, `feedback_informal`, `culture_issues` |

**Phase 4: Validate Improvement**

| Task ID | Title | Description | Done Definition | Benchmark Target | Effort | Delegate To | Improves Drivers |
|---------|-------|-------------|-----------------|------------------|--------|-------------|------------------|
| RET-T10 | Re-take Employee Retention diagnostic | Answer the 5 diagnostic questions again based on current state. | Completed re-assessment | Target: Score increase | 10 min | Owner | ALL |

---

## System Behavior: N/A Handling

### If User Marks All 3 Tasks as "Not Applicable"

**Do NOT give a free pass.** Immediately advance to next sub-category:

```
User marks Task 1: N/A
User marks Task 2: N/A
User marks Task 3: N/A

→ System message:
"These tasks didn't fit [Company Name]'s situation.
Let's move to Technology Infrastructure, which is worth $6K of your value gap.

[Start Technology Diagnostic]"
```

### Priority Order for Sub-Categories

When Operations is the focus, work through sub-categories in this order based on:
1. **Lowest score first** (most room for improvement)
2. **If tied:** Highest weight in value attribution
3. **If still tied:** Scalability → Technology → Vendors → Retention

---

## Summary: Content Status

| Section | Status |
|---------|--------|
| Scalability diagnostic questions | ✅ Complete |
| Scalability drivers | ✅ Complete |
| Scalability tasks | ✅ Complete (11 tasks) |
| Technology diagnostic questions | ✅ Complete |
| Technology drivers | ✅ Complete |
| Technology tasks | ✅ Complete (10 tasks) |
| Vendor diagnostic questions | ✅ Complete |
| Vendor drivers | ✅ Complete |
| Vendor tasks | ✅ Complete (9 tasks) |
| Retention diagnostic questions | ✅ Complete |
| Retention drivers | ✅ Complete |
| Retention tasks | ✅ Complete (10 tasks) |

**Total: 20 questions, 100 choices, ~40 drivers, ~40 tasks**

---

## AI Customization Layer

This section describes how AI can personalize the static template content based on the user's business description from onboarding.

### Business Context Collected During Onboarding

| Field | Example Values | Used For |
|-------|---------------|----------|
| `business_type` | Full-service restaurant, Fast-casual, Bar/pub, Food truck, Cafe, Catering | Filtering questions, adjusting benchmarks |
| `cuisine_type` | Mexican, Italian, American, Asian fusion, BBQ | Task language customization |
| `employee_count` | 3, 12, 45 | Delegation suggestions, relevance filtering |
| `owner_role` | Working owner, Absentee owner, Owner-operator | Task assignment |
| `services_offered` | Dine-in, Takeout, Delivery, Catering, Private events | Question filtering |
| `pos_system` | Toast, Square, Clover, Cash register, None | Tech task filtering |
| `years_in_business` | 1, 5, 20 | Benchmark context |
| `business_description` | Free text from user | AI context for all customization |

### What AI Customizes vs. What Stays Static

| Element | Static (Rule-Based) | AI-Customized |
|---------|--------------------|--------------|
| Driver IDs | ✅ Always `throughput_kitchen` | |
| Driver → Task mapping | ✅ Deterministic lookup | |
| Task selection order | ✅ Severity → Phase → Order | |
| Question text | | ✅ Adjusted for business type |
| Question relevance | | ✅ Skip if not applicable |
| Task title | | ✅ Light customization |
| Task description | | ✅ Personalized to their context |
| Benchmark target | | ✅ Adjusted for segment |
| Delegate To | | ✅ Adjusted for team size |
| Done definition | ✅ Stays consistent | |

### Customization Prompts

#### Prompt 1: Filter Irrelevant Questions

```
You are filtering diagnostic questions for a restaurant business.

Business context:
- Type: {business_type}
- Services: {services_offered}
- Description: {business_description}

Question to evaluate:
"{question_text}"

Should this question be shown to this business?
Reply with: SHOW, SKIP, or MODIFY

If MODIFY, provide the modified question text.

Examples:
- "How do online orders flow into your kitchen?" → SKIP if services_offered does not include "Delivery"
- "What is your arrangement with beverage/alcohol suppliers?" → SKIP if business_type is "Cafe" and description mentions "no alcohol"
- "How does your menu complexity affect operations?" → MODIFY to "How does your drink menu complexity affect operations?" if business_type is "Bar/pub"
```

#### Prompt 2: Customize Task Description

```
You are customizing a task for a specific restaurant business.

Business context:
- Type: {business_type}
- Cuisine: {cuisine_type}
- Employees: {employee_count}
- Owner role: {owner_role}
- Description: {business_description}

Original task:
- Title: {task_title}
- Description: {task_description}
- Benchmark: {benchmark_target}
- Delegate to: {delegate_to}

Customize this task for their business:
1. Keep the same outcome/goal
2. Adjust language to match their context
3. If benchmark doesn't apply, suggest appropriate benchmark
4. If delegation doesn't make sense for team size, adjust

Return JSON:
{
  "title": "customized title",
  "description": "customized description",
  "benchmark_target": "customized benchmark",
  "delegate_to": "adjusted delegation"
}
```

#### Prompt 3: Adjust Benchmark for Business Segment

```
You are setting an industry benchmark for a restaurant metric.

Business context:
- Type: {business_type}
- Cuisine: {cuisine_type}
- Services: {services_offered}

Metric: {metric_name}
Default benchmark: {default_benchmark}

What is an appropriate benchmark for this specific business type?

Consider:
- Fast-casual typically has higher throughput than full-service
- Fine dining has longer turn times than casual
- Food trucks have different capacity constraints
- Bars have different labor models than restaurants

Return: A specific, realistic benchmark with brief justification.
```

#### Prompt 4: Skip Task If Not Applicable

```
You are evaluating whether a task applies to a specific business.

Business context:
- Type: {business_type}
- Employees: {employee_count}
- Services: {services_offered}
- Description: {business_description}

Task:
- Title: {task_title}
- Description: {task_description}
- Improves drivers: {driver_ids}

Does this task apply to this business?
Reply: APPLICABLE, NOT_APPLICABLE, or NEEDS_MODIFICATION

If NOT_APPLICABLE, explain why in one sentence.
If NEEDS_MODIFICATION, provide the modified task.

Examples:
- "Consolidate delivery tablets" → NOT_APPLICABLE if no delivery service
- "Cross-train FOH staff on expo" → NOT_APPLICABLE if food truck (no FOH/BOH separation)
- "Document opening checklist" → APPLICABLE to all (universal task)
```

### Customization Examples

#### Example 1: Fast-Casual Taco Shop (5 employees, no delivery)

**Original Question:**
> "How do online orders flow into your kitchen?"

**AI Decision:** SKIP (no delivery service)

---

**Original Task:**
> Title: "Cut 3 low-margin menu items"
> Description: "Review sales mix report. Identify 3 items with lowest margin AND lowest volume. Remove from menu."
> Benchmark: "Target: 20% menu reduction"
> Delegate to: "Owner + Chef"

**AI Customized:**
> Title: "Cut 3 low-margin taco/bowl options"
> Description: "Review your POS sales report. Which 3 tacos or bowls sell the least AND take the most prep time? Remove them from the menu this week."
> Benchmark: "Target: Reduce menu to under 15 items"
> Delegate to: "You (owner-operator)"

---

#### Example 2: Full-Service Italian Restaurant (25 employees, dine-in + catering)

**Original Task:**
> Title: "Calculate covers per labor hour"
> Benchmark: "Industry avg: 15+ covers/labor hour"
> Delegate to: "GM"

**AI Customized:**
> Title: "Calculate covers per labor hour"
> Benchmark: "Full-service Italian avg: 12-14 covers/labor hour"
> Delegate to: "GM (have host track covers, admin pull labor hours)"

---

#### Example 3: Food Truck (2 employees, owner-operated)

**Original Task:**
> Title: "Cross-train 2 FOH staff on expo"
> Delegate to: "GM"

**AI Decision:** NOT_APPLICABLE
> Reason: Food truck has no FOH/BOH separation; 2-person team already does everything.

**Alternative Task Suggested:**
> Title: "Document your service flow"
> Description: "Write down the 10 steps from customer order to food handoff. Identify which steps slow you down during rush."
> Delegate to: "You"

---

### Implementation Notes

1. **When to call AI:**
   - Once when user enters Action Plan page (filter questions)
   - Once per diagnostic completion (customize the 3 selected tasks)
   - NOT on every page load (cache results)

2. **Fallback behavior:**
   - If AI fails, show original static content
   - Log AI modifications for review
   - Allow user to report "this doesn't apply" (feeds back to improve prompts)

3. **Cost control:**
   - Use smaller/faster model for filtering (yes/no decisions)
   - Use larger model only for description customization
   - Batch calls where possible

4. **Database storage:**
   - Store AI-customized content in `company_tasks` table
   - Keep link to original `task_template_id` for analytics
   - Track which content was AI-modified vs. static

```sql
-- Add to company_tasks table
ALTER TABLE company_tasks ADD COLUMN customized_title TEXT;
ALTER TABLE company_tasks ADD COLUMN customized_description TEXT;
ALTER TABLE company_tasks ADD COLUMN customized_benchmark TEXT;
ALTER TABLE company_tasks ADD COLUMN customized_delegate_to TEXT;
ALTER TABLE company_tasks ADD COLUMN ai_customization_log JSONB;
```

---

## Database Schema Changes Needed

```sql
-- New tables needed

CREATE TABLE bri_subcategories (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL, -- 'OPERATIONAL', 'FINANCIAL', etc.
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  weight DECIMAL(3,2) DEFAULT 0.25,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE diagnostic_questions (
  id TEXT PRIMARY KEY,
  subcategory_id TEXT REFERENCES bri_subcategories(id),
  question_text TEXT NOT NULL,
  context_text TEXT,
  display_order INT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE diagnostic_options (
  id TEXT PRIMARY KEY,
  question_id TEXT REFERENCES diagnostic_questions(id),
  option_text TEXT NOT NULL,
  display_order INT
);

CREATE TABLE weakness_drivers (
  id TEXT PRIMARY KEY,
  subcategory_id TEXT REFERENCES bri_subcategories(id),
  name TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('high', 'medium', 'low')),
  buyer_risk_language TEXT
);

CREATE TABLE option_driver_mappings (
  option_id TEXT REFERENCES diagnostic_options(id),
  driver_id TEXT REFERENCES weakness_drivers(id),
  PRIMARY KEY (option_id, driver_id)
);

CREATE TABLE task_templates (
  id TEXT PRIMARY KEY,
  subcategory_id TEXT REFERENCES bri_subcategories(id),
  title TEXT NOT NULL,
  description TEXT,
  done_definition TEXT,
  benchmark_target TEXT,           -- NEW: Industry benchmark
  estimated_effort TEXT,
  delegate_to TEXT,                -- NEW: Owner, GM, Chef, Admin
  phase INT CHECK (phase BETWEEN 1 AND 4),
  display_order INT
);

CREATE TABLE task_driver_mappings (
  task_id TEXT REFERENCES task_templates(id),
  driver_id TEXT REFERENCES weakness_drivers(id),
  PRIMARY KEY (task_id, driver_id)
);

-- User's diagnostic responses
CREATE TABLE diagnostic_responses (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  subcategory_id TEXT REFERENCES bri_subcategories(id),
  question_id TEXT REFERENCES diagnostic_questions(id),
  selected_option_id TEXT REFERENCES diagnostic_options(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User's generated tasks (instances from templates)
CREATE TABLE company_tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  task_template_id TEXT REFERENCES task_templates(id),
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'not_applicable')),  -- NEW: added not_applicable
  completed_at TIMESTAMP,
  evidence_urls TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track weekly cycles
CREATE TABLE company_weekly_cycles (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  week_number INT,
  subcategory_id TEXT REFERENCES bri_subcategories(id),
  diagnostic_completed_at TIMESTAMP,
  tasks_completed_at TIMESTAMP,
  reassessment_completed_at TIMESTAMP,
  score_before INT,
  score_after INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```
