/**
 * Framer Motion animation variants and utilities for Exit OSx
 * Bold & Confident animation style with pronounced animations
 */

import type { Variants, Transition } from 'framer-motion'

// Default spring transition for bouncy, confident animations
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 15,
}

// Snappy spring for quick interactions
export const snappySpring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 20,
}

// Smooth ease for subtle animations
export const smoothEase: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
}

// Container variants for staggered children
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

// Item variants for staggered entrance
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springTransition,
  },
}

// Fade up animation for general content
export const fadeUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

// Scale in animation for cards and modals
export const scaleInVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
}

// Hero section entrance
export const heroVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

// Card hover animation
export const cardHoverVariants: Variants = {
  rest: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    transition: smoothEase,
  },
  hover: {
    y: -4,
    boxShadow: '0 12px 24px -8px rgb(61 61 61 / 0.15)',
    transition: smoothEase,
  },
}

// Button hover animation
export const buttonHoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.02,
    y: -2,
    transition: snappySpring,
  },
  tap: {
    scale: 0.98,
    y: 0,
  },
}

// Number reveal animation (for counting)
export const numberRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12,
    },
  },
  pulse: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 0.3,
    },
  },
}

// Progress bar fill animation
export const progressFillVariants: Variants = {
  hidden: {
    scaleX: 0,
    originX: 0,
  },
  visible: (custom: number) => ({
    scaleX: 1,
    transition: {
      duration: 1,
      ease: [0.34, 1.56, 0.64, 1],
      delay: custom * 0.1,
    },
  }),
}

// Radial gauge animation
export const gaugeVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 1.5,
        ease: [0.4, 0, 0.2, 1],
      },
      opacity: {
        duration: 0.2,
      },
    },
  },
}

// Page transition variants
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
}

// Tooltip animation
export const tooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: snappySpring,
  },
}

// Scroll-triggered section animation
export const sectionVariants: Variants = {
  offscreen: {
    opacity: 0,
    y: 50,
  },
  onscreen: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

// Bento grid item animations (varying sizes)
export const bentoItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: custom * 0.08,
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  }),
}

// Stats counter animation
export const statsVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10,
      delay: 0.2,
    },
  },
}

// Metric card entrance
export const metricCardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: custom * 0.1,
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
  hover: {
    y: -4,
    boxShadow: '0 12px 24px -8px rgb(61 61 61 / 0.15)',
    borderColor: 'rgba(184, 115, 51, 0.3)',
    transition: smoothEase,
  },
}

// Viewport settings for scroll-triggered animations
export const viewportSettings = {
  once: true,
  margin: '-100px',
  amount: 0.3 as const,
}

// Helper to create staggered delay
export function getStaggerDelay(index: number, baseDelay = 0.08): number {
  return index * baseDelay
}

// Reduced motion check
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Get animation variants based on reduced motion preference
export function getAccessibleVariants<T extends Variants>(variants: T): T | Variants {
  if (prefersReducedMotion()) {
    return {
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
    }
  }
  return variants
}
