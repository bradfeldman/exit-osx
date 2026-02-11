# Quick Start: Test Data Seeding

## TL;DR

```bash
# 1. Add to .env.local
TEST_USER_EMAIL=test@exitosx.com
TEST_USER_PASSWORD=TestPassword123!

# 2. Create user in Supabase Dashboard
#    → Authentication → Users → Add user
#    → Use email/password above
#    → Confirm email

# 3. Run seed
npm run test:seed

# 4. Use in tests
import { CANONICAL_COMPANY, EXPECTED_VALUATION } from '@/__tests__/fixtures/canonical-company'
```

## What Gets Created

```
✅ User:         test@exitosx.com
✅ Organization: Test Organization (GROWTH plan)
✅ Company:      Test Co - Canonical
   - $1M revenue, $150k EBITDA
   - 70% BRI score
   - Optimal SaaS business model
✅ Snapshot:     $816,600 current value
```

## Canonical Company Values (memorize these)

| Metric | Value |
|--------|-------|
| Revenue | $1,000,000 |
| EBITDA | $150,000 (15%) |
| BRI Score | 70% |
| Core Score | 100% |
| Multiples | 3.0x - 6.0x |
| Current Value | **$816,600** |
| Potential Value | **$900,000** |
| Value Gap | **$83,400** |

## Test Fixtures Available

```typescript
// Main fixture
CANONICAL_COMPANY          // $1M SaaS, 70% BRI
EXPECTED_VALUATION         // Pre-calculated outputs

// Alternative scenarios
FOUNDER_DEPENDENT_COMPANY  // High owner dependency
HIGH_CONCENTRATION_COMPANY // Customer concentration risk
PERFECT_SAAS_COMPANY       // $5M, 100% BRI

// Helpers
calculateExpectedValuation(company)
assertValuationMatches(actual, expected)
```

## Common Test Patterns

### Unit Test
```typescript
it('should calculate valuation', () => {
  const result = calculateValuation({
    adjustedEbitda: 150000,
    industryMultipleLow: 3.0,
    industryMultipleHigh: 6.0,
    coreScore: 1.0,
    briScore: 0.70,
  })

  expect(result.currentValue).toBeCloseTo(816600, -2)
})
```

### Integration Test
```typescript
it('should load company with snapshot', async () => {
  const company = await prisma.company.findFirst({
    where: { name: 'Test Co - Canonical' },
    include: { valuationSnapshots: true },
  })

  expect(company!.valuationSnapshots[0].currentValue)
    .toBeCloseTo(816600, -2)
})
```

### E2E Test
```typescript
test('dashboard shows valuation', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByText('Test Co - Canonical').click()

  const value = await page.getByTestId('current-value').textContent()
  expect(value).toContain('$816,600')
})
```

## Gotchas

❌ **Don't use `toBe()` for BRI score** (floating-point precision)
```typescript
expect(result.briScore).toBe(0.70) // FAILS: 0.6999999999999998
```

✅ **Use `toBeCloseTo()` instead**
```typescript
expect(result.briScore).toBeCloseTo(0.70, 2) // PASSES
```

❌ **Don't forget to create Supabase Auth user first**
```bash
npm run test:seed
# ERROR: User not found in Supabase Auth
```

✅ **Create manually in dashboard, then seed**
```bash
# 1. Create in dashboard
# 2. npm run test:seed
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| "TEST_USER_EMAIL required" | Add to `.env.local` |
| "Authentication failed" | Create user in Supabase Dashboard |
| "Unique constraint on auth_id" | Delete existing user or use different email |
| E2E tests fail to login | Verify authId matches Supabase UUID |

## Files

```
scripts/seed-test-data.ts              # Seed script
scripts/README-test-data.md            # Full documentation
src/__tests__/fixtures/canonical-company.ts
src/__tests__/fixtures/canonical-company.test.ts
```

## Next Steps

1. ✅ Run `npm run test:seed`
2. ✅ Run `npm run test:run src/__tests__/fixtures/canonical-company.test.ts`
3. ✅ Use fixtures in your tests
4. 📋 Add assessment responses (PROD-090)
5. 📋 Add action plan tasks (PROD-090)
6. 📋 Create golden file tests (PROD-009)
