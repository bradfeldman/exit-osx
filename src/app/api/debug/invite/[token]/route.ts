import { NextResponse } from 'next/server'
import { requireDevEndpoint, logDevEndpointAccess } from '@/lib/security'

// SECURITY FIX (PROD-060): Protected with requireDevEndpoint — was previously
// accessible without any auth in production, leaking invite data and DB error details.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const devCheck = requireDevEndpoint()
  if (devCheck) return devCheck

  logDevEndpointAccess('GET /api/debug/invite/[token]')

  // In dev mode, return a minimal indicator that the route exists
  // No database queries or invite lookups — the original code leaked invite data
  // and raw error strings. Use the proper /api/invites/[token] GET endpoint instead.
  const { token } = await params
  return NextResponse.json({
    message: 'Debug endpoint. Use /api/invites/[token] for invite lookup.',
    tokenPrefix: token?.substring(0, 8) + '...',
  })
}
