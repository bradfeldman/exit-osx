import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Seller Portal - Exit OSx',
  description: 'Track and approve prospective buyers for your deal',
}

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-secondary dark:bg-foreground">
      {children}
    </div>
  )
}
