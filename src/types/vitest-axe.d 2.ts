import 'vitest'

interface AxeMatchers {
  toHaveNoViolations(): void
}

declare module 'vitest' {
  // Extending vitest's Assertion interface with axe matchers
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
