import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security/rate-limit'

// SECURITY: Basic auth protection for staging environment
function checkStagingAuth(request: NextRequest): NextResponse | null {
  const hostname = request.headers.get('host') || ''

  // Only apply to staging.exitosx.com
  if (!hostname.includes('staging.exitosx.com')) {
    return null
  }

  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Staging Environment"',
      },
    })
  }

  // Decode and verify credentials
  const base64Credentials = authHeader.split(' ')[1]
  const credentials = atob(base64Credentials)
  const [username, password] = credentials.split(':')

  const validUsername = process.env.STAGING_AUTH_USERNAME || 'staging'
  const validPassword = process.env.STAGING_AUTH_PASSWORD

  if (!validPassword) {
    // If no password configured, allow access (fail open for development)
    console.warn('STAGING_AUTH_PASSWORD not configured')
    return null
  }

  if (username !== validUsername || password !== validPassword) {
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Staging Environment"',
      },
    })
  }

  return null // Auth successful, continue
}

// SECURITY: Admin route patterns that require super admin access
const ADMIN_ROUTE_PATTERNS = [
  '/admin',
  '/api/admin',
]

// SECURITY: Auth API routes that need strict rate limiting (POST only)
const AUTH_API_RATE_LIMITED_ROUTES = [
  '/api/auth',
  '/api/user/sync',
]

// SECURITY: Auth page routes - only rate limit POST (actual login/signup attempts)
const AUTH_PAGE_ROUTES = [
  '/login',
  '/signup',
]

// SECURITY: Sensitive routes with stricter rate limits
const SENSITIVE_RATE_LIMITED_ROUTES = [
  '/api/user/gdpr',
  '/api/invites',
  '/api/admin/users',
]

// Marketing domain routes (served on exitosx.com)
const MARKETING_ROUTES = ['/', '/pricing', '/privacy', '/terms']

// Check if hostname is the marketing domain
function isMarketingDomain(hostname: string): boolean {
  return hostname === 'exitosx.com' || hostname === 'www.exitosx.com'
}

// Check if hostname is the app domain
function isAppDomain(hostname: string): boolean {
  return hostname === 'app.exitosx.com' || hostname.includes('localhost')
}

// Session-scoped cookie options: no maxAge/expires means cookies are deleted
// when the browser is fully closed, preventing persistent sessions.
const sessionCookieOptions = { path: '/', sameSite: 'lax' as const }

export async function middleware(request: NextRequest) {
  // SECURITY: Check staging authentication first
  const stagingAuthResponse = checkStagingAuth(request)
  if (stagingAuthResponse) {
    return stagingAuthResponse
  }

  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // === DOMAIN-BASED ROUTING ===

  // Marketing domain (exitosx.com): Only serve marketing routes, redirect others to app
  if (isMarketingDomain(hostname)) {
    const isMarketingRoute = MARKETING_ROUTES.includes(pathname)

    if (!isMarketingRoute) {
      // Redirect non-marketing routes to app subdomain
      const url = new URL(request.url)
      url.hostname = 'app.exitosx.com'
      url.port = ''
      return NextResponse.redirect(url)
    }
    // Continue processing for marketing routes (serve landing, pricing, etc.)
  }

  // App domain (app.exitosx.com): Redirect marketing routes to marketing domain
  if (isAppDomain(hostname) && !hostname.includes('localhost')) {
    // Redirect pricing to marketing domain
    if (pathname === '/pricing') {
      return NextResponse.redirect('https://exitosx.com/pricing')
    }
    // Note: We don't redirect / here because it's handled by the existing logic
    // (logged in users go to dashboard, logged out users see focused onboarding)
  }

  // SECURITY: Apply rate limiting before any other processing
  const isAuthApiRoute = AUTH_API_RATE_LIMITED_ROUTES.some(route => pathname.startsWith(route))
  const isAuthPageRoute = AUTH_PAGE_ROUTES.some(route => pathname.startsWith(route))
  const isSensitiveRoute = SENSITIVE_RATE_LIMITED_ROUTES.some(route => pathname.startsWith(route))
  const isApiRoute = pathname.startsWith('/api/')
  const isPostRequest = request.method === 'POST'

  // Only rate limit auth API routes and POST requests to auth pages (actual login attempts)
  if (isAuthApiRoute || (isAuthPageRoute && isPostRequest)) {
    const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AUTH)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult)
    }
  } else if (isSensitiveRoute) {
    const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.SENSITIVE)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult)
    }
  } else if (isApiRoute) {
    const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.API)
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult)
    }
  }

  // Add pathname and URL headers for server components to detect route
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  requestHeaders.set('x-url', request.url)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: sessionCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, ...sessionCookieOptions })
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if accessing admin subdomain (admin.exitosx.com)
  const isAdminSubdomain = hostname.startsWith('admin.')

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/confirm', '/pricing', '/terms', '/privacy', '/invite', '/api/invites', '/api/cron', '/api/health', '/api/industries', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Admin public routes (login/forgot-password on admin subdomain)
  const adminPublicRoutes = ['/admin/login', '/admin/forgot-password']
  const isAdminPublicRoute = adminPublicRoutes.some(route => pathname.startsWith(route))

  // SECURITY: Check if this is an admin route
  const isAdminRoute = ADMIN_ROUTE_PATTERNS.some(pattern => pathname.startsWith(pattern))

  // Handle admin subdomain - rewrite ALL routes to /admin routes
  // This includes public routes like /login which become /admin/login
  if (isAdminSubdomain && !pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone()
    url.pathname = `/admin${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // SECURITY: Enhanced admin route protection at middleware level
  // This provides defense-in-depth alongside layout-level checks
  if (isAdminRoute && user) {
    // For API routes, we check admin status via a lightweight query
    // The actual isSuperAdmin check happens in the API route itself,
    // but we add an additional layer by checking for admin cookie/header
    const adminSessionCookie = request.cookies.get('admin_verified')

    // If no admin session cookie, redirect to verify admin status
    // This forces the admin layout to run its full verification
    if (!adminSessionCookie && pathname.startsWith('/api/admin')) {
      // For API routes, return 403 immediately if no admin verification
      // The actual super admin check still happens in the route handler
      // This just adds an extra layer of protection
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Admin access required. Please access via admin portal.',
        },
        { status: 403 }
      )
    }
  }

  // Block non-authenticated users from admin routes entirely (except admin public routes)
  // Must be checked before general protected routes
  if (isAdminRoute && !user && !isAdminPublicRoute) {
    const url = request.nextUrl.clone()
    // Always redirect admin routes to admin login
    url.pathname = '/admin/login'
    if (pathname !== '/admin') {
      url.searchParams.set('next', pathname)
    }
    return NextResponse.redirect(url)
  }

  // If user is not logged in and trying to access protected route
  // But allow admin public routes (login/forgot-password)
  if (!user && !isPublicRoute && !isAdminPublicRoute && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access auth pages, redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/admin/login')) {
    const url = request.nextUrl.clone()
    // If on admin subdomain or trying to access admin login, redirect to admin dashboard
    url.pathname = (isAdminSubdomain || pathname === '/admin/login') ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // If user is logged in and on home page
  if (user && pathname === '/') {
    // On marketing domain: stay on landing page (don't redirect)
    if (isMarketingDomain(hostname)) {
      // Continue to serve the landing page
      return supabaseResponse
    }
    // On app domain or admin: redirect to dashboard
    const url = request.nextUrl.clone()
    url.pathname = isAdminSubdomain ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // If user is NOT logged in and on app domain home page, redirect to marketing
  if (!user && pathname === '/' && isAppDomain(hostname) && !hostname.includes('localhost')) {
    return NextResponse.redirect('https://exitosx.com')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
