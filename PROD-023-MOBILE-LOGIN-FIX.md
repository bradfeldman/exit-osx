# PROD-023: Mobile Login Page Jumping Bug - Fix Summary

## Problem
The login page on mobile devices exhibited a "jumping" behavior where the page bounced back and forth. This was particularly noticeable on iOS devices (iPhone, iPad) when the keyboard appeared or when navigating to/from the login page.

## Root Causes

### 1. No Explicit Viewport Configuration
- **Issue**: Next.js 15 auto-injects a basic viewport meta tag, but it wasn't preventing iOS from zooming on input focus
- **Impact**: iOS Safari would zoom in when tapping input fields, causing layout shift and disorientation
- **Fix**: Added explicit `viewport` export in `src/app/layout.tsx` with `maximumScale: 1` and `userScalable: false` to prevent zoom (safe because all inputs are 16px+ base font size)

### 2. `min-h-screen` Uses Static `100vh`
- **Issue**: The login page used `min-h-screen` (Tailwind's default, which maps to `100vh`). On mobile Safari, the viewport height changes when the address bar shows/hides, causing layout jumps
- **Impact**: Page container would resize when scrolling, keyboard appeared, or address bar toggled
- **Fix**: Changed to `min-h-[100dvh]` (dynamic viewport height) which accounts for browser chrome changes

### 3. Input Focus Scale Animations
- **Issue**: All inputs had `focus:scale-[1.01]` class that triggered a subtle zoom on focus
- **Impact**: When keyboard appeared (which already shifts viewport), the scale animation compounded the visual jump
- **Fix**: Removed all `focus:scale-[*]` classes from email, password, and 2FA code inputs

### 4. Button Hover/Tap Animations
- **Issue**: Login button had Framer Motion `whileHover` and `whileTap` animations that scaled and moved the button
- **Impact**: Invisible on touch devices (no hover state), and tap animations caused unnecessary movement during form submission
- **Fix**: Disabled animations on login button with `animated={false}` prop

### 5. Middleware Redirect Loop Potential
- **Issue**: Middleware was redirecting authenticated users from `/login` to `/dashboard` on all requests, including POST (form submission)
- **Impact**: Could interrupt login flow or cause redirect loops if auth state flickered during login
- **Fix**: Added `request.method === 'GET'` guard to only redirect on page loads, not form submissions

### 6. No Safe Area Inset Handling
- **Issue**: No CSS support for `env(safe-area-inset-*)` on notched devices (iPhone X+, Dynamic Island)
- **Impact**: Content could be obscured by notch or home indicator
- **Fix**: Added CSS custom properties and `@supports` block for safe area insets

## Files Modified

### 1. `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/layout.tsx`
```typescript
// Added viewport export to prevent zoom and ensure stable layout
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevents iOS zoom on input focus
  userScalable: false,
};
```

### 2. `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/(auth)/login/page.tsx`
**Changes:**
- `min-h-screen` → `min-h-[100dvh]` on container div
- Removed `focus:scale-[1.01]` from all inputs
- Removed `transition-all duration-200` from inputs (kept base transitions in component)
- Added `autoComplete="email"` to email input
- Added `autoComplete="current-password"` to password input
- Added `autoComplete="one-time-code"` to 2FA input
- Added `animated={false}` to submit button

### 3. `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/middleware.ts`
```typescript
// Line 321 - Added GET-only guard to prevent interrupting form submissions
if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/admin/login') && request.method === 'GET') {
  // ... redirect logic
}
```

### 4. `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/globals.css`
**Added:**
- Safe area inset CSS variables in `:root`
- Mobile-specific fixes for iOS Safari (`@media (max-width: 768px)`)
- `-webkit-fill-available` height fix for iOS
- `100dvh` support detection with `@supports`
- Touch action constraint (`touch-action: pan-y`) on full-height containers
- Safe area inset padding with `@supports (padding: env(safe-area-inset-top))`

## Testing Checklist

### Device Matrix (Priority Order)
1. **iPhone SE (375x667)** - smallest modern iPhone, most constrained viewport
2. **iPhone 15 (390x844)** - standard modern iPhone with Dynamic Island
3. **iPhone 15 Pro Max (430x932)** - largest iPhone, notched
4. **iPad (768x1024)** - tablet breakpoint boundary
5. **Samsung Galaxy S21 (360x800)** - Android Chrome behavior

### Test Cases

#### 1. Login Page Load
- [ ] Page loads without horizontal scroll at all viewport widths (320px minimum)
- [ ] No content obscured by notch/home indicator (iPhone X+)
- [ ] Logo, heading, form, and footer all visible without scrolling (landscape mode)
- [ ] No flash of unstyled content or layout shift on initial render

#### 2. Input Focus & Keyboard Appearance
- [ ] Email input: Tap to focus, keyboard appears without layout jump
- [ ] Password input: Tap to focus, keyboard remains stable, page doesn't scroll unexpectedly
- [ ] No zoom on input focus (iOS Safari)
- [ ] Form remains visible above keyboard (submit button accessible)
- [ ] Switching between email/password inputs doesn't cause page bounce
- [ ] Keyboard dismiss (tap outside or done button) doesn't cause layout shift

#### 3. Portrait ↔ Landscape Rotation
- [ ] Rotate device while login page is visible — no layout break
- [ ] Rotate device with keyboard open — keyboard closes gracefully, layout stable
- [ ] Rotate during login submission — loader state preserved, no double-submit

#### 4. Form Submission Flow
- [ ] Enter credentials and tap "Sign In" — no page jump before/during/after submission
- [ ] Successful login redirects to dashboard without flicker
- [ ] Failed login (invalid credentials) shows error without layout shift
- [ ] 2FA flow: Entering code doesn't cause keyboard-related jumps
- [ ] Account lockout message displays without layout shift

#### 5. Redirect Scenarios
- [ ] Navigate to `/login` while logged in → redirects to `/dashboard` (no loop)
- [ ] Navigate to `/login?next=/some-page` while logged in → redirects to `/dashboard` (no loop)
- [ ] Timeout redirect (`/login?reason=timeout`) → loads page, shows banner, no jump
- [ ] Expired link redirect (`/login?error=link_expired`) → loads page, shows banner, no jump

#### 6. Browser-Specific Tests
- [ ] **iOS Safari**: Address bar hide/show doesn't cause jump
- [ ] **iOS Safari**: Pull-to-refresh disabled or non-disruptive
- [ ] **iOS Safari**: Safe area insets respected (no content under notch)
- [ ] **Android Chrome**: URL bar hide/show doesn't cause jump
- [ ] **Android Chrome**: No font boosting issues (16px base font prevents this)

#### 7. Accessibility
- [ ] All inputs have proper `autocomplete` attributes (browser can autofill)
- [ ] Tab order is logical (email → password → forgot link → submit)
- [ ] Focus visible on all interactive elements (keyboard navigation)
- [ ] No motion for users with `prefers-reduced-motion` enabled

### Performance Targets
- **LCP (Largest Contentful Paint)**: < 2.5s on 4G, < 1s on WiFi
- **CLS (Cumulative Layout Shift)**: < 0.1 (good), < 0.25 (acceptable)
- **FID (First Input Delay)**: < 100ms
- **Time to Interactive**: < 3s on 4G

### Visual Regression Testing
Compare before/after screenshots at key breakpoints:
- 375px (iPhone SE portrait)
- 390px (iPhone 15 portrait)
- 430px (iPhone 15 Pro Max portrait)
- 768px (iPad portrait)
- 1024px (Desktop)

## Expected Outcomes

### What Should Now Work
✅ Login page loads with stable layout on all mobile devices
✅ Keyboard appearance/disappearance doesn't cause page jumping
✅ No zoom on input focus (iOS Safari)
✅ No redirect loops when navigating to/from login page
✅ Safe area insets respected on notched devices
✅ Portrait/landscape rotation handled gracefully
✅ Form submission completes without layout disruption

### Known Remaining Limitations
⚠️ Button/input default heights still below 44px in most components (only login page fixed)
⚠️ No bottom navigation for mobile (hamburger menu required for all navigation)
⚠️ Fixed `p-6` padding on dashboard pages (not optimized for small screens)
⚠️ Hover animations still present on other pages (invisible to touch users)

## Rollback Plan

If issues arise, revert these commits in order:

1. Revert `src/app/globals.css` changes (remove mobile-specific CSS)
2. Revert `src/app/(auth)/login/page.tsx` changes (restore old class names)
3. Revert `src/middleware.ts` changes (remove GET guard)
4. Revert `src/app/layout.tsx` changes (remove viewport export)

All changes are additive (no breaking changes to existing functionality). Rolling back will restore previous behavior without data loss or breaking changes.

## Future Enhancements

Based on this fix, consider applying similar patterns to:
1. Signup page (`src/app/(auth)/signup/page.tsx`)
2. Forgot password page (`src/app/(auth)/forgot-password/page.tsx`)
3. Dashboard pages with full-height layouts
4. Modal/drawer components that cover full screen on mobile
5. All form inputs (raise minimum height to 44px globally)

## References
- [iOS Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/inputs)
- [MDN - Using the viewport meta tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)
- [CSS Tricks - The trick to viewport units on mobile](https://css-tricks.com/the-trick-to-viewport-units-on-mobile/)
- [WebKit Blog - Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
