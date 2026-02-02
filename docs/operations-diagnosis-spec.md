# Operations Risk Diagnosis - Product Specification

## Overview

An AI-powered system that creates personalized diagnostic questions and improvement tasks based on each user's unique business. Instead of static templates, the system uses the user's business description to generate relevant, contextual content.

---

## Core Architecture

```
User describes business (onboarding)
        ↓
AI asks 3-5 clarifying questions
        ↓
AI builds structured business profile
        ↓
System identifies lowest-scoring sub-category
        ↓
AI generates 5 diagnostic questions for that sub-category
        ↓
User answers → System maps to drivers
        ↓
AI generates 3 relevant tasks
        ↓
User completes tasks (or marks N/A)
        ↓
User re-takes diagnostic → Score improves
        ↓
System advances to next sub-category
```

---

## Key Design Principles

### 1. Driver Framework is the Skeleton
AI generates content, but everything maps back to a fixed set of drivers:
- Enables consistent scoring
- Allows cross-business comparison
- Maintains valuation math integrity

### 2. No Free Pass
If user marks all tasks as N/A, immediately pivot to next sub-category.

### 3. Three Tasks Per Week
Keep workload manageable. Quality over quantity.

### 4. Everything Feels Personal
Questions and tasks should read like they were written for THIS specific business.

### 5. Grounded in Their Language
If they say "ramen shop," the system says "ramen," not "food items."

---

## User Flow

### Phase 1: Business Profile Creation (During Onboarding)

#### Step 1.1: Business Description
After company name and industry, add a new step:

**UI:**
```
Tell us about your business

In a few sentences, describe what your business does, how many
people work there, and what makes it unique.

[Large text area]

Examples:
• "I run a 10-seat ramen shop with 2 part-time staff. Lunch and
   dinner, no delivery. Just Square for payments."
• "Family-owned Italian restaurant, 15 years in business. 20
   employees, full bar, we do catering on weekends."
```

**Stored as:** `companies.business_description`

---

#### Step 1.2: AI Clarifying Questions
System sends description to AI, which generates 3-5 clarifying questions.

**AI Prompt:**
```
You are building a business profile to create a personalized improvement plan.

User's description:
"{business_description}"

Industry: {industry}
Revenue: {revenue_range}

Analyze what's already clear from their description, then generate 3-5
multiple choice questions to fill in the gaps. We need to understand:

1. Biggest operational pain point
2. Documentation/process maturity
3. Owner dependency level
4. Team structure and dynamics
5. Technology they use
6. Primary goal (growth, profitability, exit readiness)

Rules:
- Skip questions if already answered in description
- Keep questions conversational, not corporate
- Each question: 3-4 options + "Something else: ___"
- Maximum 5 questions

Return JSON:
{
  "already_known": {
    "team_size": 3,
    "services": ["dine-in"],
    ...
  },
  "questions": [
    {
      "id": "q1",
      "question": "What's your biggest operational headache right now?",
      "options": [
        {"id": "a", "text": "Keeping up during rush"},
        {"id": "b", "text": "Staff reliability"},
        {"id": "c", "text": "Food costs / waste"},
        {"id": "d", "text": "Something else"}
      ],
      "allows_other": true,
      "maps_to_profile_field": "pain_points"
    },
    ...
  ]
}
```

**UI:**
```
A few quick questions about [Company Name]

Based on what you told us, we have a few questions to make sure
your improvement plan is relevant.

1. What's your biggest operational headache right now?
   ○ Keeping up during rush
   ○ Staff reliability
   ○ Food costs / waste
   ○ Something else: [________]

2. If you wanted to take a week off, what would happen?
   ○ I'd have to close
   ○ Staff could handle it
   ○ It would be rough but we'd survive
   ○ Something else: [________]

[Continue]
```

---

#### Step 1.3: Profile Generation
AI builds structured profile from description + answers.

**AI Prompt:**
```
Build a structured business profile from this information.

Original description:
"{business_description}"

Clarifying Q&A:
{questions_and_answers}

Industry: {industry}
Revenue: {revenue_range}

Return a complete profile JSON:
{
  "business_type": "fast-casual",
  "cuisine": "ramen/Japanese",
  "location_type": "urban",
  "seating_capacity": 10,
  "team": {
    "total": 3,
    "owner_working": true,
    "full_time": 0,
    "part_time": 2,
    "key_roles": ["owner-cook", "counter staff"]
  },
  "services": ["dine-in"],
  "hours": "lunch and dinner",
  "tech_stack": {
    "pos": "Square",
    "inventory": null,
    "scheduling": null,
    "delivery": null
  },
  "years_in_business": null,
  "pain_points": ["keeping up during rush"],
  "documentation_level": "minimal",
  "owner_dependency": "critical",
  "primary_goal": "serve more customers",
  "constraints": ["micro team", "owner-dependent", "no BOH/FOH separation"],
  "unique_factors": ["specialty cuisine", "small footprint"]
}
```

**Stored as:** `companies.business_profile` (JSONB)

---

### Phase 2: Initial Assessment (Existing Flow)

User completes the existing BRI assessment with 4 OPERATIONAL questions:
1. How scalable is your current business model?
2. What is the quality of your technology infrastructure?
3. How would you rate your employee retention?
4. Do you have formal vendor/supplier agreements?

These map to the 4 sub-categories and determine initial scores.

---

### Phase 3: Valuation Reveal (Existing Flow)

Shows value gap by category, including Operations breakdown:
- "Operations is costing you $24K"
- "Scalability: $8K | Technology: $6K | Vendors: $5K | Retention: $5K"

User clicks **"See Your Action Plan"** → Enters Phase 4

---

### Phase 4: Weekly Improvement Cycle

#### Step 4.1: Identify Focus Area
System determines which sub-category to address:

```javascript
// Priority: Lowest score first, then by display_order if tied
const subcategories = ['SCALABILITY', 'TECHNOLOGY', 'VENDOR', 'RETENTION'];

function getNextSubcategory(companyId) {
  const scores = getSubcategoryScores(companyId);
  const completed = getCompletedSubcategories(companyId);

  const remaining = subcategories
    .filter(s => !completed.includes(s))
    .sort((a, b) => scores[a] - scores[b]);

  return remaining[0];
}
```

---

#### Step 4.2: Generate Diagnostic Questions
AI generates 5 questions specific to their business and sub-category.

**AI Prompt:**
```
You are creating diagnostic questions for a specific business.

Business profile:
{profile_json}

Sub-category: {subcategory_name} (e.g., "Scalability")

Initial assessment answer: "{initial_answer}" (score: {score}/100)

Driver framework for this sub-category:
{drivers_list}

Generate exactly 5 multiple choice questions that:
1. Feel written specifically for THIS business (use their language)
2. Diagnose WHY they scored low in this area
3. Each question maps to one or more drivers
4. Have 5 answer options (A-E) ranging from worst to best
5. Include brief context explaining why this matters

Return JSON:
{
  "subcategory": "SCALABILITY",
  "questions": [
    {
      "id": "dq1",
      "question_text": "During lunch rush at [Company Name], what's the bottleneck - cooking the ramen, taking orders, or turning tables?",
      "context_text": "Identifying your specific constraint helps us focus on the right fix.",
      "options": [
        {
          "id": "a",
          "text": "Kitchen can't keep up - orders back up",
          "drivers": ["throughput_kitchen"],
          "severity": "high",
          "score_impact": 0
        },
        {
          "id": "b",
          "text": "Taking orders is slow, kitchen waits",
          "drivers": ["throughput_foh"],
          "severity": "high",
          "score_impact": 20
        },
        {
          "id": "c",
          "text": "Tables don't turn fast enough",
          "drivers": ["throughput_turnover"],
          "severity": "medium",
          "score_impact": 40
        },
        {
          "id": "d",
          "text": "It's a mix - depends on the day",
          "drivers": ["no_measurement"],
          "severity": "high",
          "score_impact": 20
        },
        {
          "id": "e",
          "text": "We handle rush fine, rarely backed up",
          "drivers": [],
          "severity": "low",
          "score_impact": 80
        }
      ]
    },
    ...
  ]
}
```

**UI: Diagnostic Questions Page**
```
Week 1: Understanding Your Scalability

Let's figure out what's limiting [Company Name]'s growth potential.
This takes about 5 minutes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question 1 of 5

During lunch rush, what's the bottleneck - cooking the ramen,
taking orders, or turning tables?

Understanding your specific constraint helps us focus on the right fix.

○ Kitchen can't keep up - orders back up
○ Taking orders is slow, kitchen waits
○ Tables don't turn fast enough
○ It's a mix - depends on the day
○ We handle rush fine, rarely backed up

[Back] [Next]
```

---

#### Step 4.3: Identify Drivers from Answers
After user completes 5 questions, system aggregates drivers:

```javascript
function identifyDrivers(responses) {
  const driverCounts = {};
  const highSeverityDrivers = [];

  for (const response of responses) {
    const option = response.selected_option;
    for (const driver of option.drivers) {
      driverCounts[driver] = (driverCounts[driver] || 0) + 1;
      if (option.severity === 'high') {
        highSeverityDrivers.push(driver);
      }
    }
  }

  // Return drivers sorted by: severity first, then frequency
  return sortDrivers(driverCounts, highSeverityDrivers);
}
```

---

#### Step 4.4: Generate Tasks
AI generates 3 tasks based on profile + identified drivers.

**AI Prompt:**
```
You are creating an action plan for a specific business.

Business profile:
{profile_json}

Sub-category: {subcategory_name}
Value at stake: {subcategory_value_gap} (e.g., "$6,000")

Drivers identified (in priority order):
1. {driver_1} - {description} (HIGH severity)
2. {driver_2} - {description} (HIGH severity)
3. {driver_3} - {description} (MEDIUM severity)

Generate exactly 3 tasks that:
1. Are specific to THIS business (10-seat ramen shop, 3 staff)
2. Address the top drivers identified
3. Are completable in 1-3 hours each
4. Have clear, measurable "done" definitions
5. Respect their constraints: {constraints}
6. Follow this order: Measure → Fix → Validate (if applicable)

For each task, provide:
- title: Action verb, specific to their business
- description: 1-2 sentences using their context
- done_definition: Objective, verifiable completion criteria
- benchmark_target: Appropriate for their business type/size
- delegate_to: Realistic for their team (be specific: "you" for owner-operator)
- estimated_effort: Time range
- improves_drivers: Array of driver IDs this addresses
- why_this_matters: One sentence connecting to value

Return JSON:
{
  "tasks": [
    {
      "id": "t1",
      "title": "Time 20 ramen orders during Friday lunch rush",
      "description": "Track from order placement to bowl served. Use your phone timer or a notepad by the register.",
      "done_definition": "List of 20 times with average calculated",
      "benchmark_target": "Fast-casual target: under 8 minutes",
      "delegate_to": "You (while your part-timer handles register)",
      "estimated_effort": "1-2 hours",
      "improves_drivers": ["throughput_kitchen", "no_measurement"],
      "why_this_matters": "You can't fix what you haven't measured. This tells us exactly where the slowdown happens."
    },
    ...
  ]
}
```

**UI: Action Plan Page**
```
Your Action Plan: Week 1

Focus: Scalability (worth $6,000 of your value gap)

Based on your answers, here's what's holding [Company Name] back
and what to do about it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THE DIAGNOSIS

Your main constraints are:
• Kitchen throughput - orders backing up during rush
• No measurement - hard to fix what you can't see

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THIS WEEK'S TASKS

□ Task 1: Time 20 ramen orders during Friday lunch rush
  Track from order placement to bowl served.
  Done when: List of 20 times with average calculated
  Target: Under 8 minutes per bowl
  Effort: 1-2 hours | Assigned to: You

□ Task 2: Identify your 2 slowest menu items
  Which ramen variations take longest to make? Ask yourself
  during a busy shift.
  Done when: Written list of 2 items with estimated time each
  Target: Know your bottleneck items
  Effort: 30 minutes | Assigned to: You

□ Task 3: Write down your ramen prep sequence
  Document the steps from raw ingredients to ready-to-serve
  components. Include timing.
  Done when: 1-page document exists
  Target: Any cook could follow it
  Effort: 1-2 hours | Assigned to: You

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Mark Task Complete] [Not Applicable to My Business]
```

---

#### Step 4.5: Task Completion Flow

**When user marks task complete:**
```
✓ Task 1 Complete

Nice work! Quick check - did you hit the benchmark?

○ Yes, we're under 8 minutes per bowl
○ No, we're over 8 minutes (that's okay - now you know!)
○ I learned something else: [________]

[Continue]
```

**When user marks "Not Applicable":**
```
Got it - this task doesn't fit your business.

Help us understand why so we can do better:

○ We don't have this problem
○ Already doing this
○ Not relevant to our setup
○ Other: [________]

[Continue]
```

---

#### Step 4.6: Re-Assessment After Tasks Complete

When all 3 tasks are Complete or N/A:

```
Week 1 Complete!

Let's see how things have improved. Answer the same 5 questions
based on where you are NOW.

[Start Re-Assessment]
```

User answers same 5 diagnostic questions. System calculates new score.

**Results Screen:**
```
Scalability Progress

Before: 15/100
After: 38/100
Improvement: +23 points

Value Unlocked: ~$1,400 of your $6,000 scalability gap

What changed:
• You now measure ticket times (was: no measurement)
• You identified your bottleneck items (was: unknown)
• You documented your prep process (was: nothing written)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready for Week 2?

Next up: Technology Infrastructure (worth $6,000)
We'll look at your systems and find quick wins.

[Start Week 2] [Take a Break - Remind Me Monday]
```

---

#### Step 4.7: Handle All-N/A Edge Case

If user marks all 3 tasks as N/A:

```
These tasks didn't fit [Company Name].

No problem - let's move to an area where we can make progress.

Next: Technology Infrastructure (worth $6,000)

[Start Technology Diagnostic]
```

System logs the N/A feedback for improving future task generation.

---

## Driver Framework (Fixed Reference)

The AI generates content, but everything maps to these fixed drivers:

### Scalability Drivers
| ID | Name | Description |
|----|------|-------------|
| `throughput_kitchen` | Kitchen Bottleneck | BOH can't keep pace |
| `throughput_foh` | FOH Bottleneck | Service/order taking slow |
| `throughput_capacity` | Physical Capacity | Space limits customers |
| `throughput_turnover` | Slow Turns | Tables occupied too long |
| `labor_linear` | Linear Labor | Growth requires proportional hiring |
| `labor_step` | Step Labor | Periodic hiring for growth |
| `no_sops` | No SOPs | Nothing documented |
| `partial_sops` | Partial SOPs | Some docs, gaps remain |
| `sops_not_enforced` | SOPs Ignored | Docs exist, not used |
| `menu_complex` | Menu Complexity | Too many items |
| `growth_hours` | Hours Growth | Grow by adding hours |
| `growth_headcount` | Headcount Growth | Grow by adding staff |
| `no_measurement` | No Metrics | Can't see the problem |

### Technology Drivers
| ID | Name | Description |
|----|------|-------------|
| `pos_manual` | Manual POS | Cash register / paper |
| `pos_legacy` | Legacy POS | Unsupported system |
| `pos_limited` | Limited POS | Basic, poor reporting |
| `inventory_none` | No Inventory | No tracking |
| `inventory_manual` | Manual Inventory | Paper-based |
| `online_tablet_chaos` | Tablet Chaos | Multiple delivery tablets |
| `online_manual_entry` | Manual Entry | Re-keying orders |
| `reporting_none` | No Reports | No visibility |
| `reporting_manual` | Manual Reports | Hand-compiled |
| `integration_none` | No Integration | Systems disconnected |
| `no_measurement` | Unknown State | Don't know current tech |

### Vendor Drivers
| ID | Name | Description |
|----|------|-------------|
| `food_no_contract` | No Food Contract | No written agreement |
| `food_verbal` | Verbal Agreement | No legal protection |
| `beverage_informal` | Informal Beverage | No documented deal |
| `equipment_reactive` | Reactive Maintenance | Fix when broken |
| `equipment_informal` | Informal Maintenance | No SLA |
| `lease_short` | Short Lease | Under 2 years |
| `lease_no_transfer` | No Transfer | Can't transfer lease |
| `pricing_exposed` | Market Pricing | No price protection |
| `no_measurement` | Unknown Contracts | Don't know terms |

### Retention Drivers
| ID | Name | Description |
|----|------|-------------|
| `pay_not_competitive` | Non-Competitive Pay | Losing to competitors |
| `pay_below_market` | Below Market | Can't attract talent |
| `schedule_issues` | Schedule Issues | Work-life problems |
| `culture_issues` | Culture Issues | Toxic/dysfunctional |
| `no_advancement` | No Career Path | Dead-end jobs |
| `training_none` | No Training | Sink or swim |
| `training_shadow_only` | Shadow Only | Inconsistent |
| `key_person_critical` | Critical Key Person | Can't operate without one person |
| `key_person_high` | High Key Person | Major disruption risk |
| `feedback_none` | No Feedback | Employees unheard |
| `no_measurement` | No Exit Data | Don't know why people leave |

---

## Database Schema

```sql
-- Extend companies table
ALTER TABLE companies ADD COLUMN business_description TEXT;
ALTER TABLE companies ADD COLUMN business_profile JSONB;
ALTER TABLE companies ADD COLUMN profile_questions_answered JSONB;

-- Store AI-generated diagnostic questions per company/subcategory
CREATE TABLE company_diagnostic_questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  subcategory TEXT NOT NULL,  -- 'SCALABILITY', 'TECHNOLOGY', etc.
  questions JSONB NOT NULL,   -- Array of generated questions
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, subcategory)
);

-- Store user's diagnostic responses
CREATE TABLE company_diagnostic_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  question_set_id TEXT REFERENCES company_diagnostic_questions(id),
  subcategory TEXT NOT NULL,
  responses JSONB NOT NULL,   -- Array of {question_id, selected_option_id, drivers[], severity}
  identified_drivers JSONB,   -- Aggregated drivers with severity
  score_before INT,
  score_after INT,
  is_reassessment BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Store AI-generated tasks per company
CREATE TABLE company_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  subcategory TEXT NOT NULL,
  week_number INT NOT NULL,

  -- AI-generated content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  done_definition TEXT NOT NULL,
  benchmark_target TEXT,
  delegate_to TEXT,
  estimated_effort TEXT,
  why_this_matters TEXT,
  improves_drivers TEXT[],

  -- Status tracking
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'not_applicable')) DEFAULT 'not_started',
  completed_at TIMESTAMP,
  completion_notes TEXT,
  na_reason TEXT,

  -- Metadata
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track weekly progress
CREATE TABLE company_weekly_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  subcategory TEXT NOT NULL,

  -- Timestamps
  diagnostic_started_at TIMESTAMP,
  diagnostic_completed_at TIMESTAMP,
  tasks_generated_at TIMESTAMP,
  tasks_completed_at TIMESTAMP,
  reassessment_completed_at TIMESTAMP,

  -- Scores
  score_before INT,
  score_after INT,
  value_unlocked DECIMAL(10,2),

  -- Status
  status TEXT CHECK (status IN ('diagnostic', 'tasks', 'reassessment', 'completed', 'skipped')) DEFAULT 'diagnostic',

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, week_number)
);

-- Log AI generations for debugging/improvement
CREATE TABLE ai_generation_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL,  -- 'clarifying_questions', 'profile', 'diagnostic_questions', 'tasks'
  input_data JSONB,
  output_data JSONB,
  model_used TEXT,
  tokens_used INT,
  latency_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### POST /api/profile/clarifying-questions
Generate clarifying questions based on business description.

**Request:**
```json
{
  "company_id": "xxx",
  "business_description": "10-seat ramen shop...",
  "industry": "restaurant",
  "revenue_range": "500k-1m"
}
```

**Response:**
```json
{
  "already_known": { "team_size": 3, ... },
  "questions": [ ... ]
}
```

### POST /api/profile/generate
Build business profile from description + answers.

**Request:**
```json
{
  "company_id": "xxx",
  "business_description": "...",
  "clarifying_answers": { "q1": "a", "q2": "c", ... }
}
```

**Response:**
```json
{
  "profile": { ... }
}
```

### POST /api/diagnostic/generate-questions
Generate diagnostic questions for a subcategory.

**Request:**
```json
{
  "company_id": "xxx",
  "subcategory": "SCALABILITY"
}
```

**Response:**
```json
{
  "question_set_id": "xxx",
  "questions": [ ... ]
}
```

### POST /api/diagnostic/submit
Submit diagnostic answers, identify drivers.

**Request:**
```json
{
  "company_id": "xxx",
  "question_set_id": "xxx",
  "responses": [
    { "question_id": "dq1", "selected_option_id": "a" },
    ...
  ]
}
```

**Response:**
```json
{
  "drivers": [
    { "id": "throughput_kitchen", "severity": "high", "count": 2 },
    ...
  ],
  "score": 35
}
```

### POST /api/tasks/generate
Generate tasks based on drivers.

**Request:**
```json
{
  "company_id": "xxx",
  "subcategory": "SCALABILITY",
  "drivers": ["throughput_kitchen", "no_measurement", "no_sops"]
}
```

**Response:**
```json
{
  "tasks": [ ... ]
}
```

### PATCH /api/tasks/:id/complete
Mark task complete.

**Request:**
```json
{
  "status": "completed",
  "hit_benchmark": true,
  "notes": "Average was 7 minutes"
}
```

### PATCH /api/tasks/:id/not-applicable
Mark task N/A.

**Request:**
```json
{
  "status": "not_applicable",
  "reason": "already_doing_this"
}
```

---

## UI Components Needed

### New Components

1. **BusinessDescriptionStep** - Onboarding step for free-text description
2. **ClarifyingQuestionsStep** - Display AI-generated clarifying questions
3. **ActionPlanPage** - Main dashboard showing current week's focus
4. **DiagnosticQuestionsFlow** - 5-question stepper for sub-category
5. **TaskCard** - Individual task with complete/N/A actions
6. **ProgressSummary** - Before/after score comparison
7. **WeekTransition** - Celebrate completion, intro next week

### Modified Components

1. **OnboardingFlow** - Add description + clarifying questions steps
2. **ValuationRevealStep** - Update CTA to go to Action Plan
3. **DashboardContent** - Add Action Plan entry point

---

## Implementation Order

### Phase 1: Profile Collection (Week 1)
1. Add `business_description` field to companies table
2. Create BusinessDescriptionStep component
3. Build `/api/profile/clarifying-questions` endpoint
4. Create ClarifyingQuestionsStep component
5. Build `/api/profile/generate` endpoint
6. Store profile in companies.business_profile

### Phase 2: Diagnostic Generation (Week 2)
1. Create company_diagnostic_questions table
2. Build `/api/diagnostic/generate-questions` endpoint
3. Create DiagnosticQuestionsFlow component
4. Create company_diagnostic_responses table
5. Build `/api/diagnostic/submit` endpoint
6. Implement driver identification logic

### Phase 3: Task Generation (Week 3)
1. Create company_tasks table
2. Build `/api/tasks/generate` endpoint
3. Create ActionPlanPage and TaskCard components
4. Build complete/N/A endpoints
5. Implement weekly progress tracking

### Phase 4: Re-Assessment Loop (Week 4)
1. Build re-assessment flow (same questions, new answers)
2. Create ProgressSummary component
3. Build WeekTransition component
4. Implement next-subcategory logic
5. Handle all-N/A edge case

### Phase 5: Polish (Week 5)
1. Add AI generation logging
2. Implement feedback collection
3. Add email reminders for incomplete weeks
4. Dashboard integration
5. Testing and refinement

---

## Cost Estimation

| Operation | Model | Est. Tokens | Cost/Call | Frequency |
|-----------|-------|-------------|-----------|-----------|
| Clarifying questions | GPT-4o-mini | ~500 | $0.001 | 1x per user |
| Profile generation | GPT-4o-mini | ~800 | $0.002 | 1x per user |
| Diagnostic questions | GPT-4o | ~1500 | $0.02 | 4x per user (one per subcategory) |
| Task generation | GPT-4o | ~1200 | $0.015 | 4x per user |

**Total per user:** ~$0.14 for complete 4-week cycle

---

## Success Metrics

1. **Completion rate** - % of users who finish Week 1
2. **Task completion rate** - % of tasks marked complete (not N/A)
3. **Score improvement** - Average points gained per subcategory
4. **N/A rate** - % of tasks marked not applicable (should decrease over time)
5. **Return rate** - % of users who start Week 2 after completing Week 1
6. **Value unlocked** - Total $ of value gap closed across all users
