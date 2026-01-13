import { createHash } from 'crypto'

type GravatarDefault = 'mp' | 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | 'blank' | '404'

interface GravatarOptions {
  size?: number
  default?: GravatarDefault
  rating?: 'g' | 'pg' | 'r' | 'x'
}

/**
 * Generate a Gravatar URL from an email address
 * @param email - The user's email address
 * @param options - Optional settings for size, default image, and rating
 * @returns The Gravatar URL
 */
export function getGravatarUrl(email: string, options: GravatarOptions = {}): string {
  const { size = 80, default: defaultImg = 'mp', rating = 'g' } = options

  // Trim whitespace and lowercase per Gravatar spec
  const normalizedEmail = email.trim().toLowerCase()

  // Generate MD5 hash
  const hash = createHash('md5').update(normalizedEmail).digest('hex')

  // Build URL with query params
  const params = new URLSearchParams({
    s: size.toString(),
    d: defaultImg,
    r: rating,
  })

  return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`
}

/**
 * Generate initials from a name for fallback avatar
 * @param name - The user's name
 * @returns 1-2 character initials
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
