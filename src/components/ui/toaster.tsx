'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-white border border-border shadow-lg rounded-lg',
          title: 'text-foreground font-medium',
          description: 'text-muted-foreground text-sm',
          actionButton: 'bg-primary text-white',
          cancelButton: 'bg-muted text-foreground',
          success: 'border-green/20 bg-green-light',
          error: 'border-red/20 bg-red-light',
          warning: 'border-orange/20 bg-orange-light',
          info: 'border-primary/20 bg-accent-light',
        },
      }}
      closeButton
      richColors
      expand={false}
      duration={4000}
    />
  )
}

// Re-export toast for convenience
export { toast } from 'sonner'
