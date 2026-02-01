'use client'

import { useState } from 'react'
import { motion } from '@/lib/motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CompaniesBrowser } from './CompaniesBrowser'
import { PeopleBrowser } from './PeopleBrowser'
import { SmartImport } from './SmartImport'
import { DuplicateReviewQueue } from './DuplicateReviewQueue'
import { Building2, Users, Upload, GitMerge } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
  },
}

export function ContactsManager() {
  const [activeTab, setActiveTab] = useState('companies')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleImportComplete = () => {
    setRefreshKey((prev) => prev + 1)
    setActiveTab('companies')
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
          Contact Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage canonical companies and people with smart parsing and deduplication
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="companies">
              <Building2 className="h-4 w-4 mr-1.5" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="people">
              <Users className="h-4 w-4 mr-1.5" />
              People
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-1.5" />
              Smart Import
            </TabsTrigger>
            <TabsTrigger value="duplicates">
              <GitMerge className="h-4 w-4 mr-1.5" />
              Duplicates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-6">
            <CompaniesBrowser key={`companies-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="people" className="mt-6">
            <PeopleBrowser key={`people-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <SmartImport onImportComplete={handleImportComplete} />
          </TabsContent>

          <TabsContent value="duplicates" className="mt-6">
            <DuplicateReviewQueue key={`duplicates-${refreshKey}`} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
