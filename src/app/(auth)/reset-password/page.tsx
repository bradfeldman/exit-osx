'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasValidSession, setHasValidSession] = useState(false)

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const supabase = createClient()

      // Supabase automatically handles the token from the URL hash
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        setError('Invalid or expired reset link. Please request a new one.')
        setHasValidSession(false)
      } else {
        setHasValidSession(true)
      }
      setChecking(false)
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking session
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-icon.png"
              alt="Exit OSx"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <Image
              src="/wordmark.svg"
              alt="Exit OSx"
              width={120}
              height={34}
              className="h-8 w-auto brightness-0 invert"
            />
          </Link>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Build a Business<br />Buyers Want to Own
            </h1>
            <p className="text-lg opacity-90 max-w-md">
              Get your valuation estimate, Buyer Readiness Score, and a personalized roadmap to maximize your exit outcome.
            </p>
          </div>

        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="/logo-icon.png"
                alt="Exit OSx"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <Image
                src="/wordmark.svg"
                alt="Exit OSx"
                width={100}
                height={28}
                className="h-6 w-auto"
              />
            </Link>
          </div>

          {!hasValidSession ? (
            // Invalid/expired link state
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Link Expired</h2>
                <p className="mt-2 text-muted-foreground">
                  This password reset link is invalid or has expired.
                </p>
              </div>
              <Button asChild className="w-full h-12">
                <Link href="/forgot-password">Request New Link</Link>
              </Button>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
              >
                Back to sign in
              </Link>
            </div>
          ) : success ? (
            // Success state
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Password Updated</h2>
                <p className="mt-2 text-muted-foreground">
                  Your password has been successfully reset. Redirecting you to your dashboard...
                </p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            </div>
          ) : (
            // Password reset form
            <>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground">
                  Set new password
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 pr-12"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12"
                    minLength={8}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={loading || !password || !confirmPassword}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
