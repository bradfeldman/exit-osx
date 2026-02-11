# Test Data Seeding for Automated Testing

This directory contains scripts for creating deterministic test data for automated testing (unit, integration, E2E, and load tests).

## Overview

The test data seed creates a canonical test user and company with known characteristics and expected outputs. This enables:

- **Deterministic E2E tests** that can run repeatedly with predictable results
- **Integration tests** that verify scoring, valuation, and task generation logic
- **Golden file tests** that validate report outputs and buyer-facing content
- **Load tests** that stress-test the system with realistic data

## Prerequisites

### 1. Environment Variables

Create or update `.env.local` with the following variables:

```bash
# Database - Use DIRECT_URL for DDL operations
DATABASE_URL="postgresql://postgres.your-project:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.your-project:password@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Test user credentials (must match Supabase Auth account)
TEST_USER_EMAIL=test@exitosx.com
TEST_USER_PASSWORD=TestPassword123!

# Supabase connection (for potential auth user creation)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Create Supabase Auth User

**CRITICAL:** Before running the seed script, you must manually create the test user in Supabase Auth:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **Authentication → Users**
3. Click **"Add user"** → **"Create new user"**
4. Enter:
   - **Email:** `test@exitosx.com` (or whatever you set in `TEST_USER_EMAIL`)
   - **Password:** `TestPassword123!` (or whatever you set in `TEST_USER_PASSWORD`)
5. **Important:** Confirm the user's email (toggle "Email Confirmed" to enabled)
6. Copy the user's UUID (you'll need this later)

### 3. Run Existing Seeds First

Ensure the database has the base seed data (questions, industry multiples, role templates):

```bash
npm run db:seed
```

## Usage

### Run the Test Data Seed

```bash
npm run test:seed
```

This script will:

1. ✅ Check for required environment variables
2. ✅ Find or create the test user in the database
3. ✅ Clean up any existing test data (idempotent)
4. ✅ Create a test organization
5. ✅ Create the canonical test company with deterministic data
6. ✅ Create a valuation snapshot with expected values

### Output

The script will output:

```
🌱 Starting test data seed...
📧 Test user email: test@exitosx.com

1️⃣  Finding test user in Supabase Auth...
✅ Found existing user: clz1abc123...

2️⃣  Cleaning up existing test data...
   Deleting organization: Test Organization (clz1def456...)

3️⃣  Creating test user...
✅ Created user: clz1abc123...

4️⃣  Creating test organization...
✅ Created organization: clz1def456...

5️⃣  Creating canonical test company...
✅ Created company: clz1ghi789...

6️⃣  Creating valuation snapshot...
✅ Created valuation snapshot: clz1jkl012...

✅ Test data seed completed successfully!

📊 Summary:
   User ID:         clz1abc123...
   User Email:      test@exitosx.com
   Organization ID: clz1def456...
   Company ID:      clz1ghi789...
   Snapshot ID:     clz1jkl012...

📈 Canonical Company Values:
   Annual Revenue:  $1,000,000
   Annual EBITDA:   $150,000
   BRI Score:       70.0%
   Core Score:      100.0%
   Base Multiple:   6.00x
   Final Multiple:  5.44x
   Current Value:   $816,600
   Potential Value: $900,000
   Value Gap:       $83,400

🧪 Ready for automated testing!
```

## Canonical Test Company

The seed creates a company named **"Test Co - Canonical"** with the following characteristics:

### Financial Profile
- **Revenue:** $1,000,000
- **EBITDA:** $150,000 (15% margin)
- **Owner Compensation:** $0

### Industry
- **Industry:** Technology → Software & Computer Services → Software
- **EBITDA Multiples:** 3.0x - 6.0x (typical for small SaaS)

### Core Factors (Optimal SaaS Business)
- **Revenue Model:** SUBSCRIPTION_SAAS (score: 1.0)
- **Gross Margin:** EXCELLENT (score: 1.0)
- **Labor Intensity:** LOW (score: 1.0)
- **Asset Intensity:** ASSET_LIGHT (score: 1.0)
- **Owner Involvement:** MINIMAL (score: 1.0)
- **Core Score:** 1.0 (100%)

### BRI Scores (70% across all categories)
- **Financial:** 70%
- **Transferability:** 70%
- **Operational:** 70%
- **Market:** 70%
- **Legal/Tax:** 70%
- **Personal:** 70%
- **Overall BRI:** 70%

### Expected Valuation (using canonical formula)

The valuation uses the **non-linear discount formula** with ALPHA=1.4:

```
1. baseMultiple = 3.0 + 1.0 × (6.0 - 3.0) = 6.0
2. discountFraction = (1 - 0.7)^1.4 = 0.3^1.4 ≈ 0.1853
3. finalMultiple = 3.0 + (6.0 - 3.0) × (1 - 0.1853) ≈ 5.44
4. currentValue = 150,000 × 5.44 ≈ $816,600
5. potentialValue = 150,000 × 6.0 = $900,000
6. valueGap = 900,000 - 816,600 ≈ $83,400
```

## Using Test Fixtures in Tests

### Import the Fixtures

```typescript
import {
  CANONICAL_COMPANY,
  EXPECTED_VALUATION,
  FOUNDER_DEPENDENT_COMPANY,
  HIGH_CONCENTRATION_COMPANY,
  PERFECT_SAAS_COMPANY,
  calculateExpectedValuation,
  assertValuationMatches,
} from '@/__tests__/fixtures/canonical-company'
```

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { calculateValuation } from '@/lib/valuation/calculate-valuation'
import { CANONICAL_COMPANY, EXPECTED_VALUATION } from '@/__tests__/fixtures/canonical-company'

describe('Valuation with Canonical Company', () => {
  it('should calculate correct valuation for canonical company', () => {
    const result = calculateValuation({
      adjustedEbitda: CANONICAL_COMPANY.annualEbitda,
      industryMultipleLow: CANONICAL_COMPANY.industryMultipleLow,
      industryMultipleHigh: CANONICAL_COMPANY.industryMultipleHigh,
      coreScore: 1.0,
      briScore: 0.70,
    })

    // Values should match within $100 tolerance
    expect(result.currentValue).toBeCloseTo(EXPECTED_VALUATION.currentValue, -2)
    expect(result.potentialValue).toBeCloseTo(EXPECTED_VALUATION.potentialValue, -2)
    expect(result.valueGap).toBeCloseTo(EXPECTED_VALUATION.valueGap, -2)

    // Multiples should match within 0.01 tolerance
    expect(result.baseMultiple).toBeCloseTo(EXPECTED_VALUATION.baseMultiple, 2)
    expect(result.finalMultiple).toBeCloseTo(EXPECTED_VALUATION.finalMultiple, 2)
    expect(result.discountFraction).toBeCloseTo(EXPECTED_VALUATION.discountFraction, 3)
  })
})
```

### Integration Test Example

```typescript
import { prisma } from '@/lib/prisma'
import { CANONICAL_COMPANY } from '@/__tests__/fixtures/canonical-company'

describe('Company Valuation Integration', () => {
  it('should create company with correct valuation snapshot', async () => {
    const company = await prisma.company.findFirst({
      where: { name: CANONICAL_COMPANY.name },
      include: {
        valuationSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    expect(company).toBeDefined()
    expect(company!.valuationSnapshots[0].currentValue).toBeCloseTo(816600, -2)
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'
import { CANONICAL_COMPANY, EXPECTED_VALUATION } from '@/__tests__/fixtures/canonical-company'

test('dashboard displays correct valuation', async ({ page }) => {
  await page.goto('/dashboard')

  // Wait for the dashboard to load
  await page.waitForSelector('h1')

  // Find the canonical company
  await page.getByText(CANONICAL_COMPANY.name).click()

  // Verify valuation display
  const currentValue = await page.getByTestId('current-value').textContent()
  expect(currentValue).toContain('$816,600') // or use regex for formatted numbers
})
```

## Alternative Test Scenarios

The fixtures file also includes alternative company profiles for edge case testing:

### 1. Founder-Dependent Company
- High owner involvement (CRITICAL)
- Low transferability and personal scores
- Tests key-person dependency scenarios

### 2. High Customer Concentration Company
- Low financial and market scores
- Tests customer concentration risk

### 3. Perfect SaaS Company
- $5M revenue, 25% EBITDA margin
- 100% BRI across all categories
- Tests maximum valuation scenario

Use these with `calculateExpectedValuation()`:

```typescript
import { FOUNDER_DEPENDENT_COMPANY, calculateExpectedValuation } from '@/__tests__/fixtures/canonical-company'

const expected = calculateExpectedValuation(FOUNDER_DEPENDENT_COMPANY)
// expected.coreScore = 0.8
// expected.briScore = ~0.48
// expected.currentValue will be significantly discounted
```

## Troubleshooting

### "TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required"
- Ensure `.env.local` contains both variables
- Restart your terminal/IDE to pick up new environment variables

### "User not found" or "Authentication failed"
- The test user must exist in Supabase Auth first
- Go to Supabase Dashboard → Authentication → Users and create the user manually
- Ensure email is confirmed

### "Unique constraint violation on auth_id"
- The seed script uses a deterministic auth_id based on the email
- If you need to match a real Supabase auth UUID, you'll need to modify the script to fetch it via Supabase Admin API

### Seed script creates data but E2E tests fail to authenticate
- The `authId` in the database User record must match the UUID in Supabase Auth
- You may need to update the seed script to use the Supabase Admin API to fetch/create the real auth UUID
- Alternatively, manually update the User.authId in the database to match the Supabase Auth UUID

## Advanced: Syncing with Supabase Auth

For production-grade test setup, you should extend the seed script to use Supabase Admin API:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Check if user exists in Supabase Auth
const { data: authUsers } = await supabase.auth.admin.listUsers()
let authUser = authUsers?.users.find(u => u.email === testUserEmail)

if (!authUser) {
  // Create user in Supabase Auth
  const { data, error } = await supabase.auth.admin.createUser({
    email: testUserEmail,
    password: testUserPassword,
    email_confirm: true,
  })
  if (error) throw error
  authUser = data.user
}

// Use the real auth UUID
const user = await prisma.user.create({
  data: {
    authId: authUser.id, // Real Supabase Auth UUID
    email: testUserEmail,
    name: 'Test User',
    userType: 'SUBSCRIBER',
  },
})
```

## Next Steps

1. ✅ Run `npm run test:seed` to create test data
2. ✅ Verify test user can log in via E2E auth setup
3. ✅ Run E2E tests: `npm run test:e2e`
4. ✅ Run unit tests with fixtures: `npm run test`
5. ✅ Build golden file tests for reports (PROD-009)

## Related Tasks

- **PROD-088:** E2E Test Coverage Expansion
- **PROD-089:** This task (test data seeding)
- **PROD-090:** Unit Test Coverage Expansion
- **PROD-092:** Security & RBAC Testing
- **PROD-093:** Load Testing Implementation
- **PROD-094:** Flaky Test Resolution
- **PROD-009:** Golden File Tests for Reports
