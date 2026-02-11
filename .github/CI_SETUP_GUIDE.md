# CI/CD Pipeline Setup Guide

This guide will walk you through setting up the complete CI/CD pipeline for Exit OSx.

## Prerequisites

- GitHub repository with admin access
- Vercel account with the project deployed
- Test user account on staging environment
- k6 installed locally (for load testing validation)

## Step 1: Configure GitHub Secrets

Navigate to your repository settings: `Settings > Secrets and variables > Actions`

### Create Repository Secrets

Click "New repository secret" and add each of the following:

#### Required for E2E Tests

**TEST_USER_EMAIL**
```
Email address of your test user account
Example: test@exitosx.com
```

**TEST_USER_PASSWORD**
```
Password for your test user account
Note: Use a strong, unique password. This user should have standard permissions.
```

**VERCEL_AUTOMATION_BYPASS_SECRET**

How to get this:
1. Go to Vercel project settings
2. Navigate to "Deployment Protection"
3. Scroll to "Automation Bypass for Deployment Protection"
4. Click "Generate Secret"
5. Copy the secret value

```
Example: auto_xxxxxxxxxxxxxxxxxxxxxxxx
```

#### Required for Load Testing

**K6_AUTH_TOKEN**

How to generate:
1. Log into your staging environment
2. Open browser DevTools > Application > Cookies
3. Copy the value of your auth token cookie
4. Alternatively, make an API call and extract the Bearer token

```
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Optional Build Secrets

These are only needed if you want the CI build to connect to real services. The CI pipeline uses dummy values by default.

**NEXT_PUBLIC_SUPABASE_URL**
```
Your Supabase project URL
Example: https://yourproject.supabase.co
```

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
Your Supabase anonymous key (public key, safe to expose)
```

**DATABASE_URL**
```
Postgres connection string with pooler (port 6543)
Example: postgresql://user:pass@host:6543/db?pgbouncer=true
```

**DIRECT_URL**
```
Postgres direct connection string (port 5432)
Example: postgresql://user:pass@host:5432/db
```

## Step 2: Create Test User

If you don't already have a test user:

1. **On staging environment:**
   ```bash
   # Connect to staging database
   psql "YOUR_STAGING_DATABASE_URL"
   ```

2. **Create test user via signup flow:**
   - Navigate to `https://staging.exitosx.com/signup`
   - Register with email: `test@exitosx.com` (or your preferred email)
   - Complete onboarding
   - Create at least one test company

3. **Verify test user:**
   ```bash
   # Test login manually
   curl -X POST https://staging.exitosx.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@exitosx.com","password":"yourpassword"}'
   ```

## Step 3: Enable GitHub Actions

1. Go to `Settings > Actions > General`
2. Under "Actions permissions", select:
   - ✅ "Allow all actions and reusable workflows"
3. Under "Workflow permissions", select:
   - ✅ "Read and write permissions"
   - ✅ "Allow GitHub Actions to create and approve pull requests"
4. Click "Save"

## Step 4: Configure Branch Protection

Navigate to `Settings > Branches > Branch protection rules`

### Add Rule for `main` Branch

**Branch name pattern:** `main`

#### Required Settings

**Protect matching branches:**
- ✅ Require a pull request before merging
  - Required approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - **Add required status checks:**
    - `CI Pipeline Success`
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings (apply to administrators)

#### Optional Settings

- ✅ Require linear history (if you prefer no merge commits)
- ✅ Require deployments to succeed before merging (if using Vercel integration)

Click "Create" to save the rule.

## Step 5: Verify Workflows

### Test CI Pipeline

1. Create a test branch:
   ```bash
   git checkout -b test/ci-setup
   ```

2. Make a small change (add a comment to any file)

3. Push and create PR:
   ```bash
   git add .
   git commit -m "test: verify CI pipeline"
   git push origin test/ci-setup
   ```

4. Open PR on GitHub

5. Watch the checks run in the PR:
   - ✅ Lint & Type Check
   - ✅ Unit Tests
   - ✅ Security Checks
   - ✅ Build
   - ✅ E2E Tests (after Vercel preview deploys)
   - ✅ Visual Regression

### Test Nightly Workflow

You can manually trigger the nightly workflow:

1. Go to `Actions` tab
2. Select "Nightly Tests & Checks"
3. Click "Run workflow"
4. Select branch: `main`
5. Click "Run workflow"

## Step 6: Configure Notifications (Optional)

### Slack Integration

To receive CI/CD notifications in Slack:

1. Create a Slack App with Incoming Webhooks
2. Add webhook URL as GitHub secret: `SLACK_WEBHOOK_URL`
3. Update workflows to include Slack notification steps (example provided below)

### Email Notifications

GitHub Actions automatically sends email notifications to:
- PR author when checks fail
- Repository watchers (can be configured in user settings)

## Step 7: Local Validation

Before pushing code, run these commands locally:

```bash
# Full pre-push validation
npm run lint
npx tsc --noEmit
npm run test:run
npm run build
node scripts/ci/check-bundle-size.js
node scripts/ci/validate-csp.js

# E2E tests (optional, but recommended)
TEST_USER_EMAIL=test@exitosx.com \
TEST_USER_PASSWORD=yourpassword \
npm run test:e2e:local
```

## Troubleshooting

### E2E Tests Timing Out

**Problem:** Playwright tests timeout waiting for preview deployment

**Solutions:**
1. Increase timeout in `.github/workflows/ci.yml`:
   ```yaml
   max_timeout: 600  # 10 minutes
   ```

2. Check Vercel deployment logs for build failures

3. Verify `VERCEL_AUTOMATION_BYPASS_SECRET` is correct

### Authentication Failures

**Problem:** E2E tests fail during login

**Solutions:**
1. Verify test user exists on staging
2. Check password is correct in GitHub secrets
3. Ensure test user is not locked or disabled
4. Test login manually on staging

### Load Test Failures

**Problem:** k6 tests fail with authentication errors

**Solutions:**
1. Generate a fresh auth token
2. Update `K6_AUTH_TOKEN` secret
3. Verify token hasn't expired
4. Check rate limiting isn't blocking test requests

### Build Failures

**Problem:** Build step fails with missing environment variables

**Solutions:**
1. Add real secrets for `DATABASE_URL`, etc. if needed
2. Or update workflow to use different dummy values
3. Check Prisma schema is valid

### Workflow Permission Errors

**Problem:** Actions fail with permission errors

**Solutions:**
1. Check workflow permissions in repository settings
2. Ensure Actions have "Read and write permissions"
3. Verify branch protection rules aren't blocking

## Monitoring & Maintenance

### Weekly Checks

- ✅ Review failed nightly test issues
- ✅ Check for dependency updates with security vulnerabilities
- ✅ Review performance metrics trends
- ✅ Update test data if needed

### Monthly Maintenance

- ✅ Update Playwright browsers: `npx playwright install`
- ✅ Review and update bundle size thresholds
- ✅ Rotate test user passwords
- ✅ Clean up old test artifacts

### Quarterly Review

- ✅ Audit all GitHub secrets (rotate if needed)
- ✅ Review CI/CD performance (pipeline duration trends)
- ✅ Update Node.js version in workflows if needed
- ✅ Review and optimize test coverage

## Cost Tracking

**GitHub Actions Minutes:**
- Free tier: 2,000 minutes/month (private repos)
- Free tier: Unlimited (public repos)

**Current Usage Estimate:**
- CI per PR: ~15 minutes
- Nightly runs: ~30 minutes/day = ~900 min/month
- Weekly full E2E: ~30 minutes/week = ~120 min/month

**Total estimated usage:** ~2,000-3,000 min/month

If you exceed free tier, consider:
- Reducing nightly test frequency
- Optimizing test parallelization
- Using self-hosted runners

## Next Steps

After setup is complete:

1. ✅ Add CI status badge to README
2. ✅ Document any project-specific test requirements
3. ✅ Train team on PR process with CI checks
4. ✅ Set up monitoring for nightly test failures
5. ✅ Consider adding deployment automation

## Support Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev)
- [k6 Documentation](https://k6.io/docs/)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

For issues specific to Exit OSx CI/CD:
- Check workflow run logs in Actions tab
- Review `.github/workflows/README.md`
- Check helper script output in artifacts
