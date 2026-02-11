import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'

// Service health status type
interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency?: number
  error?: string
  lastChecked: string
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: ServiceHealth
    supabaseAuth: ServiceHealth
    supabaseStorage: ServiceHealth
    openai: ServiceHealth
    resend: ServiceHealth
    quickbooks: ServiceHealth
  }
  version: string
}

// Check database connectivity
async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const prisma = new PrismaClient()
    await prisma.$queryRaw`SELECT 1`
    await prisma.$disconnect()
    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { service: 'database' } })
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: 'Database connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

// Check Supabase Auth
async function checkSupabaseAuth(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return {
        status: 'unhealthy',
        error: 'Supabase credentials not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    // Simple health check - get session (will be null for anonymous, but confirms connectivity)
    await supabase.auth.getSession()

    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { service: 'supabase_auth' } })
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: 'Supabase Auth connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

// Check Supabase Storage
async function checkSupabaseStorage(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return {
        status: 'degraded',
        error: 'Supabase storage credentials not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    // List buckets to verify storage is accessible
    const { error } = await supabase.storage.listBuckets()

    if (error) throw error

    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { service: 'supabase_storage' } })
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: 'Supabase Storage connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

// Check OpenAI API
async function checkOpenAI(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return {
        status: 'degraded',
        error: 'OpenAI API key not configured (falling back to keyword matching)',
        lastChecked: new Date().toISOString(),
      }
    }

    // Simple models list call to verify API key works
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(error.error?.message || `API returned ${response.status}`)
    }

    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { service: 'openai' } })
    return {
      status: 'degraded', // Degraded because keyword fallback exists
      latency: Date.now() - start,
      error: 'OpenAI API check failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

// Check Resend email service
async function checkResend(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return {
        status: 'degraded',
        error: 'Resend API key not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    // Check API key validity by listing domains
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Resend API returned ${response.status}`)
    }

    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { service: 'resend' } })
    return {
      status: 'degraded',
      latency: Date.now() - start,
      error: 'Resend API check failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

// Check QuickBooks API connectivity
async function checkQuickBooks(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return {
        status: 'degraded',
        error: 'QuickBooks credentials not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    // QuickBooks doesn't have a simple health endpoint, so we just verify credentials exist
    // Actual API health is checked during OAuth flow
    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { service: 'quickbooks' } })
    return {
      status: 'degraded',
      latency: Date.now() - start,
      error: 'QuickBooks check failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

// Determine overall health status
function getOverallStatus(services: HealthCheckResponse['services']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(s => s.status)

  // If database is unhealthy, entire system is unhealthy
  if (services.database.status === 'unhealthy') {
    return 'unhealthy'
  }

  // If auth is unhealthy, entire system is unhealthy
  if (services.supabaseAuth.status === 'unhealthy') {
    return 'unhealthy'
  }

  // If any service is unhealthy, system is degraded
  if (statuses.includes('unhealthy')) {
    return 'degraded'
  }

  // If any service is degraded, system is degraded
  if (statuses.includes('degraded')) {
    return 'degraded'
  }

  return 'healthy'
}

export async function GET() {
  // Run all health checks in parallel
  const [database, supabaseAuth, supabaseStorage, openai, resend, quickbooks] = await Promise.all([
    checkDatabase(),
    checkSupabaseAuth(),
    checkSupabaseStorage(),
    checkOpenAI(),
    checkResend(),
    checkQuickBooks(),
  ])

  const services = {
    database,
    supabaseAuth,
    supabaseStorage,
    openai,
    resend,
    quickbooks,
  }

  const response: HealthCheckResponse = {
    status: getOverallStatus(services),
    timestamp: new Date().toISOString(),
    services,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
  }

  // Return appropriate status code
  const statusCode = response.status === 'healthy' ? 200 : response.status === 'degraded' ? 200 : 503

  return NextResponse.json(response, { status: statusCode })
}
