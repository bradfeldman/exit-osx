'use client'

import { useState, useCallback, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'
import { secureLogin } from '@/app/actions/auth'

/**
 * TEMPORARY: Incremental rebuild of login page for iOS debugging.
 * Round 3c: Add lucide icons back (no next/image).
 * If this loops: lucide-react is the culprit.
 * If this works: next/image is the culprit.
 */

function SearchParamsReader({ onChange }: {
  onChange: (redirectUrl: string) => void
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const next = searchParams.get('next') || '/dashboard'
    onChange(next)
  }, [searchParams, onChange])

  return null
}

export default function LoginSafePage() {
  const [redirectUrl, setRedirectUrl] = useState('/dashboard')

  const handleSearchParams = useCallback((url: string) => {
    setRedirectUrl(url)
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsReader onChange={handleSearchParams} />
      </Suspense>
      <LoginPageContent redirectUrl={redirectUrl} />
    </>
  )
}

function LoginPageContent({ redirectUrl }: { redirectUrl: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await secureLogin(email, password)

      if (!result.success) {
        setError(result.error || 'Invalid email or password')
        return
      }

      router.replace(redirectUrl)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Right side - Login Form (no left branding panel, no images) */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background min-h-[100dvh] lg:min-h-0">
        <div className="w-full max-w-md space-y-8 py-8">
          {/* Plain text logo instead of next/image */}
          <div className="text-center">
            <span className="text-2xl font-bold text-primary">Exit OSx</span>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold font-display text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-muted-foreground">
              Sign in to continue to your dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="min-h-[4rem]">
              {error && (
                <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors -m-2 p-2 rounded-md"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading}
              animated={false}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create one for free
              </Link>
            </p>
            <a href="https://exitosx.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block">
              &larr; Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
