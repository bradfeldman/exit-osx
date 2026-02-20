'use client'

import { use } from 'react'
import { motion } from '@/lib/motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SellerDashboard, SellerBuyerList } from '@/components/seller'
import { LayoutDashboard, Users } from 'lucide-react'

interface PageProps {
  params: Promise<{ dealId: string }>
}

export default function SellerPortalPage({ params }: PageProps) {
  const { dealId } = use(params)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Seller Portal</h1>
              <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', margin: '4px 0 0' }}>
                Track and approve prospective buyers
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="buyers" className="gap-2">
                <Users className="h-4 w-4" />
                Buyers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <SellerDashboard dealId={dealId} />
            </TabsContent>

            <TabsContent value="buyers">
              <SellerBuyerList dealId={dealId} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  )
}
