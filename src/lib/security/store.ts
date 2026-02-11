/**
 * Security Store Abstraction
 * Provides a unified interface for storing security-related data
 * Uses Redis in production (if configured) or falls back to in-memory storage
 *
 * IMPORTANT: In-memory storage will NOT work with multiple server instances.
 * Configure REDIS_URL in production for proper distributed rate limiting and lockouts.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreValue = string | number | Record<string, any>

interface StoreInterface {
  get<T extends StoreValue>(key: string): Promise<T | null>
  set(key: string, value: StoreValue, ttlMs?: number): Promise<void>
  increment(key: string, ttlMs?: number): Promise<number>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

// In-memory store implementation
class MemoryStore implements StoreInterface {
  private store = new Map<string, { value: StoreValue; expiresAt?: number }>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.store.delete(key)
      }
    }
  }

  async get<T extends StoreValue>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async set(key: string, value: StoreValue, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    })
  }

  async increment(key: string, ttlMs?: number): Promise<number> {
    const current = await this.get<number>(key)
    const newValue = (current || 0) + 1
    await this.set(key, newValue, ttlMs)
    return newValue
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  // For testing
  clear() {
    this.store.clear()
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// Redis client type (simplified for dynamic import)
interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, duration?: number): Promise<unknown>
  incr(key: string): Promise<number>
  pexpire(key: string, milliseconds: number): Promise<number>
  del(key: string): Promise<number>
  exists(key: string): Promise<number>
}

// Redis store implementation (lazy loaded)
class RedisStore implements StoreInterface {
  private client: RedisClient | null = null
  private connectionPromise: Promise<RedisClient> | null = null

  private async getClient(): Promise<RedisClient> {
    if (this.client) return this.client

    if (!this.connectionPromise) {
      this.connectionPromise = (async () => {
        const Redis = (await import('ioredis')).default
        const client = new Redis(process.env.REDIS_URL!, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        })

        this.client = client as unknown as RedisClient
        return this.client
      })()
    }

    return this.connectionPromise
  }

  async get<T extends StoreValue>(key: string): Promise<T | null> {
    const client = await this.getClient()
    const value = await client.get(key)
    if (!value) return null

    try {
      return JSON.parse(value) as T
    } catch {
      return value as T
    }
  }

  async set(key: string, value: StoreValue, ttlMs?: number): Promise<void> {
    const client = await this.getClient()
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value)

    if (ttlMs) {
      await client.set(key, serialized, 'PX', ttlMs)
    } else {
      await client.set(key, serialized)
    }
  }

  async increment(key: string, ttlMs?: number): Promise<number> {
    const client = await this.getClient()
    const result = await client.incr(key)

    if (ttlMs && result === 1) {
      // Set expiry only on first increment
      await client.pexpire(key, ttlMs)
    }

    return result
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient()
    await client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.getClient()
    const result = await client.exists(key)
    return result === 1
  }
}

// SECURITY FIX (PROD-091 #3): Determine which store to use.
// On Vercel serverless, each function invocation may run in a separate isolate,
// so in-memory state is NOT shared across instances. This means rate limiting and
// account lockout counters are per-instance only — an attacker can bypass limits
// by hitting different instances.
//
// RECOMMENDATION: Provision Upstash Redis (Vercel integration) and set REDIS_URL
// in Vercel environment variables. Upstash provides a serverless Redis that works
// with ioredis and costs ~$0 for low-volume usage.
//
// TODO: Set up Upstash Redis and configure REDIS_URL for production to enable
// distributed rate limiting and account lockout across all serverless instances.
let securityStore: StoreInterface

if (process.env.REDIS_URL) {
  securityStore = new RedisStore()
  if (process.env.NODE_ENV !== 'production') {
    console.info('[Security] Using Redis store for rate limiting and lockouts')
  }
} else {
  securityStore = new MemoryStore()
  if (process.env.NODE_ENV === 'production') {
    // Log at error level so this surfaces in monitoring/alerting dashboards
    console.error(
      '[Security] CRITICAL: Using in-memory store for rate limiting. ' +
        'Rate limits and account lockouts will NOT be enforced across Vercel serverless instances. ' +
        'Set REDIS_URL (e.g., Upstash Redis) for production deployments.'
    )
  }
}

export { securityStore }
export type { StoreInterface }
