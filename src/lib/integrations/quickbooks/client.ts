import OAuthClient from 'intuit-oauth'

// Environment check
const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET
const QUICKBOOKS_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI
const QUICKBOOKS_ENVIRONMENT = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox' // 'sandbox' or 'production'

if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_CLIENT_SECRET || !QUICKBOOKS_REDIRECT_URI) {
  console.warn('QuickBooks credentials not configured. Integration will be disabled.')
}

// Create OAuth client instance
export function createQuickBooksClient(): OAuthClient {
  return new OAuthClient({
    clientId: QUICKBOOKS_CLIENT_ID!,
    clientSecret: QUICKBOOKS_CLIENT_SECRET!,
    environment: QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production',
    redirectUri: QUICKBOOKS_REDIRECT_URI!,
  })
}

// Check if QuickBooks is configured
export function isQuickBooksConfigured(): boolean {
  return Boolean(QUICKBOOKS_CLIENT_ID && QUICKBOOKS_CLIENT_SECRET && QUICKBOOKS_REDIRECT_URI)
}

// Get authorization URL
export function getAuthorizationUrl(state: string): string {
  const oauthClient = createQuickBooksClient()
  return oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state,
  })
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(url: string): Promise<{
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date
  realmId: string
}> {
  const oauthClient = createQuickBooksClient()

  let authResponse
  try {
    authResponse = await oauthClient.createToken(url)
  } catch (err: unknown) {
    // intuit-oauth throws errors with { error, error_description, intuit_tid }
    const oauthError = err as { error?: string; error_description?: string; intuit_tid?: string; message?: string }
    const detail = oauthError.error_description || oauthError.error || oauthError.message || 'Unknown OAuth error'
    console.error('[QuickBooks] Token exchange failed:', {
      error: oauthError.error,
      description: oauthError.error_description,
      tid: oauthError.intuit_tid,
    })
    throw new Error(`QuickBooks authentication failed: ${detail}`)
  }

  const token = authResponse.getJson()

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    realmId: token.realmId || oauthClient.getToken().realmId || '',
  }
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date
}> {
  const oauthClient = createQuickBooksClient()
  oauthClient.setToken({
    refresh_token: refreshToken,
    access_token: '', // Will be refreshed
  })

  const authResponse = await oauthClient.refresh()
  const token = authResponse.getJson()

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
  }
}

// Revoke tokens at Intuit (call on disconnect)
export async function revokeTokens(refreshToken: string): Promise<void> {
  const oauthClient = createQuickBooksClient()
  // intuit-oauth has no type declarations; revoke() exists at runtime
  await (oauthClient as unknown as { revoke(params: { refresh_token: string }): Promise<unknown> })
    .revoke({ refresh_token: refreshToken })
}

// Get API base URL based on environment
export function getApiBaseUrl(): string {
  return QUICKBOOKS_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'
}
