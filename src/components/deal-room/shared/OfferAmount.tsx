'use client'

interface OfferAmountProps {
  amount: number
  type: 'IOI' | 'LOI'
}

export function OfferAmount({ amount, type }: OfferAmountProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount >= 1_000_000 ? 1 : 0,
    notation: amount >= 1_000_000 ? 'compact' : 'standard',
  }).format(amount)

  return (
    <span className="text-xs font-semibold text-[var(--burnt-orange)]">
      {formatted} {type}
    </span>
  )
}
