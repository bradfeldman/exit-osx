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

// SECURITY: Constant-time string comparison for Edge Runtime
// (Cannot import from @/lib/security/timing-safe which uses Node.js crypto.timingSafeEqual)
function edgeConstantTimeCompare(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length)
  let result = a.length ^ b.length // Non-zero if lengths differ
  for (let i = 0; i < maxLength; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return result === 0
}

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

  // SECURITY FIX: Use constant-time comparison to prevent timing attacks
  // that could leak valid credentials one character at a time
  const usernameMatch = edgeConstantTimeCompare(username, validUsername)
  const passwordMatch = edgeConstantTimeCompare(password, validPassword)
  if (!usernameMatch || !passwordMatch) {
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

// SECURITY (SEC-030): CSRF protection via Origin header validation
// Routes that legitimately receive cross-origin or server-to-server requests
const CSRF_EXEMPT_ROUTES = [
  '/api/stripe/webhook',   // Stripe uses signature verification
  '/api/cron/',            // Vercel cron uses Bearer CRON_SECRET
  '/api/health',           // Health check (GET, but exempted for monitoring)
  '/api/public/',          // Public endpoints
]

// SECURITY (SEC-030): Allowed origins for CSRF validation
function isAllowedOrigin(origin: string): boolean {
  const allowed = [
    'https://app.exitosx.com',
    'https://exitosx.com',
    'https://www.exitosx.com',
    'https://staging.exitosx.com',
    'https://admin.exitosx.com',
  ]
  if (process.env.NODE_ENV !== 'production') {
    allowed.push('http://localhost:3000', 'http://localhost:3001')
  }
  return allowed.includes(origin)
}

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
  const isProduction = process.env.NODE_ENV === 'production'
  supabaseRes.cookies.getAll().forEach(({ name, value, ...options }) => {
    redirect.cookies.set(name, value, {
      ...options,
      // SEC-036: Enforce Secure flag in production to prevent cookie leakage over HTTP
      ...(isProduction && { secure: true }),
    })
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

  // SEC-043: Handle CORS preflight for API routes (dynamic origin reflection)
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    if (origin && isAllowedOrigin(origin)) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
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

  // SECURITY (SEC-030): CSRF protection — validate Origin for state-changing API requests
  // SameSite=Lax cookies provide baseline protection; this adds defense-in-depth
  const isMutatingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
  const isCsrfExempt = CSRF_EXEMPT_ROUTES.some(route => pathname.startsWith(route))

  if (isApiRoute && isMutatingRequest && !isCsrfExempt) {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')

    if (origin) {
      // Origin header present — must match allowed origins
      if (!isAllowedOrigin(origin)) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Cross-origin request blocked' },
          { status: 403 }
        )
      }
    } else if (referer) {
      // No Origin but Referer present — validate referer origin
      try {
        const refererOrigin = new URL(referer).origin
        if (!isAllowedOrigin(refererOrigin)) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'Cross-origin request blocked' },
            { status: 403 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Invalid referer' },
          { status: 403 }
        )
      }
    } else {
      // SEC-064: No Origin or Referer — require X-Requested-With as CSRF proof.
      // Legitimate browser requests from our app include this header via fetch().
      // Server-to-server calls (cron, webhooks) are already in CSRF_EXEMPT_ROUTES.
      // SEC-088: Require specific value, not just presence
      const xRequestedWith = request.headers.get('x-requested-with')
      if (xRequestedWith !== 'XMLHttpRequest') {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Missing required request headers' },
          { status: 403 }
        )
      }
    }
  }

  // Add pathname and URL headers for server components to detect route
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  requestHeaders.set('x-url', request.url)

  // SEC-026: Generate cryptographic nonce for CSP
  const nonce = btoa(crypto.randomUUID())
  requestHeaders.set('x-nonce', nonce)

  // SEC-026: Build nonce-based CSP for page routes
  // API routes use static CSP from next.config.ts headers — skip them here
  const isDev = process.env.NODE_ENV !== 'production'
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' ${isDev ? "'unsafe-eval' " : ""}'nonce-${nonce}' https://js.stripe.com https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com https://*.sentry.io https://browser.sentry-cdn.com`,
    "style-src 'self' 'unsafe-inline'", // Fallback for older browsers
    "style-src-elem 'self' 'unsafe-inline'", // Allow framer-motion inline style injection
    "style-src-attr 'unsafe-inline'", // SEC-072: Allow React inline style={} attributes
    "img-src 'self' blob: data: https://*.supabase.co https://www.gravatar.com https://www.googletagmanager.com https://www.google-analytics.com",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self' https://js.stripe.com https://vercel.live",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.intuit.com https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com https://*.analytics.google.com https://*.g.doubleclick.net https://*.sentry.io",
    "upgrade-insecure-requests",
  ].join('; ')

  if (!isApiRoute) {
    requestHeaders.set('Content-Security-Policy', cspHeader)
  }

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
  const publicRoutes = ['/login', '/signup', '/activate', '/auth/callback', '/auth/confirm', '/pricing', '/terms', '/privacy', '/invite', '/api/invites', '/api/cron', '/api/health', '/api/public', '/api/report', '/report', '/api/task-share', '/task', '/forgot-password', '/reset-password', '/api/stripe/webhook', '/assess', '/api/assess', '/api/email/unsubscribe']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Admin public routes (login/forgot-password on admin subdomain)
  const adminPublicRoutes = ['/admin/login', '/admin/forgot-password']
  const isAdminPublicRoute = adminPublicRoutes.some(route => pathname.startsWith(route))

  // SECURITY: Check for stale sessions (user was inactive > 30 min or closed browser)
  // The last_activity cookie has max-age=1800 — the browser auto-deletes it when it expires.
  // If Supabase auth cookies exist but last_activity is gone, the session is stale.
  // IMPORTANT: Only redirect if getUser() also failed (!user). If the user is valid,
  // this is a new session (e.g., auto-login after assessment) where the activity cookie
  // was never set. The activity cookie will be set on the response (line ~397) and the
  // client-side useIdleTimeout hook handles ongoing inactivity tracking.
  const lastActivity = request.cookies.get(SESSION_COOKIE_NAME)
  const hasAuthCookies = request.cookies.getAll().some(c => c.name.startsWith('sb-'))

  if (!lastActivity && hasAuthCookies && !user && !isPublicRoute && !isApiRoute && !isAdminPublicRoute) {
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
    const rewriteResponse = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    })
    if (!isApiRoute) {
      rewriteResponse.headers.set('Content-Security-Policy', cspHeader)
    }
    return rewriteResponse
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
      if (!isApiRoute) {
        supabaseResponse.headers.set('Content-Security-Policy', cspHeader)
      }
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
      if (!isApiRoute) {
        supabaseResponse.headers.set('Content-Security-Policy', cspHeader)
      }
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

  // SEC-026: Set nonce-based CSP response header for page routes
  if (!isApiRoute) {
    supabaseResponse.headers.set('Content-Security-Policy', cspHeader)
  }

  // SEC-043: Dynamic CORS for API routes — reflect allowed origin instead of static single-origin
  if (isApiRoute) {
    const origin = request.headers.get('origin')
    if (origin && isAllowedOrigin(origin)) {
      supabaseResponse.headers.set('Access-Control-Allow-Origin', origin)
      supabaseResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      supabaseResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      supabaseResponse.headers.set('Access-Control-Allow-Credentials', 'true')
      supabaseResponse.headers.set('Access-Control-Max-Age', '86400')
    }
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
