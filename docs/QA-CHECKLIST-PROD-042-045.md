# QA Testing Checklist: PROD-042 & PROD-045

## Pre-Testing Setup

- [ ] Pull latest changes from branch
- [ ] Run `npm install` to ensure dependencies are current
- [ ] Run `npm run build` to verify TypeScript compilation
- [ ] Run `npm run test` to verify all unit tests pass
- [ ] Start dev server: `npm run dev`
- [ ] Open browser DevTools (Network tab + Console)

---

## PROD-042: Contacts Page Refresh Bug

### Test Environment Setup
1. [ ] Navigate to Deal Room
2. [ ] Go to Contacts tab
3. [ ] Add at least 10 contacts (or use existing deal with contacts)
4. [ ] Verify contacts are displayed in table

### Test Case 1: Category Change Without Refresh
**Steps:**
1. [ ] Scroll to middle/bottom of contacts list
2. [ ] Note your scroll position
3. [ ] Click a contact to open detail panel
4. [ ] Change category (e.g., from "Advisor" to "Management")
5. [ ] Observe UI behavior

**Expected Results:**
- [ ] Category updates immediately (no delay)
- [ ] No loading spinner appears
- [ ] Detail panel stays open
- [ ] Scroll position is preserved
- [ ] No white flash or layout shift
- [ ] **Network tab shows only 1 PATCH request (no GET refresh)**

**Fail Criteria:**
- ❌ Page refreshes
- ❌ Scroll jumps to top
- ❌ Loading spinner appears
- ❌ Network tab shows GET request to `/participants`

### Test Case 2: Description Update Without Refresh
**Steps:**
1. [ ] Open a contact detail panel
2. [ ] Edit the description field
3. [ ] Tab out or click elsewhere (blur event)
4. [ ] Observe UI behavior

**Expected Results:**
- [ ] Description updates in panel header immediately
- [ ] No page refresh
- [ ] Scroll position preserved
- [ ] **Network tab shows only 1 PATCH request**

### Test Case 3: Notes Update Without Refresh
**Steps:**
1. [ ] Open a contact detail panel
2. [ ] Edit the notes textarea
3. [ ] Click outside textarea (blur event)
4. [ ] Observe UI behavior

**Expected Results:**
- [ ] Notes save without refresh
- [ ] No loading state
- [ ] Panel remains open
- [ ] **Network tab shows only 1 PATCH request**

### Test Case 4: Rapid Multiple Edits
**Steps:**
1. [ ] Open a contact detail panel
2. [ ] Quickly change category 3 times in a row
3. [ ] Observe UI behavior

**Expected Results:**
- [ ] Each click registers immediately
- [ ] No UI lag or sluggishness
- [ ] Final category reflects last click
- [ ] **Network tab shows 3 PATCH requests (may be sequential)**

### Test Case 5: Error Handling (Rollback)
**Steps:**
1. [ ] Open browser DevTools
2. [ ] Go to Network tab, enable offline mode
3. [ ] Open a contact detail panel
4. [ ] Change category
5. [ ] Observe UI behavior

**Expected Results:**
- [ ] Category changes optimistically (immediate visual update)
- [ ] After network timeout, category reverts to original
- [ ] Error is handled gracefully (no crash)
- [ ] User can try again

### Test Case 6: Toggle Primary Contact
**Steps:**
1. [ ] Open a contact detail panel
2. [ ] Click "Set as Primary" button
3. [ ] Observe UI behavior

**Expected Results:**
- [ ] Button text updates immediately
- [ ] No page refresh
- [ ] "Primary" badge appears instantly
- [ ] **Network tab shows only 1 PATCH request**

### Test Case 7: Contact Info Edit (Should Still Refresh)
**Steps:**
1. [ ] Open a contact detail panel
2. [ ] Click "Edit" button for contact info
3. [ ] Change first name
4. [ ] Click "Save"
5. [ ] Observe UI behavior

**Expected Results:**
- [ ] Name updates in list view
- [ ] This SHOULD trigger refresh (canonical person update)
- [ ] **Network tab shows PATCH to `/people/{id}` + refresh GET**

**Note:** This is intentional - canonical person updates affect multiple views.

---

## PROD-045: Age Input UX Improvements

### Test Environment Setup
1. [ ] Navigate to Personal Financial Statement
2. [ ] Scroll to "Owner Profile" section
3. [ ] Also open Retirement Calculator in another tab

### PFS: Current Age Input

#### Test Case 1: Stepper Buttons Render
**Steps:**
1. [ ] View "Current Age" field

**Expected Results:**
- [ ] See [-] button on left
- [ ] See input field in center
- [ ] See [+] button on right
- [ ] Buttons are visually distinct (border, rounded)

#### Test Case 2: Increment Age
**Steps:**
1. [ ] Note current age (e.g., 52)
2. [ ] Click [+] button once
3. [ ] Observe result

**Expected Results:**
- [ ] Age increments by 1 (e.g., 52 → 53)
- [ ] Change is immediate (no delay)
- [ ] Input updates visually

#### Test Case 3: Decrement Age
**Steps:**
1. [ ] Note current age
2. [ ] Click [-] button once
3. [ ] Observe result

**Expected Results:**
- [ ] Age decrements by 1 (e.g., 53 → 52)
- [ ] Change is immediate
- [ ] Input updates visually

#### Test Case 4: Lower Boundary (18 years)
**Steps:**
1. [ ] Manually type "18" in age input
2. [ ] Try to click [-] button
3. [ ] Observe button state

**Expected Results:**
- [ ] [-] button is disabled (grayed out)
- [ ] Clicking does nothing
- [ ] Age stays at 18

#### Test Case 5: Upper Boundary (100 years)
**Steps:**
1. [ ] Manually type "100" in age input
2. [ ] Try to click [+] button
3. [ ] Observe button state

**Expected Results:**
- [ ] [+] button is disabled (grayed out)
- [ ] Clicking does nothing
- [ ] Age stays at 100

#### Test Case 6: Manual Input Validation
**Steps:**
1. [ ] Click age input field
2. [ ] Type "150"
3. [ ] Tab out
4. [ ] Observe value

**Expected Results:**
- [ ] Value clamps to 100
- [ ] No error message (silent validation)

**Steps:**
1. [ ] Type "5"
2. [ ] Tab out

**Expected Results:**
- [ ] Value clamps to 18

#### Test Case 7: Mobile Keyboard (Mobile Device/Simulator)
**Steps:**
1. [ ] Open site on mobile device OR use Chrome DevTools device mode
2. [ ] Tap age input field
3. [ ] Observe keyboard

**Expected Results:**
- [ ] Numeric keyboard appears (0-9)
- [ ] NOT full QWERTY keyboard

#### Test Case 8: Touch Target Size (Mobile)
**Steps:**
1. [ ] Open Chrome DevTools
2. [ ] Toggle device mode (mobile view)
3. [ ] Inspect [+] button
4. [ ] Check computed size

**Expected Results:**
- [ ] Button is at least 36x36px
- [ ] Easy to tap with thumb
- [ ] No accidental taps on adjacent elements

#### Test Case 9: Helper Text
**Steps:**
1. [ ] View age input section

**Expected Results:**
- [ ] See helper text: "Used for retirement planning calculations"
- [ ] Text is below input
- [ ] Text is muted/gray color

---

### Retirement Calculator: Retirement Age

#### Test Case 10: Stepper Buttons Render
**Steps:**
1. [ ] Navigate to Retirement Calculator
2. [ ] View "Retirement Age" field

**Expected Results:**
- [ ] See [-] and [+] buttons
- [ ] See slider below input
- [ ] Input is center-aligned

#### Test Case 11: Increment Retirement Age
**Steps:**
1. [ ] Note current retirement age
2. [ ] Click [+] button
3. [ ] Observe result

**Expected Results:**
- [ ] Age increments by 1
- [ ] Slider marker moves right
- [ ] "Years to Retirement" stat updates

#### Test Case 12: Adaptive Minimum (Current Age Constraint)
**Steps:**
1. [ ] Set current age to 60 in PFS
2. [ ] Navigate to Retirement Calculator
3. [ ] View retirement age slider
4. [ ] Observe slider minimum label

**Expected Results:**
- [ ] Slider minimum shows "60" (not "50")
- [ ] Cannot set retirement age below 60
- [ ] [-] button disabled when retirement age = current age

**Steps:**
1. [ ] Try to manually type "55" in retirement age input
2. [ ] Tab out

**Expected Results:**
- [ ] Value clamps to 60 (current age)

#### Test Case 13: Upper Boundary (80 years)
**Steps:**
1. [ ] Set retirement age to 80
2. [ ] Try to click [+] button

**Expected Results:**
- [ ] [+] button is disabled
- [ ] Age stays at 80

---

### Retirement Calculator: Life Expectancy (Pro Mode Only)

#### Test Case 14: Pro Mode Toggle
**Steps:**
1. [ ] Start in Easy mode
2. [ ] Look for Life Expectancy input
3. [ ] Toggle to Pro mode
4. [ ] Look for Life Expectancy input

**Expected Results:**
- [ ] Easy mode: Only text shown (no input)
- [ ] Pro mode: [-] [input] [+] buttons appear

#### Test Case 15: Increment Life Expectancy
**Steps:**
1. [ ] In Pro mode, click [+] on life expectancy
2. [ ] Observe result

**Expected Results:**
- [ ] Life expectancy increments by 1
- [ ] "Years in Retirement" stat updates
- [ ] Timeline visual updates

#### Test Case 16: Adaptive Minimum (Retirement Age Constraint)
**Steps:**
1. [ ] Set retirement age to 75
2. [ ] View life expectancy slider
3. [ ] Observe minimum label

**Expected Results:**
- [ ] Slider minimum shows "75" (not "70")
- [ ] Cannot set life expectancy below 75

**Steps:**
1. [ ] Try to manually type "70" in life expectancy input
2. [ ] Tab out

**Expected Results:**
- [ ] Value clamps to 75 (retirement age)

#### Test Case 17: Reset to SSA Default
**Steps:**
1. [ ] Change life expectancy to 95
2. [ ] Look for "Reset to SSA default" button
3. [ ] Click it

**Expected Results:**
- [ ] Life expectancy resets to calculated value (e.g., 88)
- [ ] Button disappears (only shows when != default)

---

## Cross-Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
  - [ ] PROD-042 tests pass
  - [ ] PROD-045 tests pass
- [ ] Firefox (latest)
  - [ ] PROD-042 tests pass
  - [ ] PROD-045 tests pass
- [ ] Safari (latest)
  - [ ] PROD-042 tests pass
  - [ ] PROD-045 tests pass
- [ ] Edge (latest)
  - [ ] PROD-042 tests pass
  - [ ] PROD-045 tests pass

### Mobile Browsers
- [ ] iOS Safari
  - [ ] Numeric keyboard appears
  - [ ] Stepper buttons easy to tap
  - [ ] No layout shift
- [ ] Chrome Android
  - [ ] Numeric keyboard appears
  - [ ] Stepper buttons easy to tap
  - [ ] No layout shift

---

## Performance Testing

### PROD-042: Network Performance
**Steps:**
1. [ ] Open DevTools Network tab
2. [ ] Clear network log
3. [ ] Edit contact category
4. [ ] Count network requests

**Expected Results:**
- [ ] Only 1 PATCH request
- [ ] No GET request to `/participants`
- [ ] Response time < 200ms (depends on server)

### PROD-045: Input Responsiveness
**Steps:**
1. [ ] Click [+] button 10 times rapidly
2. [ ] Observe UI

**Expected Results:**
- [ ] All clicks register
- [ ] No lag or stutter
- [ ] Final value = initial + 10

---

## Accessibility Testing

### Keyboard Navigation
**Steps:**
1. [ ] Tab through age input controls
2. [ ] Press Enter on [-] button
3. [ ] Press Enter on [+] button

**Expected Results:**
- [ ] Tab order is logical: [-] → [input] → [+]
- [ ] Focus rings are visible
- [ ] Enter key activates buttons

### Screen Reader (VoiceOver/NVDA)
**Steps:**
1. [ ] Enable screen reader
2. [ ] Navigate to age input
3. [ ] Listen to announcements

**Expected Results:**
- [ ] Hears "Decrement button"
- [ ] Hears "Current age, edit text, 52"
- [ ] Hears "Increment button"
- [ ] Hears "dimmed" or "unavailable" when disabled

### Color Contrast
**Steps:**
1. [ ] Use browser extension (e.g., axe DevTools)
2. [ ] Scan page for contrast issues

**Expected Results:**
- [ ] All buttons pass WCAG AA (4.5:1)
- [ ] Text is readable
- [ ] No contrast warnings

---

## Edge Cases

### PROD-042: Edge Cases

1. [ ] **Empty contacts list**
   - No errors when list is empty

2. [ ] **Single contact**
   - Can edit without issues

3. [ ] **Very long list (50+ contacts)**
   - Scroll preservation works even at bottom

4. [ ] **Offline mode**
   - Optimistic update applies, then reverts on timeout

5. [ ] **Slow network (throttle to 3G)**
   - Optimistic update still instant
   - Background API completes eventually

### PROD-045: Edge Cases

1. [ ] **Empty age value**
   - Can type in field from empty state
   - [+] button sets to 50 (reasonable default)

2. [ ] **Non-numeric input**
   - Typing "abc" is prevented
   - Only digits allowed

3. [ ] **Decimal values**
   - Typing "52.5" rounds to 52

4. [ ] **Negative values**
   - Typing "-5" is prevented or clamps to 18

---

## Regression Testing

### Verify these existing features still work:

- [ ] Adding new contacts still works
- [ ] Removing contacts still works
- [ ] Searching/filtering contacts still works
- [ ] Saving PFS still works
- [ ] Retirement calculator still calculates correctly
- [ ] No console errors appear
- [ ] No TypeScript errors in build
- [ ] Unit tests still pass

---

## Sign-Off

**Tested By:** _______________

**Date:** _______________

**Browser/Device:** _______________

**Results:**
- [ ] All PROD-042 tests pass
- [ ] All PROD-045 tests pass
- [ ] No critical bugs found
- [ ] Ready for production

**Notes/Issues Found:**
_______________________________________________
_______________________________________________
_______________________________________________
