/**
 * Fetch wrapper with exponential backoff retry logic
 * Handles 429 rate limit errors and transient failures
 */

interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  retryOn?: number[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryOn: [429, 500, 502, 503, 504],
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  // Add jitter (random 0-50% of the delay)
  const jitter = exponentialDelay * Math.random() * 0.5
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Fetch with automatic retry on rate limit (429) and server errors
 *
 * @example
 * const response = await fetchWithRetry('/api/data')
 * const data = await response.json()
 *
 * @example
 * const response = await fetchWithRetry('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ foo: 'bar' })
 * }, { maxRetries: 5 })
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | null = null
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, init)

      // If response is OK or not a retryable status, return it
      if (response.ok || !opts.retryOn.includes(response.status)) {
        return response
      }

      // Store response for potential return after all retries
      lastResponse = response

      // If this was the last attempt, return the response as-is
      if (attempt === opts.maxRetries) {
        return response
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay)

      // Check for Retry-After header (common with 429 responses)
      const retryAfter = response.headers.get('Retry-After')
      const retryDelay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : delay

      console.warn(
        `[fetchWithRetry] ${response.status} on ${url}, retrying in ${Math.round(retryDelay)}ms (attempt ${attempt + 1}/${opts.maxRetries})`
      )

      await sleep(retryDelay)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If this was the last attempt, throw the error
      if (attempt === opts.maxRetries) {
        throw lastError
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay)

      console.warn(
        `[fetchWithRetry] Network error on ${url}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${opts.maxRetries}):`,
        lastError.message
      )

      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  if (lastResponse) {
    return lastResponse
  }
  throw lastError || new Error('Fetch failed after retries')
}

/**
 * Fetch JSON with retry - convenience wrapper
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<T> {
  const response = await fetchWithRetry(url, init, options)

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error')
    throw new Error(`HTTP ${response.status}: ${error}`)
  }

  return response.json()
}
