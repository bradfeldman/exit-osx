import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  return _stripe
}

// Convenience alias — lazily initialized on first access
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Map plan + billing cycle to Stripe Price IDs
export const STRIPE_PRICE_MAP: Record<string, string> = {
  'growth-monthly': 'price_1T0lGECcx9aWfHqLlz6BSDRO',
  'growth-annual': 'price_1T0wklCcx9aWfHqLjPzEBXUe',
  'deal-room-monthly': 'price_1T0n6UCcx9aWfHqLoWciIgin',
  'deal-room-annual': 'price_1T0wnNCcx9aWfHqLn7kOmcVf',
}

// Reverse lookup: Stripe Price ID → plan tier
export function getPlanTierFromPriceId(priceId: string): 'GROWTH' | 'DEAL_ROOM' | null {
  for (const [key, value] of Object.entries(STRIPE_PRICE_MAP)) {
    if (value === priceId) {
      return key.startsWith('growth') ? 'GROWTH' : 'DEAL_ROOM'
    }
  }
  return null
}

// Reverse lookup: Stripe Price ID → billing cycle
export function getBillingCycleFromPriceId(priceId: string): 'MONTHLY' | 'ANNUAL' | null {
  for (const [key, value] of Object.entries(STRIPE_PRICE_MAP)) {
    if (value === priceId) {
      return key.endsWith('monthly') ? 'MONTHLY' : 'ANNUAL'
    }
  }
  return null
}
