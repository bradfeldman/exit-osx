/**
 * Security Store Abstraction
 * Provides a unified interface for storing security-related data
 * Uses Upstash Redis in production (Edge-compatible via HTTP) or falls back to in-memory storage
 */

import { Redis } from '@upstash/redis'

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

// Upstash Redis store implementation (Edge Runtime compatible via HTTP)
class RedisStore implements StoreInterface {
  private client: Redis

  constructor() {
    this.client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }

  async get<T extends StoreValue>(key: string): Promise<T | null> {
    const value = await this.client.get<T>(key)
    return value ?? null
  }

  async set(key: string, value: StoreValue, ttlMs?: number): Promise<void> {
    if (ttlMs) {
      await this.client.set(key, value, { px: ttlMs })
    } else {
      await this.client.set(key, value)
    }
  }

  async increment(key: string, ttlMs?: number): Promise<number> {
    const result = await this.client.incr(key)

    if (ttlMs && result === 1) {
      // Set expiry only on first increment
      await this.client.pexpire(key, ttlMs)
    }

    return result
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }
}

let securityStore: StoreInterface

if (process.env.UPSTASH_REDIS_REST_URL) {
  securityStore = new RedisStore()
  if (process.env.NODE_ENV !== 'production') {
    console.info('[Security] Using Upstash Redis store for rate limiting and lockouts')
  }
} else {
  securityStore = new MemoryStore()
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[Security] CRITICAL: Using in-memory store for rate limiting. ' +
        'Rate limits and account lockouts will NOT be enforced across Vercel serverless instances. ' +
        'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production deployments.'
    )
  }
}

export { securityStore }
export type { StoreInterface }
