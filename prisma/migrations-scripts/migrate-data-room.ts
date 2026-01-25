/**
 * Data Room Migration Script
 *
 * Migrates existing DataRoomDocument records to the new folder-based structure.
 *
 * Run with: npx ts-node prisma/migrations-scripts/migrate-data-room.ts
 */

import { PrismaClient, DataRoomCategory, DataRoomStage } from '@prisma/client'

const prisma = new PrismaClient()

// Default folder structure for each category
const DEFAULT_FOLDER_STRUCTURE: Record<DataRoomCategory, { name: string; children: string[]; sortOrder: number; minStage: DataRoomStage }> = {
  CORPORATE: {
    name: '1. Corporate & Legal',
    children: [
      'Formation Documents',
      'Bylaws & Operating Agreement',
      'Board Minutes',
      'Shareholder Agreements',
      'Cap Table',
    ],
    sortOrder: 1,
    minStage: 'PREPARATION',
  },
  LEGAL: {
    name: '2. Legal',
    children: [
      'Contracts & Agreements',
      'Litigation History',
      'Regulatory Filings',
      'Licenses & Permits',
    ],
    sortOrder: 2,
    minStage: 'POST_NDA',
  },
  FINANCIAL: {
    name: '3. Financial',
    children: [
      'Annual Financial Statements',
      'Monthly Financials',
      'Budget & Projections',
      'Accounts Receivable Aging',
      'Accounts Payable Aging',
      'Debt Schedule',
      'Revenue by Customer',
    ],
    sortOrder: 3,
    minStage: 'POST_NDA',
  },
  TAX: {
    name: '4. Tax',
    children: [
      'Federal Tax Returns',
      'State Tax Returns',
      'Sales Tax Filings',
      'Tax Audits & Correspondence',
    ],
    sortOrder: 4,
    minStage: 'DUE_DILIGENCE',
  },
  OPERATIONS: {
    name: '5. Operations',
    children: [
      'Organizational Chart',
      'Key Processes & SOPs',
      'Vendor Contracts',
      'Facility Leases',
      'Equipment List',
    ],
    sortOrder: 5,
    minStage: 'POST_NDA',
  },
  EMPLOYEES: {
    name: '6. Human Resources',
    children: [
      'Employee Census',
      'Employment Agreements',
      'Benefit Plans',
      'Compensation Summary',
      'Handbook & Policies',
    ],
    sortOrder: 6,
    minStage: 'DUE_DILIGENCE',
  },
  CUSTOMERS: {
    name: '7. Customers',
    children: [
      'Customer List',
      'Customer Contracts',
      'Sales Pipeline',
      'Customer Concentration',
    ],
    sortOrder: 7,
    minStage: 'POST_NDA',
  },
  SALES_MARKETING: {
    name: '8. Sales & Marketing',
    children: [
      'Marketing Materials',
      'Competitor Analysis',
      'Pricing Strategy',
    ],
    sortOrder: 8,
    minStage: 'TEASER',
  },
  IP: {
    name: '9. Intellectual Property',
    children: [
      'Patents & Trademarks',
      'Trade Secrets',
      'IP Assignments',
      'License Agreements',
    ],
    sortOrder: 9,
    minStage: 'POST_NDA',
  },
  TECHNOLOGY: {
    name: '10. Technology',
    children: [
      'Software Licenses',
      'Technology Architecture',
      'Security Policies',
    ],
    sortOrder: 10,
    minStage: 'DUE_DILIGENCE',
  },
  INSURANCE: {
    name: '11. Insurance',
    children: [
      'Policy Summaries',
      'Claims History',
    ],
    sortOrder: 11,
    minStage: 'DUE_DILIGENCE',
  },
  REAL_ESTATE: {
    name: '12. Real Estate',
    children: [
      'Property Leases',
      'Property Deeds',
      'Environmental Reports',
    ],
    sortOrder: 12,
    minStage: 'DUE_DILIGENCE',
  },
  ENVIRONMENTAL: {
    name: '13. Environmental',
    children: [
      'Environmental Assessments',
      'Compliance Reports',
    ],
    sortOrder: 13,
    minStage: 'DUE_DILIGENCE',
  },
  CUSTOM: {
    name: '14. Other Documents',
    children: [],
    sortOrder: 14,
    minStage: 'PREPARATION',
  },
  TASK_PROOF: {
    name: '15. Task Proof Documents',
    children: [],
    sortOrder: 15,
    minStage: 'PREPARATION',
  },
}

// Map old category names to new ones (for categories that existed before)
const CATEGORY_MAPPING: Record<string, DataRoomCategory> = {
  FINANCIAL: 'FINANCIAL',
  LEGAL: 'LEGAL',
  OPERATIONS: 'OPERATIONS',
  CUSTOMERS: 'CUSTOMERS',
  EMPLOYEES: 'EMPLOYEES',
  IP: 'IP',
  CUSTOM: 'CUSTOM',
  TASK_PROOF: 'TASK_PROOF',
}

async function migrateDataRoom() {
  console.log('Starting Data Room migration...\n')

  // Get all companies
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    include: {
      dataRoom: true,
      dataRoomDocuments: true,
    },
  })

  console.log(`Found ${companies.length} companies to process\n`)

  for (const company of companies) {
    console.log(`\nProcessing company: ${company.name} (${company.id})`)

    // Skip if company already has a data room
    if (company.dataRoom) {
      console.log('  - Data room already exists, skipping creation')
    } else {
      // Create the data room
      console.log('  - Creating data room...')
      const dataRoom = await prisma.dataRoom.create({
        data: {
          companyId: company.id,
          name: 'Data Room',
          stage: 'PREPARATION',
        },
      })
      console.log(`  - Data room created: ${dataRoom.id}`)
    }

    // Get the data room (either existing or just created)
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId: company.id },
      include: { folders: true },
    })

    if (!dataRoom) {
      console.log('  - ERROR: Could not find or create data room')
      continue
    }

    // Create folders if they don't exist
    const existingFolderCategories = new Set(dataRoom.folders.map(f => f.category))
    const folderMap = new Map<DataRoomCategory, string>() // category -> folderId

    // Map existing folders
    for (const folder of dataRoom.folders) {
      folderMap.set(folder.category, folder.id)
    }

    // Create missing category folders
    for (const [category, config] of Object.entries(DEFAULT_FOLDER_STRUCTURE)) {
      const cat = category as DataRoomCategory
      if (!existingFolderCategories.has(cat)) {
        console.log(`  - Creating folder: ${config.name}`)
        const folder = await prisma.dataRoomFolder.create({
          data: {
            dataRoomId: dataRoom.id,
            name: config.name,
            category: cat,
            sortOrder: config.sortOrder,
            minStage: config.minStage,
          },
        })
        folderMap.set(cat, folder.id)

        // Create subfolders
        for (let i = 0; i < config.children.length; i++) {
          await prisma.dataRoomFolder.create({
            data: {
              dataRoomId: dataRoom.id,
              parentId: folder.id,
              name: config.children[i],
              category: cat,
              sortOrder: i + 1,
              minStage: config.minStage,
            },
          })
        }
      }
    }

    // Migrate documents to folders
    const documentsToMigrate = company.dataRoomDocuments.filter(d => !d.folderId)
    console.log(`  - Migrating ${documentsToMigrate.length} documents to folders...`)

    for (const doc of documentsToMigrate) {
      const category = CATEGORY_MAPPING[doc.category] || doc.category
      const folderId = folderMap.get(category as DataRoomCategory)

      if (folderId) {
        await prisma.dataRoomDocument.update({
          where: { id: doc.id },
          data: { folderId },
        })
      } else {
        // Put in CUSTOM folder if category not found
        const customFolderId = folderMap.get('CUSTOM')
        if (customFolderId) {
          await prisma.dataRoomDocument.update({
            where: { id: doc.id },
            data: { folderId: customFolderId },
          })
        }
      }
    }

    console.log(`  - Done processing ${company.name}`)
  }

  console.log('\n\nMigration complete!')
}

async function main() {
  try {
    await migrateDataRoom()
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
