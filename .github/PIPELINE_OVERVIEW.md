# CI/CD Pipeline Architecture Overview

## Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PULL REQUEST OPENED                          │
│                         (Target: main branch)                        │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PARALLEL EXECUTION - STAGE 1                      │
├─────────────────────┬──────────────────┬───────────────────────────┤
│  Lint & TypeCheck   │   Unit Tests     │   Security Checks         │
│  (~20 seconds)      │   (~30 seconds)  │   (~45 seconds)           │
│                     │                  │                           │
│  • ESLint           │  • Vitest        │  • npm audit              │
│  • TypeScript       │  • Coverage      │  • Secret scanning        │
│    type check       │    report        │  • CSP validation         │
└─────────────────────┴──────────────────┴───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BUILD STAGE                                  │
│                       (~1-2 minutes)                                 │
│                                                                      │
│  • Next.js build                                                    │
│  • Prisma generation                                                │
│  • Bundle size analysis                                             │
│  • Upload build artifacts                                           │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   WAIT FOR VERCEL PREVIEW                            │
│                       (~1-2 minutes)                                 │
│                                                                      │
│  Vercel automatically deploys PR to preview URL                     │
│  Workflow polls for deployment completion                           │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PARALLEL EXECUTION - STAGE 2                      │
│                   (Against Vercel Preview URL)                       │
├─────────────────────────────┬───────────────────────────────────────┤
│      E2E Tests              │    Visual Regression                  │
│      (~3-5 minutes)         │    (~2 minutes)                       │
│                             │                                       │
│  • Login flow               │  • Screenshot comparison              │
│  • Dashboard navigation     │  • Layout validation                  │
│  • CRUD operations          │  • Component rendering                │
│  • Mobile responsiveness    │  • Cross-browser consistency          │
│  • Upload traces on fail    │  • Upload diffs on fail               │
└─────────────────────────────┴───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CI SUCCESS CHECK                                │
│                                                                      │
│  All required jobs must pass:                                       │
│  ✅ Lint & TypeCheck                                                │
│  ✅ Unit Tests                                                      │
│  ✅ Security Checks                                                 │
│  ✅ Build                                                           │
│                                                                      │
│  Optional (informational):                                          │
│  ℹ️  E2E Tests                                                      │
│  ℹ️  Visual Regression                                              │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MERGE ALLOWED                                │
│                                                                      │
│  Branch protection rule satisfied                                   │
│  PR can be merged to main                                           │
└─────────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL PRODUCTION DEPLOY                          │
│                                                                      │
│  Automatic deployment to production on merge                        │
│  URL: https://app.exitosx.com                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Nightly Testing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CRON TRIGGER (2 AM UTC)                         │
│                     or Manual Workflow Trigger                       │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PARALLEL EXECUTION - NIGHTLY                      │
├─────────────────────┬──────────────────┬───────────────────────────┤
│   Load Testing      │  Security Audit  │  Performance Tracking     │
│   (~5-10 minutes)   │  (~10 minutes)   │  (~15 minutes)            │
│                     │                  │                           │
│  • k6 smoke test    │  • Full npm      │  • Lighthouse scores      │
│  • Against staging  │    audit         │  • Page load metrics      │
│  • 30s duration     │  • Dependency    │  • Trend analysis         │
│  • Save metrics     │    updates       │  • Save to artifacts      │
└─────────────────────┴──────────────────┴───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SUNDAY ONLY                                   │
│                   Weekly Full E2E Suite                              │
│                      (~30 minutes)                                   │
│                                                                      │
│  • All browsers (Chrome, Firefox, Safari simulation)                │
│  • Full test suite (not just smoke tests)                           │
│  • Against staging environment                                      │
│  • Comprehensive coverage                                           │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FAILURE NOTIFICATION                             │
│                     (If any job fails)                               │
│                                                                      │
│  • Create GitHub issue                                              │
│  • Label: automated, nightly-failure, needs-triage                  │
│  • Include failure summary                                          │
│  • Link to workflow run                                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Pipeline Stages Breakdown

### Stage 1: Fast Feedback (~1 minute)

**Purpose:** Catch obvious issues immediately

**Jobs:**
1. **Lint & TypeCheck** - Code quality and type safety
2. **Unit Tests** - Business logic validation
3. **Security Checks** - Basic vulnerability scanning

**Fails Fast:** Yes - stops pipeline if any job fails

### Stage 2: Build Verification (~2 minutes)

**Purpose:** Ensure code can be built and deployed

**Jobs:**
1. **Build** - Compile Next.js application
2. **Bundle Analysis** - Check for size regressions

**Depends On:** Stage 1 success (specifically Lint & TypeCheck)

### Stage 3: Integration Testing (~5-7 minutes)

**Purpose:** Validate application behavior in real environment

**Jobs:**
1. **E2E Tests** - Full user workflows
2. **Visual Regression** - UI consistency

**Depends On:**
- Stage 2 success
- Vercel preview deployment

**Runs On:** Every PR to main

### Nightly Stage: Deep Validation (~30-60 minutes)

**Purpose:** Catch issues that don't need immediate feedback

**Jobs:**
1. **Load Testing** - Performance under load
2. **Security Audit** - Deep dependency scanning
3. **Performance Tracking** - Trend analysis
4. **Weekly Full E2E** - Comprehensive browser testing

**Runs On:** Daily schedule (weekly for full E2E)

## Critical Paths

### Blocking Path (PR merge requirement)
```
Lint & TypeCheck → Build → CI Success Check → Merge Allowed
Unit Tests       ↗              ↑
Security Checks  ↗              ↑
                               ↑
                    All must pass
```

### Non-Blocking Path (Informational)
```
E2E Tests         → Reported but don't block merge
Visual Regression ↗ (Can be reviewed asynchronously)
```

### Deployment Path
```
PR Merge → Vercel Auto-Deploy → Production (app.exitosx.com)
```

## Artifacts & Retention

| Artifact Type | Generated By | Retention | Size Est. |
|--------------|--------------|-----------|-----------|
| Coverage Report | Unit Tests | 7 days | ~5 MB |
| Build Output | Build | 1 day | ~50 MB |
| Playwright Results | E2E Tests | 7 days | ~10 MB |
| Playwright Traces | E2E Tests (on failure) | 7 days | ~20 MB |
| Visual Diffs | Visual Regression (on failure) | 7 days | ~5 MB |
| k6 Results | Load Testing | 30 days | ~1 MB |
| Security Report | Security Audit | 30 days | ~500 KB |
| Performance Metrics | Performance Tracking | 30 days | ~1 MB |

## Environment Matrix

### CI Pipeline

| Environment | Used For | URL |
|------------|----------|-----|
| Vercel Preview | E2E & Visual Tests | `*.vercel.app` (unique per PR) |
| Node.js 20.x | All jobs | - |
| Ubuntu Latest | All runners | - |

### Nightly Pipeline

| Environment | Used For | URL |
|------------|----------|-----|
| Staging | Load Tests, E2E | `https://staging.exitosx.com` |
| Node.js 20.x | All jobs | - |
| Ubuntu Latest | All runners | - |

## Parallelization Strategy

### PR Pipeline

**Stage 1 (Parallel):** 3 jobs run simultaneously
- Total time: ~45s (limited by slowest job)
- Resource usage: 3 concurrent runners

**Stage 2 (Sequential):** 1 job after Stage 1
- Total time: ~2 min
- Resource usage: 1 runner

**Stage 3 (Parallel):** 2 jobs run simultaneously
- Total time: ~5 min (limited by E2E tests)
- Resource usage: 2 concurrent runners

**Total Pipeline Time:** ~7-8 minutes

### Nightly Pipeline

**Parallel Execution:** 3 jobs run simultaneously
- Total time: ~20 min (limited by Performance Tracking)
- Resource usage: 3 concurrent runners

**Weekly Addition:** 1 additional job on Sundays
- Additional time: +30 min
- Resource usage: +1 runner

## Failure Scenarios & Recovery

### Scenario 1: Lint Failure
**Impact:** Build and subsequent stages don't run (save resources)
**Recovery:** Fix linting issues, push new commit
**Time to Fix:** ~5 minutes

### Scenario 2: Build Failure
**Impact:** E2E and visual tests don't run
**Recovery:** Fix build issues, push new commit
**Time to Fix:** ~10-20 minutes

### Scenario 3: E2E Test Failure
**Impact:** Informational only, doesn't block merge
**Recovery:** Investigate failure, fix if needed, or merge if non-critical
**Time to Fix:** Variable (can defer)

### Scenario 4: Vercel Preview Timeout
**Impact:** E2E and visual tests can't run
**Recovery:**
1. Check Vercel deployment logs
2. Re-run workflow if transient issue
3. Increase timeout if consistently slow
**Time to Fix:** ~5 minutes (re-run)

### Scenario 5: Flaky Test
**Impact:** False negatives, wasted time
**Recovery:**
1. Workflow auto-retries (2 attempts)
2. If still fails, investigate test stability
3. Mark test as skipped if known flaky
**Prevention:** Regular test reliability audits

## Monitoring & Alerts

### What Gets Monitored

1. **Pipeline Duration Trends**
   - Average time per stage
   - Identify performance regressions

2. **Failure Rates**
   - Per job failure rate
   - Identify flaky tests

3. **Resource Usage**
   - GitHub Actions minutes consumed
   - Cost tracking

4. **Test Coverage**
   - Coverage percentage trends
   - Identify gaps

### Alert Triggers

1. **Nightly Test Failures**
   - Automatic issue creation
   - Labels: `automated`, `nightly-failure`, `needs-triage`

2. **Multiple PR Pipeline Failures**
   - Manual review needed
   - Check for systemic issues

3. **Performance Degradation**
   - k6 thresholds exceeded
   - Page load times increasing

## Security Considerations

### Secrets Management

- All secrets stored in GitHub encrypted secrets
- Secrets never logged or exposed in output
- Secrets scoped to minimum required permissions

### Access Control

- Workflows require write permissions for artifacts only
- Pull requests from forks have limited access
- Branch protection prevents unauthorized merges

### Dependency Security

- npm audit runs on every PR
- Nightly full security audit
- Automated PRs for security updates (if Dependabot enabled)

## Performance Optimization Tips

### Reduce CI Time

1. **Cache dependencies** - Already implemented
2. **Parallelize tests** - Already implemented
3. **Skip unnecessary steps** - Use conditional execution
4. **Optimize Docker layers** - N/A (using Node directly)
5. **Use GitHub Action cache** - Already implemented

### Reduce Resource Usage

1. **Conditional job execution** - E2E only on PRs
2. **Matrix strategy** - Avoid over-testing
3. **Artifact cleanup** - Short retention periods
4. **Self-hosted runners** - Consider for high volume

## Future Enhancements

### Planned

- [ ] Integration with Vercel deployment comments (show metrics in PR)
- [ ] Automated dependency updates with Dependabot
- [ ] Slack notifications for failures
- [ ] Performance budget enforcement (hard fail on regression)
- [ ] Automated changelog generation

### Under Consideration

- [ ] Smoke tests on production after deploy
- [ ] A/B testing framework integration
- [ ] Database migration validation
- [ ] Load testing against production (off-hours)
- [ ] Security scanning with Snyk or similar
