import { createBrowserClient } from '@supabase/ssr'

// Session-scoped cookie options: no maxAge/expires means cookies are deleted
// when the browser is fully closed, preventing persistent sessions.
const sessionCookieOptions = { path: '/', sameSite: 'lax' as const }

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: sessionCookieOptions,
    }
  )
}
