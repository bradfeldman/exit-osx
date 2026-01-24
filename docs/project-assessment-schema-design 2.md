# Project Assessment System - Schema Design

## Overview

This document outlines the database schema additions needed to support Project Assessments - the detailed 8-15 question assessments that refine BRI scores and generate targeted action plans.

## Assessment Hierarchy

```
┌─────────────────────────────────────┐
│  Onboarding Core Score Assessment   │  → CoreFactors (existing)
│  (Company profile)                  │  → Core Score
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Initial BRI Assessment             │  → Question/QuestionOption (existing)
│  (~24 questions)                    │  → Assessment/AssessmentResponse (existing)
│                                     │  → Initial BRI Score + Market Value
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Project Assessment #1              │  → ProjectQuestion/ProjectQuestionOption (NEW)
│  (8-15 prioritized questions)       │  → ProjectAssessment/ProjectAssessmentResponse (NEW)
│                                     │  → Refined BRI + 30-90 Day Action Plan
└─────────────────────────────────────┘
                 ↓
        ... continuous cycle ...
```

## New Models

### 1. ProjectQuestion

Stores the 596 detailed questions from JSON modules. Separate from Initial BRI questions.

```prisma
model ProjectQuestion {
  id                String   @id @default(cuid())
  moduleId          String   @unique @map("module_id")  // e.g., "MOD-FN-RS-001"
  questionId        String   @unique @map("question_id") // e.g., "Q-FN-RS-001"

  // Question content
  questionText      String   @map("question_text")
  briCategory       BriCategory @map("bri_category")
  subCategory       String   @map("sub_category")       // e.g., "Revenue Stability"

  // Impact scoring (for prioritization)
  questionImpact    QuestionImpact @map("question_impact") // CRITICAL, HIGH, MEDIUM, LOW
  buyerSensitivity  BuyerSensitivity @map("buyer_sensitivity")

  // Help content
  definitionNote    String?  @map("definition_note")
  helpText          String?  @map("help_text")
  riskDefinition    String?  @map("risk_definition")
  primaryValueLever String?  @map("primary_value_lever")

  // Metadata
  relatedQuestionIds String[] @map("related_question_ids")
  relatedModules     String[] @map("related_modules")
  isActive          Boolean  @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relations
  options           ProjectQuestionOption[]
  strategies        ProjectStrategy[]
  responses         ProjectAssessmentResponse[]
  companyPriorities CompanyQuestionPriority[]

  @@index([briCategory, questionImpact])
  @@map("project_questions")
}
```

### 2. ProjectQuestionOption

Options for Project Questions with score values.

```prisma
model ProjectQuestionOption {
  id              String   @id @default(cuid())
  questionId      String   @map("question_id")
  optionId        String   @map("option_id")  // A, B, C, D
  optionText      String   @map("option_text")
  scoreValue      Decimal  @map("score_value") @db.Decimal(3, 2) // 0.00, 0.35, 0.70, 1.00
  buyerInterpretation String? @map("buyer_interpretation")
  displayOrder    Int      @map("display_order")

  question        ProjectQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  selectedResponses ProjectAssessmentResponse[] @relation("SelectedProjectOption")
  effectiveResponses ProjectAssessmentResponse[] @relation("EffectiveProjectOption")
  tasksUpgradingFrom ProjectTaskTemplate[] @relation("ProjectTaskUpgradeFrom")
  tasksUpgradingTo   ProjectTaskTemplate[] @relation("ProjectTaskUpgradeTo")

  @@unique([questionId, optionId])
  @@map("project_question_options")
}
```

### 3. ProjectStrategy

Strategies for improving scores (from JSON modules).

```prisma
model ProjectStrategy {
  id                  String   @id @default(cuid())
  questionId          String   @map("question_id")
  strategyId          String   @map("strategy_id")  // STRAT-A, STRAT-B, STRAT-C
  strategyName        String   @map("strategy_name")
  strategyDescription String?  @map("strategy_description")
  strategyType        StrategyType @map("strategy_type") // FULL_FIX, PARTIAL_MITIGATION, RISK_ACCEPTANCE

  upgradeFromScore    Decimal  @map("upgrade_from_score") @db.Decimal(3, 2)
  maxScoreAchievable  Decimal  @map("max_score_achievable") @db.Decimal(3, 2)
  estimatedEffort     String   @map("estimated_effort")
  estimatedTimeline   String?  @map("estimated_timeline")
  applicableWhen      String?  @map("applicable_when")

  question            ProjectQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  taskTemplates       ProjectTaskTemplate[]

  @@unique([questionId, strategyId])
  @@map("project_strategies")
}
```

### 4. ProjectTaskTemplate

Task templates within strategies.

```prisma
model ProjectTaskTemplate {
  id                   String   @id @default(cuid())
  strategyId           String   @map("strategy_id")
  taskId               String   @map("task_id")  // TASK-A-001, etc.
  sequence             Int

  // Task content
  title                String
  primaryVerb          String   @map("primary_verb")
  verbTier             Int      @map("verb_tier")
  object               String
  outcome              String?

  // Assignment
  ownerRole            OwnerRole @map("owner_role")
  timebox              Timebox

  // Effort
  effortLevel          EffortLevel @map("effort_level")
  complexity           ComplexityLevel
  estimatedHours       Int?     @map("estimated_hours")

  // Deliverables
  deliverables         String[]
  evidence             String[]
  riskCategory         BriCategory @map("risk_category")

  // Dependencies
  dependencies         String[]
  blockedBy            String[] @map("blocked_by")

  // Answer Upgrade System
  upgradesFromScore    Decimal? @map("upgrades_from_score") @db.Decimal(3, 2)
  upgradesScoreTo      Decimal? @map("upgrades_score_to") @db.Decimal(3, 2)
  upgradesFromOptionId String?  @map("upgrades_from_option_id")
  upgradesToOptionId   String?  @map("upgrades_to_option_id")

  // Deferral fields (for COMMIT tasks)
  deferReasonCode      String?  @map("defer_reason_code")
  companionVerbs       String[] @map("companion_verbs")
  reEvaluationDate     String?  @map("re_evaluation_date")
  valueImpactState     String?  @map("value_impact_state")
  mitigationSummary    String?  @map("mitigation_summary")

  strategy             ProjectStrategy @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  upgradesFromOption   ProjectQuestionOption? @relation("ProjectTaskUpgradeFrom", fields: [upgradesFromOptionId], references: [id])
  upgradesToOption     ProjectQuestionOption? @relation("ProjectTaskUpgradeTo", fields: [upgradesToOptionId], references: [id])

  @@unique([strategyId, taskId])
  @@map("project_task_templates")
}
```

### 5. ProjectAssessment

An instance of a Project Assessment (8-15 questions).

```prisma
model ProjectAssessment {
  id              String   @id @default(cuid())
  companyId       String   @map("company_id")
  assessmentNumber Int     @map("assessment_number")  // 1, 2, 3, etc.

  // Focus area (primary category for this assessment)
  primaryCategory BriCategory? @map("primary_category")

  // Status
  status          ProjectAssessmentStatus @default(IN_PROGRESS)
  startedAt       DateTime @default(now()) @map("started_at")
  completedAt     DateTime? @map("completed_at")

  // Score tracking
  briScoreBefore  Decimal? @map("bri_score_before") @db.Decimal(5, 4)
  briScoreAfter   Decimal? @map("bri_score_after") @db.Decimal(5, 4)
  scoreImpact     Decimal? @map("score_impact") @db.Decimal(5, 4) // Can be positive or negative

  // Action plan generated
  actionPlanGenerated Boolean @default(false) @map("action_plan_generated")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  company         Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  responses       ProjectAssessmentResponse[]
  questions       ProjectAssessmentQuestion[]  // The selected questions for this assessment

  @@unique([companyId, assessmentNumber])
  @@index([companyId, status])
  @@map("project_assessments")
}
```

### 6. ProjectAssessmentQuestion

Links questions to a specific Project Assessment instance.

```prisma
model ProjectAssessmentQuestion {
  id                String   @id @default(cuid())
  assessmentId      String   @map("assessment_id")
  questionId        String   @map("question_id")
  displayOrder      Int      @map("display_order")

  // Why this question was selected
  selectionReason   String?  @map("selection_reason")  // "High impact", "Category gap", etc.
  priorityScore     Decimal  @map("priority_score") @db.Decimal(5, 2)

  assessment        ProjectAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  question          ProjectQuestion @relation(fields: [questionId], references: [id])

  @@unique([assessmentId, questionId])
  @@map("project_assessment_questions")
}
```

### 7. ProjectAssessmentResponse

User's answer to a Project Assessment question.

```prisma
model ProjectAssessmentResponse {
  id                  String   @id @default(cuid())
  assessmentId        String   @map("assessment_id")
  questionId          String   @map("question_id")
  selectedOptionId    String   @map("selected_option_id")
  effectiveOptionId   String?  @map("effective_option_id")  // Updated by task completion

  // Score impact tracking
  estimatedScore      Decimal? @map("estimated_score") @db.Decimal(3, 2)  // What system expected
  actualScore         Decimal  @map("actual_score") @db.Decimal(3, 2)     // What user selected
  scoreImpact         Decimal? @map("score_impact") @db.Decimal(4, 3)     // Difference (can be negative)

  // Confidence and notes
  confidenceLevel     ConfidenceLevel @map("confidence_level")
  notes               String?
  evidenceUrls        String[] @map("evidence_urls")

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  assessment          ProjectAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  question            ProjectQuestion @relation(fields: [questionId], references: [id])
  selectedOption      ProjectQuestionOption @relation("SelectedProjectOption", fields: [selectedOptionId], references: [id])
  effectiveOption     ProjectQuestionOption? @relation("EffectiveProjectOption", fields: [effectiveOptionId], references: [id])

  @@unique([assessmentId, questionId])
  @@map("project_assessment_responses")
}
```

### 8. CompanyQuestionPriority

Tracks priority scores for questions per company (for the prioritization engine).

```prisma
model CompanyQuestionPriority {
  id              String   @id @default(cuid())
  companyId       String   @map("company_id")
  questionId      String   @map("question_id")

  // Priority factors
  impactScore     Decimal  @map("impact_score") @db.Decimal(5, 2)     // Base impact from question
  relevanceScore  Decimal  @map("relevance_score") @db.Decimal(5, 2)  // Relevance to company's weak areas
  urgencyScore    Decimal  @map("urgency_score") @db.Decimal(5, 2)    // Time-sensitivity

  // Combined priority
  priorityScore   Decimal  @map("priority_score") @db.Decimal(5, 2)   // Weighted combination

  // Status
  hasBeenAsked    Boolean  @default(false) @map("has_been_asked")
  askedAt         DateTime? @map("asked_at")

  updatedAt       DateTime @updatedAt @map("updated_at")

  company         Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  question        ProjectQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([companyId, questionId])
  @@index([companyId, priorityScore])
  @@map("company_question_priorities")
}
```

## New Enums

```prisma
enum QuestionImpact {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum BuyerSensitivity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum StrategyType {
  FULL_FIX
  PARTIAL_MITIGATION
  RISK_ACCEPTANCE
}

enum OwnerRole {
  FOUNDER
  CFO_FINANCE
  OPS_LEADER
  SALES_MKTG
  HR_PEOPLE
  LEGAL_COMPLIANCE
  IT_SECURITY
  ADVISOR
}

enum Timebox {
  IMMEDIATE_0_30
  NEAR_30_90
  LONG_90_365
}

enum ProjectAssessmentStatus {
  IN_PROGRESS
  COMPLETED
  ABANDONED
}
```

## Model Updates

### Company (add relation)

```prisma
model Company {
  // ... existing fields ...

  projectAssessments    ProjectAssessment[]
  questionPriorities    CompanyQuestionPriority[]
}
```

## Question Prioritization Algorithm

The prioritization engine will calculate `priorityScore` for each unasked question:

```
priorityScore = (impactWeight × impactScore)
              + (relevanceWeight × relevanceScore)
              + (urgencyWeight × urgencyScore)
              + (categoryBalanceBonus)

Where:
- impactScore: Based on questionImpact (CRITICAL=100, HIGH=75, MEDIUM=50, LOW=25)
- relevanceScore: Higher if company's BRI is weak in this category
- urgencyScore: Higher for questions with time-sensitive implications
- categoryBalanceBonus: Bonus for underrepresented categories in assessment
```

## BRI Refinement Flow

1. **Before Project Assessment:**
   - Record current BRI score as `briScoreBefore`
   - For each question, estimate expected score based on Initial BRI

2. **During Response:**
   - Calculate `scoreImpact = actualScore - estimatedScore`
   - Store on response record

3. **On Assessment Completion:**
   - Recalculate full BRI incorporating Project Assessment responses
   - Record as `briScoreAfter`
   - Calculate overall `scoreImpact = briScoreAfter - briScoreBefore`
   - Generate feedback for user

4. **Feedback Example:**
   > "Based on your responses, your BRI score changed from 0.62 to 0.58 (-0.04).
   > Key factors:
   > - Revenue concentration higher than expected (-0.02)
   > - Documentation better than expected (+0.01)
   > - Vendor dependency is a new risk area (-0.03)"

## Next Steps

1. Add Prisma schema changes
2. Create migration
3. Import 596 JSON modules into ProjectQuestion tables
4. Build prioritization engine
5. Create API routes for Project Assessments
6. Update BRI calculation to incorporate Project Assessment responses
