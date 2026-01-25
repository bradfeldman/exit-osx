'use client'

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6",
  {
    variants: {
      elevation: {
        flat: "shadow-none",
        default: "shadow-sm",
        elevated: "shadow-md",
      },
      hover: {
        none: "",
        lift: "transition-all duration-200 hover:translate-y-[-4px] hover:shadow-lg",
        glow: "transition-all duration-200 hover:translate-y-[-4px] hover:shadow-lg hover:border-primary/20",
      },
    },
    defaultVariants: {
      elevation: "default",
      hover: "none",
    },
  }
)

type CardProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    animated?: boolean
    animationDelay?: number
  }

const MotionDiv = motion.div

function Card({
  className,
  elevation,
  hover,
  animated = false,
  animationDelay = 0,
  ...props
}: CardProps) {
  if (animated) {
    return (
      <MotionDiv
        data-slot="card"
        className={cn(cardVariants({ elevation, hover, className }))}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          delay: animationDelay,
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        }}
        whileHover={
          hover === 'lift' || hover === 'glow'
            ? {
                y: -4,
                boxShadow: '0 12px 24px -8px rgba(61, 61, 61, 0.15)',
                borderColor: hover === 'glow' ? 'rgba(184, 115, 51, 0.2)' : undefined,
              }
            : undefined
        }
        {...(props as HTMLMotionProps<"div">)}
      />
    )
  }

  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ elevation, hover, className }))}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

// Animated card wrapper for staggered animations
interface AnimatedCardContainerProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}

function AnimatedCardContainer({
  children,
  className,
  staggerDelay = 0.08,
}: AnimatedCardContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// Animated card item for use within AnimatedCardContainer
function AnimatedCardItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: {
          opacity: 0,
          y: 30,
          scale: 0.95,
        },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: 'spring',
            stiffness: 100,
            damping: 15,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  AnimatedCardContainer,
  AnimatedCardItem,
  cardVariants,
}
