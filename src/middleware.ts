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

export async function middleware(request: NextRequest) {
  // SECURITY: Check staging authentication first
  const stagingAuthResponse = checkStagingAuth(request)
  if (stagingAuthResponse) {
    return stagingAuthResponse
  }

  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

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

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            supabaseResponse.cookies.set(name, value, options)
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
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/confirm', '/pricing', '/terms', '/privacy', '/invite']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // SECURITY: Check if this is an admin route
  const isAdminRoute = ADMIN_ROUTE_PATTERNS.some(pattern => pathname.startsWith(pattern))

  // Handle admin subdomain - rewrite to /admin routes
  if (isAdminSubdomain && !pathname.startsWith('/admin') && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = `/admin${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // If user is not logged in and trying to access protected route
  if (!user && !isPublicRoute && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
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

  // Block non-authenticated users from admin routes entirely
  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access auth pages, redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    // If on admin subdomain, redirect to admin dashboard
    url.pathname = isAdminSubdomain ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // If user is logged in and on home page, redirect to dashboard
  if (user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = isAdminSubdomain ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
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
