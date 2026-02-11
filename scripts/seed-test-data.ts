import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { DEFAULT_BRI_WEIGHTS } from '../src/lib/bri-weights'
import { calculateValuation, ALPHA } from '../src/lib/valuation/calculate-valuation'

// Load environment variables
config({ path: '.env.local' })

/**
 * Canonical Test Data Seed Script
 *
 * Purpose: Creates deterministic test user and company data for automated testing.
 * This script is idempotent and can be run repeatedly.
 *
 * Required Environment Variables:
 *   - DATABASE_URL: Supabase transaction pooler connection string
 *   - DIRECT_URL: Supabase direct connection string (for DDL operations)
 *   - TEST_USER_EMAIL: Email for test user account
 *   - TEST_USER_PASSWORD: Password for test user (must be created manually in Supabase Auth)
 *   - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anon key
 *
 * Usage:
 *   npm run test:seed
 *
 * Note: The test user must be manually created in Supabase Auth first.
 * This script only creates the User record in the database, not the auth account.
 *
 * To create the auth user manually:
 * 1. Go to Supabase Dashboard → Authentication → Users
 * 2. Click "Add user" → "Create new user"
 * 3. Enter email and password matching TEST_USER_EMAIL and TEST_USER_PASSWORD
 * 4. Confirm the user's email if needed
 * 5. Copy the user's UUID and run this script
 */

// Canonical test company data matching financial-modeling-engineer's golden file tests
const CANONICAL_COMPANY = {
  name: 'Test Co - Canonical',
  annualRevenue: 1000000, // $1M
  annualEbitda: 150000, // 15% margin
  ownerCompensation: 0,

  // Industry: Software/SaaS
  icbIndustry: 'Technology',
  icbSuperSector: 'Technology',
  icbSector: 'Software & Computer Services',
  icbSubSector: 'Software',

  // Industry multiples
  industryMultipleLow: 3.0,
  industryMultipleHigh: 6.0,

  // Core factors (optimal SaaS business)
  coreFactors: {
    revenueSizeCategory: 'UNDER_1M',
    revenueModel: 'SUBSCRIPTION_SAAS',
    grossMarginProxy: 'EXCELLENT',
    laborIntensity: 'LOW',
    assetIntensity: 'ASSET_LIGHT',
    ownerInvolvement: 'MINIMAL',
  },

  // BRI scores (70% overall, distributed across categories)
  briScores: {
    FINANCIAL: 0.70,
    TRANSFERABILITY: 0.70,
    OPERATIONAL: 0.70,
    MARKET: 0.70,
    LEGAL_TAX: 0.70,
    PERSONAL: 0.70,
  },
}

// Calculate expected valuation using the canonical formula
function calculateExpectedValuation() {
  const briScore = Object.entries(CANONICAL_COMPANY.briScores).reduce(
    (sum, [category, score]) => sum + score * DEFAULT_BRI_WEIGHTS[category as keyof typeof DEFAULT_BRI_WEIGHTS],
    0
  )

  return calculateValuation({
    adjustedEbitda: CANONICAL_COMPANY.annualEbitda,
    industryMultipleLow: CANONICAL_COMPANY.industryMultipleLow,
    industryMultipleHigh: CANONICAL_COMPANY.industryMultipleHigh,
    coreScore: 1.0, // Optimal core factors
    briScore: briScore,
  })
}

async function main() {
  const testUserEmail = process.env.TEST_USER_EMAIL
  const testUserPassword = process.env.TEST_USER_PASSWORD

  if (!testUserEmail || !testUserPassword) {
    console.error('ERROR: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required.')
    console.error('Please set these in your .env.local file before running this script.')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log('🌱 Starting test data seed...')
  console.log(`📧 Test user email: ${testUserEmail}`)

  try {
    // Step 1: Find or create the test user
    console.log('\n1️⃣  Finding test user in Supabase Auth...')

    // In a real implementation, you would use Supabase Admin API to check/create the auth user
    // For now, we'll just document that it needs to be created manually
    console.log('⚠️  IMPORTANT: The test user must exist in Supabase Auth.')
    console.log('   If not created yet, create it manually in Supabase Dashboard:')
    console.log('   1. Go to: https://supabase.com/dashboard → Authentication → Users')
    console.log('   2. Click "Add user" → "Create new user"')
    console.log(`   3. Email: ${testUserEmail}`)
    console.log(`   4. Password: ${testUserPassword}`)
    console.log('   5. Confirm email if required')
    console.log('')

    // Check if user already exists in our database
    let user = await prisma.user.findUnique({
      where: { email: testUserEmail },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                companies: {
                  include: {
                    valuationSnapshots: true,
                    coreFactors: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (user) {
      console.log(`✅ Found existing user: ${user.id}`)

      // Clean up existing test data for idempotency
      console.log('\n2️⃣  Cleaning up existing test data...')

      for (const orgUser of user.organizations) {
        const org = orgUser.organization
        console.log(`   Deleting organization: ${org.name} (${org.id})`)

        // Delete companies (cascade will handle related data)
        for (const company of org.companies) {
          console.log(`   - Deleting company: ${company.name}`)
        }

        // Delete organization (cascade will delete companies, org users, etc.)
        await prisma.organization.delete({
          where: { id: org.id },
        })
      }

      // Delete the user (will be recreated)
      console.log(`   Deleting user: ${user.email}`)
      await prisma.user.delete({
        where: { id: user.id },
      })

      user = null
    }

    // Create user with a deterministic auth_id
    // Note: In production, this would come from Supabase Auth
    // For testing, we use a deterministic UUID based on the email
    const testAuthId = `test-auth-${Buffer.from(testUserEmail).toString('hex').substring(0, 32)}`

    console.log('\n3️⃣  Creating test user...')
    user = await prisma.user.create({
      data: {
        authId: testAuthId,
        email: testUserEmail,
        name: 'Test User',
        userType: 'SUBSCRIBER',
        isSuperAdmin: false,
      },
    })
    console.log(`✅ Created user: ${user.id}`)

    // Step 2: Create test organization
    console.log('\n4️⃣  Creating test organization...')
    const organization = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        planTier: 'GROWTH',
        subscriptionStatus: 'ACTIVE',
        users: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
      },
    })
    console.log(`✅ Created organization: ${organization.id}`)

    // Step 3: Create canonical test company
    console.log('\n5️⃣  Creating canonical test company...')
    const company = await prisma.company.create({
      data: {
        organizationId: organization.id,
        name: CANONICAL_COMPANY.name,
        icbIndustry: CANONICAL_COMPANY.icbIndustry,
        icbSuperSector: CANONICAL_COMPANY.icbSuperSector,
        icbSector: CANONICAL_COMPANY.icbSector,
        icbSubSector: CANONICAL_COMPANY.icbSubSector,
        annualRevenue: CANONICAL_COMPANY.annualRevenue,
        annualEbitda: CANONICAL_COMPANY.annualEbitda,
        ownerCompensation: CANONICAL_COMPANY.ownerCompensation,
        briWeights: DEFAULT_BRI_WEIGHTS,

        // Create core factors
        coreFactors: {
          create: CANONICAL_COMPANY.coreFactors,
        },

        // Create company ownership
        ownerships: {
          create: {
            userId: user.id,
            isOwner: true,
            canShareCompany: true,
          },
        },
      },
      include: {
        coreFactors: true,
      },
    })
    console.log(`✅ Created company: ${company.id}`)

    // Step 4: Create valuation snapshot with deterministic values
    console.log('\n6️⃣  Creating valuation snapshot...')
    const expectedValuation = calculateExpectedValuation()
    const briScore = Object.entries(CANONICAL_COMPANY.briScores).reduce(
      (sum, [category, score]) => sum + score * DEFAULT_BRI_WEIGHTS[category as keyof typeof DEFAULT_BRI_WEIGHTS],
      0
    )

    const snapshot = await prisma.valuationSnapshot.create({
      data: {
        companyId: company.id,
        createdByUserId: user.id,
        adjustedEbitda: CANONICAL_COMPANY.annualEbitda,
        industryMultipleLow: CANONICAL_COMPANY.industryMultipleLow,
        industryMultipleHigh: CANONICAL_COMPANY.industryMultipleHigh,
        coreScore: 1.0,
        briScore: briScore,
        briFinancial: CANONICAL_COMPANY.briScores.FINANCIAL,
        briTransferability: CANONICAL_COMPANY.briScores.TRANSFERABILITY,
        briOperational: CANONICAL_COMPANY.briScores.OPERATIONAL,
        briMarket: CANONICAL_COMPANY.briScores.MARKET,
        briLegalTax: CANONICAL_COMPANY.briScores.LEGAL_TAX,
        briPersonal: CANONICAL_COMPANY.briScores.PERSONAL,
        baseMultiple: expectedValuation.baseMultiple,
        discountFraction: expectedValuation.discountFraction,
        finalMultiple: expectedValuation.finalMultiple,
        currentValue: expectedValuation.currentValue,
        potentialValue: expectedValuation.potentialValue,
        valueGap: expectedValuation.valueGap,
        alphaConstant: ALPHA,
        snapshotReason: 'Test data seed - canonical company baseline',
      },
    })
    console.log(`✅ Created valuation snapshot: ${snapshot.id}`)

    // Summary
    console.log('\n✅ Test data seed completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   User ID:         ${user.id}`)
    console.log(`   User Email:      ${user.email}`)
    console.log(`   Auth ID:         ${user.authId}`)
    console.log(`   Organization ID: ${organization.id}`)
    console.log(`   Company ID:      ${company.id}`)
    console.log(`   Snapshot ID:     ${snapshot.id}`)
    console.log('')
    console.log('📈 Canonical Company Values:')
    console.log(`   Annual Revenue:  $${CANONICAL_COMPANY.annualRevenue.toLocaleString()}`)
    console.log(`   Annual EBITDA:   $${CANONICAL_COMPANY.annualEbitda.toLocaleString()}`)
    console.log(`   BRI Score:       ${(briScore * 100).toFixed(1)}%`)
    console.log(`   Core Score:      100.0%`)
    console.log(`   Base Multiple:   ${expectedValuation.baseMultiple.toFixed(2)}x`)
    console.log(`   Final Multiple:  ${expectedValuation.finalMultiple.toFixed(2)}x`)
    console.log(`   Current Value:   $${Math.round(expectedValuation.currentValue).toLocaleString()}`)
    console.log(`   Potential Value: $${Math.round(expectedValuation.potentialValue).toLocaleString()}`)
    console.log(`   Value Gap:       $${Math.round(expectedValuation.valueGap).toLocaleString()}`)
    console.log('')
    console.log('🧪 Ready for automated testing!')
    console.log(`   Set in your test environment:`)
    console.log(`   TEST_USER_EMAIL=${testUserEmail}`)
    console.log(`   TEST_USER_PASSWORD=${testUserPassword}`)
    console.log('')
    console.log('⚠️  IMPORTANT NEXT STEPS:')
    console.log('   1. Ensure the Supabase Auth user exists with the same email/password')
    console.log('   2. The auth_id in our database may not match the Supabase auth UUID')
    console.log('   3. For E2E tests to work, you may need to manually link these accounts')
    console.log('   4. Or modify this script to use Supabase Admin API to create/fetch the real auth UUID')

  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })
