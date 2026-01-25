'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-white border border-gray-200 shadow-lg rounded-lg',
          title: 'text-gray-900 font-medium',
          description: 'text-gray-600 text-sm',
          actionButton: 'bg-blue-600 text-white',
          cancelButton: 'bg-gray-100 text-gray-700',
          success: 'border-green-200 bg-green-50',
          error: 'border-red-200 bg-red-50',
          warning: 'border-yellow-200 bg-yellow-50',
          info: 'border-blue-200 bg-blue-50',
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
