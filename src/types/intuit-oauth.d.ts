declare module 'intuit-oauth' {
  interface OAuthClientConfig {
    clientId: string
    clientSecret: string
    environment: 'sandbox' | 'production'
    redirectUri: string
  }

  interface TokenData {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
    x_refresh_token_expires_in: number
    realmId?: string
  }

  interface TokenInput {
    access_token: string
    refresh_token: string
    realmId?: string
  }

  interface AuthResponse {
    getJson(): TokenData
  }

  class OAuthClient {
    constructor(config: OAuthClientConfig)

    authorizeUri(options: {
      scope: string[]
      state?: string
    }): string

    createToken(uri: string): Promise<AuthResponse>

    refresh(): Promise<AuthResponse>

    setToken(token: TokenInput): void

    getToken(): TokenData

    static scopes: {
      Accounting: string
      Payment: string
      Payroll: string
      TimeTracking: string
      Benefits: string
      Profile: string
      Email: string
      Phone: string
      Address: string
      OpenId: string
    }

    static environment: {
      sandbox: string
      production: string
    }
  }

  export = OAuthClient
}
