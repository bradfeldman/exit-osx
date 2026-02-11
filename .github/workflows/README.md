# CI/CD Pipeline Documentation

This directory contains GitHub Actions workflows for automated testing and deployment of Exit OSx.

## Workflows

### 1. CI Pipeline (`ci.yml`)

Runs on every pull request to `main` and on direct pushes to `main`.

**Jobs:**
- **Lint & Type Check** (~20s): ESLint + TypeScript validation
- **Unit Tests** (~30s): Vitest with coverage reporting
- **Security Checks** (~45s): npm audit, secret scanning, CSP validation
- **Build** (~1-2 min): Next.js build with bundle size analysis
- **E2E Tests** (~3-5 min): Playwright tests against Vercel preview deployment
- **Visual Regression** (~2 min): Screenshot comparison tests

**Required Status Check:** `ci-success` job must pass before PR merge.

### 2. Nightly Tests (`nightly.yml`)

Runs daily at 2 AM UTC (9 PM EST / 6 PM PST) and can be manually triggered.

**Jobs:**
- **Load Testing**: k6 smoke tests against staging
- **Security Audit**: Full dependency vulnerability scan
- **Performance Tracking**: Lighthouse metrics for trend analysis
- **Weekly Full E2E** (Sundays only): Complete test suite across all browsers

**Notifications:** Automatically creates GitHub issues when nightly tests fail.

## Required GitHub Secrets

Configure these secrets in repository settings: `Settings > Secrets and variables > Actions`

### Essential Secrets

| Secret Name | Description | Used By |
|------------|-------------|---------|
| `TEST_USER_EMAIL` | Email for test account login | E2E tests |
| `TEST_USER_PASSWORD` | Password for test account | E2E tests |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel deployment protection bypass token | E2E tests |
| `K6_AUTH_TOKEN` | Authentication token for k6 load tests | Nightly load tests |

### Build-Time Secrets (Optional for full builds)

| Secret Name | Description | Used By |
|------------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Build process |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Build process |
| `DATABASE_URL` | Postgres connection string (pooler) | Build process |
| `DIRECT_URL` | Postgres direct connection string | Build process |

**Note:** The CI pipeline uses dummy values for build-time secrets to validate builds without requiring real credentials. Full integration requires real secrets.

### Setting Vercel Automation Bypass Secret

1. Go to your Vercel project settings
2. Navigate to "Deployment Protection"
3. Generate an automation bypass secret
4. Add it to GitHub secrets as `VERCEL_AUTOMATION_BYPASS_SECRET`

## Branch Protection Configuration

Recommended branch protection rules for `main`:

1. **Require status checks to pass:**
   - `CI Pipeline Success` (from ci.yml)

2. **Require branches to be up to date before merging:** ✅

3. **Require pull request reviews:** ✅ (1+ approvals recommended)

4. **Dismiss stale pull request approvals when new commits are pushed:** ✅

5. **Require conversation resolution before merging:** ✅

6. **Do not require status checks for administrators:** ❌ (apply to all)

## Helper Scripts

Located in `scripts/ci/`:

### `validate-csp.js`
Validates Content Security Policy configuration in `next.config.ts`.

**Checks:**
- Required CSP directives (default-src, script-src, etc.)
- Security headers (HSTS, X-Frame-Options, etc.)
- HSTS max-age threshold (minimum 1 year)
- Unsafe CSP practices (unsafe-inline, unsafe-eval)

**Usage:**
```bash
node scripts/ci/validate-csp.js
```

### `check-bundle-size.js`
Analyzes Next.js build output and warns about large bundles.

**Thresholds:**
- Individual page bundles: 500 KB
- Shared chunks: 200 KB
- Total initial load: 1000 KB

**Usage:**
```bash
npm run build
node scripts/ci/check-bundle-size.js
```

### `extract-perf-metrics.js`
Extracts performance metrics from Playwright test results for trend tracking.

**Generates:**
- JSON summary of performance metrics
- Statistics (min, max, median, mean, p95)
- Page load times and API response times

**Usage:**
```bash
npm run test:perf
node scripts/ci/extract-perf-metrics.js
```

## Local Testing

### Run CI checks locally before pushing:

```bash
# Lint and type check
npm run lint
npx tsc --noEmit

# Unit tests with coverage
npm run test:coverage

# Security audit
npm audit --audit-level=high

# Build
npm run build

# Check bundle size
node scripts/ci/check-bundle-size.js

# Validate CSP
node scripts/ci/validate-csp.js
```

### Run E2E tests locally:

```bash
# Against local dev server
npm run test:e2e:local

# Against staging
TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=yourpassword npm run test:e2e:staging
```

### Run load tests locally:

```bash
# Smoke test
npm run test:load:smoke

# Full load test
npm run test:load
```

## Troubleshooting

### E2E Tests Failing on CI

1. **Check Vercel preview deployment:**
   - Ensure Vercel GitHub integration is active
   - Verify `VERCEL_AUTOMATION_BYPASS_SECRET` is set correctly

2. **Authentication issues:**
   - Verify `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` secrets
   - Ensure test user exists in staging database
   - Check if test user has proper permissions

3. **Timeout issues:**
   - Review Playwright timeout configuration in `playwright.config.ts`
   - Check if staging environment is responding slowly

### Build Failures

1. **Missing environment variables:**
   - Build uses dummy values by default
   - Add real secrets only if build requires actual API connections

2. **Prisma generation errors:**
   - Ensure `DATABASE_URL` format is correct
   - Check Prisma schema syntax

### Security Check Failures

1. **npm audit failures:**
   - Review vulnerable dependencies
   - Update packages or add exceptions for false positives
   - Use `npm audit fix` for automated fixes

2. **Secret scanning false positives:**
   - Update patterns in `.github/workflows/ci.yml`
   - Ensure test fixtures don't contain real-looking secrets

## Performance Monitoring

Performance metrics are tracked in nightly runs and stored as artifacts:

- **Page Load Times**: Complete page load duration
- **API Response Times**: Backend endpoint latency
- **Lighthouse Scores**: Performance, accessibility, best practices, SEO
- **k6 Metrics**: Request rate, error rate, response time percentiles

**Viewing Trends:**
1. Go to Actions tab
2. Select "Nightly Tests & Checks" workflow
3. Download `performance-metrics` artifact
4. Compare `performance-metrics.json` across runs

## Cost Optimization

GitHub Actions minutes usage:

- **CI per PR:** ~15 minutes (lint, test, build, E2E)
- **Nightly runs:** ~30 minutes per night (~900 min/month)
- **Total estimate:** ~2000-3000 minutes/month

**Free tier:** 2000 minutes/month for private repos, unlimited for public repos.

## Manual Workflow Triggers

You can manually trigger workflows from the Actions tab:

1. Go to the Actions tab in GitHub
2. Select the workflow (CI Pipeline or Nightly Tests)
3. Click "Run workflow"
4. Select branch and click "Run workflow"

Useful for:
- Testing workflow changes
- Running nightly tests on-demand
- Re-running failed checks

## Contributing

When adding new tests or checks:

1. Update the relevant workflow YAML file
2. Add any helper scripts to `scripts/ci/`
3. Document required secrets in this README
4. Test locally before pushing
5. Update timeout values if needed

## Support

For issues with CI/CD:
- Check workflow run logs in Actions tab
- Review this documentation
- Check Playwright/k6 documentation for test-specific issues
- Verify all required secrets are configured
