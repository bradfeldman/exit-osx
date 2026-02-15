import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security/rate-limit'
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
} from '@/lib/security/constants'

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
    // SECURITY FIX (PROD-091 #2): Fail closed — if STAGING_AUTH_PASSWORD is not set,
    // block all access to the staging environment. Previously this failed open, which
    // meant a missing env var would expose staging to the public internet.
    console.error('[Security] STAGING_AUTH_PASSWORD not configured — blocking staging access (fail closed)')
    return new NextResponse('Staging environment is not configured. Contact administrator.', {
      status: 503,
    })
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
  '/activate',
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

// When Supabase refreshes an expired token in middleware, the new cookies are
// stored on `supabaseResponse`. Returning a plain NextResponse.redirect() loses
// them, causing redirect loops (especially on mobile where tokens expire faster).
// This helper copies all cookies from the Supabase response to the redirect.
function createRedirect(url: string | URL, supabaseRes: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url)
  supabaseRes.cookies.getAll().forEach(({ name, value, ...options }) => {
    redirect.cookies.set(name, value, options)
  })
  return redirect
}

export async function middleware(request: NextRequest) {
  // SECURITY: Check staging authentication first
  const stagingAuthResponse = checkStagingAuth(request)
  if (stagingAuthResponse) {
    return stagingAuthResponse
  }

  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // PROD-025: Redirect legacy routes to their new locations
  const legacyRedirects: Record<string, string> = {
    '/dashboard/playbook': '/dashboard/actions',
    '/dashboard/action-plan': '/dashboard/actions',
    '/dashboard/data-room': '/dashboard/evidence',
    '/dashboard/contacts': '/dashboard/deal-room',
  }
  const redirectTarget = legacyRedirects[pathname]
  if (redirectTarget) {
    return NextResponse.redirect(new URL(redirectTarget, request.url), 301)
  }

  // SECURITY FIX (PROD-091): Removed temporary DIAG logging that exposed user-agent
  // strings, cookie names, and routing decisions to console/log output in production.

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

  // MOBILE FIX: Clear stale auth cookies on login/signup pages BEFORE the
  // Supabase client is created. Without this, getUser() may refresh an expired-
  // but-refreshable session on /login, causing a redirect to /dashboard. On
  // mobile WebKit (iOS Chrome/Safari), cookies set during server-side redirects
  // can be dropped, leading to a loop: /login → /dashboard → /login → ...
  // The stale session check (line ~263) only fires for non-public routes, so
  // /login (public) was never cleaned. This pre-check handles that gap.
  let staleCookieNames: string[] = []
  const isAuthPage = pathname === '/login' || pathname === '/signup'
  if (isAuthPage) {
    const hasActivity = request.cookies.get(SESSION_COOKIE_NAME)
    const authCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
    if (!hasActivity && authCookies.length > 0) {
      staleCookieNames = authCookies.map(c => c.name)
      // Remove from request so getUser() sees a clean slate
      authCookies.forEach(c => request.cookies.delete(c.name))
    }
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
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

  // MOBILE FIX (continued): Send deletion headers so the browser clears the stale cookies
  if (staleCookieNames.length > 0) {
    staleCookieNames.forEach(name => supabaseResponse.cookies.delete(name))
    supabaseResponse.cookies.delete(SESSION_COOKIE_NAME)
  }

  // Refresh the activity cookie on each authenticated navigation
  // SECURITY FIX (PROD-091 #1): Added httpOnly to prevent client-side JS access
  // (XSS cannot steal/tamper the cookie) and secure to ensure HTTPS-only transmission.
  // The client-side SessionTimeoutWarning component uses its own JS timer, not this cookie,
  // so httpOnly does not break any client-side functionality.
  if (user) {
    supabaseResponse.cookies.set(SESSION_COOKIE_NAME, String(Date.now()), {
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    })
  }

  // Check if accessing admin subdomain (admin.exitosx.com)
  const isAdminSubdomain = hostname.startsWith('admin.')

  // Public routes that don't require auth
  // SECURITY FIX (PROD-060): Removed /api/diag (now behind requireDevEndpoint),
  // /api/industries (now requires auth — calls OpenAI which has cost abuse risk)
  const publicRoutes = ['/login', '/signup', '/activate', '/auth/callback', '/auth/confirm', '/pricing', '/terms', '/privacy', '/invite', '/api/invites', '/api/cron', '/api/health', '/api/public', '/api/report', '/report', '/api/task-share', '/task', '/forgot-password', '/reset-password', '/api/stripe/webhook']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Admin public routes (login/forgot-password on admin subdomain)
  const adminPublicRoutes = ['/admin/login', '/admin/forgot-password']
  const isAdminPublicRoute = adminPublicRoutes.some(route => pathname.startsWith(route))

  // SECURITY: Check for stale sessions (user was inactive > 30 min or closed browser)
  // The last_activity cookie has max-age=1800 — the browser auto-deletes it when it expires.
  // If Supabase auth cookies exist but last_activity is gone, the session is stale.
  const lastActivity = request.cookies.get(SESSION_COOKIE_NAME)
  const hasAuthCookies = request.cookies.getAll().some(c => c.name.startsWith('sb-'))

  if (!lastActivity && hasAuthCookies && !isPublicRoute && !isApiRoute && !isAdminPublicRoute) {
    // Session is stale — clear Supabase cookies to force re-login
    const redirectUrl = new URL('/login?reason=timeout', request.url)
    const response = NextResponse.redirect(redirectUrl)
    request.cookies.getAll()
      .filter(c => c.name.startsWith('sb-'))
      .forEach(c => response.cookies.delete(c.name))
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

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
    return createRedirect(url, supabaseResponse)
  }

  // If user is not logged in and trying to access protected route
  // But allow admin public routes (login/forgot-password)
  if (!user && !isPublicRoute && !isAdminPublicRoute && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return createRedirect(url, supabaseResponse)
  }

  // If user is logged in and trying to access auth pages, redirect to dashboard
  // EXCEPTION: /activate page REQUIRES an active session (magic link creates it) — do not redirect
  // MOBILE FIX: Only redirect if this isn't a form submission (POST) to prevent interrupting login flow
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/admin/login') && request.method === 'GET') {
    // LOOP GUARD: If we JUST redirected from a protected route to /login and user
    // still appears authenticated, we're in a redirect loop. Break it by clearing
    // all auth state and serving the login page.
    const loopGuard = request.cookies.get('_auth_loop_guard')
    if (loopGuard) {
      request.cookies.getAll()
        .filter(c => c.name.startsWith('sb-'))
        .forEach(c => supabaseResponse.cookies.delete(c.name))
      supabaseResponse.cookies.delete(SESSION_COOKIE_NAME)
      supabaseResponse.cookies.delete('_auth_loop_guard')
      return supabaseResponse
    }

    const url = request.nextUrl.clone()
    // If on admin subdomain or trying to access admin login, redirect to admin dashboard
    url.pathname = (isAdminSubdomain || pathname === '/admin/login') ? '/admin' : '/dashboard'
    const redirect = createRedirect(url, supabaseResponse)
    // Set a short-lived guard cookie — if we end up back at /login within 10s, it's a loop
    redirect.cookies.set('_auth_loop_guard', '1', {
      maxAge: 10, path: '/', httpOnly: true, sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return redirect
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
    return createRedirect(url, supabaseResponse)
  }

  // If user is NOT logged in and on app domain home page, redirect to login
  if (!user && pathname === '/' && isAppDomain(hostname) && !hostname.includes('localhost')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return createRedirect(url, supabaseResponse)
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
    '/((?!_next/static|_next/image|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
