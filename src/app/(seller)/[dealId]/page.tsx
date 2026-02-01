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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Seller Portal</h1>
              <p className="text-sm text-muted-foreground">
                Track and approve prospective buyers
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
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
