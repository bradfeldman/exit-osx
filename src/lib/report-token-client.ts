/**
 * Client-side helper to get the shareable report URL.
 * Calls a lightweight API endpoint to generate the signed token.
 */
export async function getReportShareUrl(companyId: string): Promise<string | null> {
  try {
    const res = await fetch('/api/report/share-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    })
    if (!res.ok) return null
    const { url } = await res.json()
    return url
  } catch {
    return null
  }
}
