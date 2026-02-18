/**
 * Parse user agent string into device info
 * Shared utility used by session tracking and product analytics
 */
export function parseUserAgent(userAgent: string | null): {
  deviceType: string
  browser: string
  os: string
} {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'Unknown', os: 'Unknown' }
  }

  // Detect device type
  let deviceType = 'desktop'
  if (/mobile/i.test(userAgent)) {
    deviceType = 'mobile'
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet'
  }

  // Detect browser
  let browser = 'Unknown'
  if (/edg/i.test(userAgent)) {
    browser = 'Microsoft Edge'
  } else if (/chrome/i.test(userAgent)) {
    browser = 'Chrome'
  } else if (/firefox/i.test(userAgent)) {
    browser = 'Firefox'
  } else if (/safari/i.test(userAgent)) {
    browser = 'Safari'
  } else if (/opera|opr/i.test(userAgent)) {
    browser = 'Opera'
  }

  // Detect OS
  let os = 'Unknown'
  if (/windows/i.test(userAgent)) {
    os = 'Windows'
  } else if (/macintosh|mac os/i.test(userAgent)) {
    os = 'macOS'
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux'
  } else if (/android/i.test(userAgent)) {
    os = 'Android'
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = 'iOS'
  }

  return { deviceType, browser, os }
}
