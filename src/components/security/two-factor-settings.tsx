'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getTwoFactorStatus,
  initializeTwoFactor,
  verifyAndEnableTwoFactor,
  disableTwoFactor,
  regenerateBackupCodes,
} from '@/app/actions/two-factor'
import { Shield, ShieldCheck, ShieldOff, Copy, Check, AlertTriangle, Key } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

type SetupStep = 'idle' | 'scanning' | 'verifying' | 'backup' | 'complete'

export function TwoFactorSettings() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setupStep, setSetupStep] = useState<SetupStep>('idle')
  const [secret, setSecret] = useState('')
  const [qrCodeUri, setQrCodeUri] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [regenerateCode, setRegenerateCode] = useState('')

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const status = await getTwoFactorStatus()
      setEnabled(status.enabled)
    } catch {
      setError('Failed to load 2FA status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleStartSetup = async () => {
    setError(null)
    setSetupStep('scanning')

    const result = await initializeTwoFactor()
    if (result.success && result.secret && result.qrCodeUri && result.backupCodes) {
      setSecret(result.secret)
      setQrCodeUri(result.qrCodeUri)
      setBackupCodes(result.backupCodes)
    } else {
      setError(result.error || 'Failed to initialize 2FA')
      setSetupStep('idle')
    }
  }

  const handleVerify = async () => {
    setError(null)

    const result = await verifyAndEnableTwoFactor(verificationCode)
    if (result.success) {
      setSetupStep('backup')
    } else {
      setError(result.error || 'Invalid code')
    }
  }

  const handleCompleteSetup = () => {
    setSetupStep('complete')
    setEnabled(true)
    setTimeout(() => {
      setSetupStep('idle')
      setSecret('')
      setQrCodeUri('')
      setBackupCodes([])
      setVerificationCode('')
    }, 2000)
  }

  const handleDisable = async () => {
    setError(null)

    const result = await disableTwoFactor(disableCode)
    if (result.success) {
      setEnabled(false)
      setShowDisableDialog(false)
      setDisableCode('')
    } else {
      setError(result.error || 'Failed to disable 2FA')
    }
  }

  const handleRegenerateBackupCodes = async () => {
    setError(null)

    const result = await regenerateBackupCodes(regenerateCode)
    if (result.success && result.backupCodes) {
      setBackupCodes(result.backupCodes)
      setShowRegenerateDialog(false)
      setRegenerateCode('')
      setSetupStep('backup')
    } else {
      setError(result.error || 'Failed to regenerate backup codes')
    }
  }

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const copyAllBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopiedIndex(-1)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-10 bg-muted rounded w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {enabled ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <Shield className="h-5 w-5" />
            )}
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {setupStep === 'idle' && (
            <>
              {enabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <ShieldCheck className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">2FA is enabled</p>
                      <p className="text-sm text-green-700">
                        Your account is protected with two-factor authentication
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowRegenerateDialog(true)}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Regenerate Backup Codes
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDisableDialog(true)}
                    >
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Disable 2FA
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Two-factor authentication adds an extra layer of security by requiring
                    a code from your authenticator app in addition to your password.
                  </p>
                  <Button onClick={handleStartSetup}>
                    <Shield className="h-4 w-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                </div>
              )}
            </>
          )}

          {setupStep === 'scanning' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Step 1: Scan QR Code</h4>
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app (Google Authenticator,
                  Authy, 1Password, etc.)
                </p>

                <div className="flex justify-center p-4 bg-white border rounded-lg">
                  <QRCodeSVG
                    value={qrCodeUri}
                    size={192}
                    level="M"
                    includeMargin
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Or enter this code manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-muted rounded font-mono text-sm break-all">
                      {secret}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(secret, -2)}
                    >
                      {copiedIndex === -2 ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Step 2: Enter Verification Code</h4>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>

                <div className="flex gap-3">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="w-32 text-center text-lg font-mono tracking-widest"
                  />
                  <Button
                    onClick={handleVerify}
                    disabled={verificationCode.length !== 6}
                  >
                    Verify
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setSetupStep('idle')
                  setSecret('')
                  setQrCodeUri('')
                  setVerificationCode('')
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          {setupStep === 'backup' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Save your backup codes</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Store these codes in a safe place. You can use them to access your
                      account if you lose your authenticator device.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded font-mono text-sm"
                  >
                    <span>{code}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(code, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={copyAllBackupCodes}>
                  {copiedIndex === -1 ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All Codes
                    </>
                  )}
                </Button>
                <Button onClick={handleCompleteSetup}>
                  I&apos;ve Saved My Codes
                </Button>
              </div>
            </div>
          )}

          {setupStep === 'complete' && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900">2FA enabled successfully!</p>
                <p className="text-sm text-green-700">
                  Your account is now protected with two-factor authentication
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current 2FA code or a backup code to disable two-factor authentication.
              This will make your account less secure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="disableCode">Verification Code</Label>
              <Input
                id="disableCode"
                type="text"
                placeholder="000000 or XXXX-XXXX"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={disableCode.length < 6}
            >
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              This will invalidate your existing backup codes and generate new ones.
              Enter your current 2FA code to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="regenerateCode">Verification Code</Label>
              <Input
                id="regenerateCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={regenerateCode}
                onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, ''))}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegenerateBackupCodes}
              disabled={regenerateCode.length !== 6}
            >
              Regenerate Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
