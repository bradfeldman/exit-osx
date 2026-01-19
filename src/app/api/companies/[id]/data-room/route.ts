import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { DataRoomCategory, UpdateFrequency, DocumentStatus } from '@prisma/client'

// Standard required documents for each category
const STANDARD_DOCUMENTS: Array<{
  category: DataRoomCategory
  documentName: string
  description: string
  updateFrequency: UpdateFrequency
  displayOrder: number
}> = [
  // Financial
  { category: 'FINANCIAL', documentName: '3-Year Financial Statements', description: 'Audited or reviewed financial statements for the past 3 years', updateFrequency: 'ANNUALLY', displayOrder: 1 },
  { category: 'FINANCIAL', documentName: '3-Year Tax Returns', description: 'Federal and state tax returns for the past 3 years', updateFrequency: 'ANNUALLY', displayOrder: 2 },
  { category: 'FINANCIAL', documentName: 'YTD Monthly P&L', description: 'Month-by-month P&L for the current year', updateFrequency: 'MONTHLY', displayOrder: 3 },
  { category: 'FINANCIAL', documentName: 'Accounts Receivable Aging', description: 'Current AR aging report showing outstanding invoices', updateFrequency: 'MONTHLY', displayOrder: 4 },
  { category: 'FINANCIAL', documentName: 'Accounts Payable Aging', description: 'Current AP aging report showing outstanding bills', updateFrequency: 'MONTHLY', displayOrder: 5 },
  { category: 'FINANCIAL', documentName: 'Debt Schedule', description: 'List of all outstanding loans and debt obligations', updateFrequency: 'QUARTERLY', displayOrder: 6 },
  { category: 'FINANCIAL', documentName: 'Financial Projections', description: '3-5 year financial projections with assumptions', updateFrequency: 'ANNUALLY', displayOrder: 7 },

  // Legal
  { category: 'LEGAL', documentName: 'Articles of Incorporation', description: 'Original incorporation documents', updateFrequency: 'ONE_TIME', displayOrder: 1 },
  { category: 'LEGAL', documentName: 'Bylaws / Operating Agreement', description: 'Corporate bylaws or LLC operating agreement', updateFrequency: 'AS_NEEDED', displayOrder: 2 },
  { category: 'LEGAL', documentName: 'Stock Ledger / Cap Table', description: 'Current ownership structure and equity holders', updateFrequency: 'AS_NEEDED', displayOrder: 3 },
  { category: 'LEGAL', documentName: 'Board Meeting Minutes', description: 'Minutes from board meetings (past 2 years)', updateFrequency: 'QUARTERLY', displayOrder: 4 },
  { category: 'LEGAL', documentName: 'Material Contracts List', description: 'Summary of all material contracts and agreements', updateFrequency: 'QUARTERLY', displayOrder: 5 },
  { category: 'LEGAL', documentName: 'Pending Litigation Summary', description: 'Summary of any pending or threatened litigation', updateFrequency: 'QUARTERLY', displayOrder: 6 },
  { category: 'LEGAL', documentName: 'Insurance Policies', description: 'All active insurance policies (liability, property, D&O, etc.)', updateFrequency: 'ANNUALLY', displayOrder: 7 },

  // Operations
  { category: 'OPERATIONS', documentName: 'Organizational Chart', description: 'Current org chart showing reporting structure', updateFrequency: 'QUARTERLY', displayOrder: 1 },
  { category: 'OPERATIONS', documentName: 'Key Vendor Contracts', description: 'Contracts with critical suppliers and vendors', updateFrequency: 'AS_NEEDED', displayOrder: 2 },
  { category: 'OPERATIONS', documentName: 'Lease Agreements', description: 'All real estate and equipment lease agreements', updateFrequency: 'AS_NEEDED', displayOrder: 3 },
  { category: 'OPERATIONS', documentName: 'Equipment List', description: 'Inventory of major equipment and assets', updateFrequency: 'ANNUALLY', displayOrder: 4 },
  { category: 'OPERATIONS', documentName: 'Standard Operating Procedures', description: 'Key SOPs for critical business processes', updateFrequency: 'AS_NEEDED', displayOrder: 5 },
  { category: 'OPERATIONS', documentName: 'Quality Certifications', description: 'ISO, industry, or quality certifications', updateFrequency: 'ANNUALLY', displayOrder: 6 },

  // Customers
  { category: 'CUSTOMERS', documentName: 'Top 20 Customers by Revenue', description: 'List of top 20 customers with revenue contribution', updateFrequency: 'QUARTERLY', displayOrder: 1 },
  { category: 'CUSTOMERS', documentName: 'Customer Concentration Analysis', description: 'Analysis of revenue concentration by customer', updateFrequency: 'QUARTERLY', displayOrder: 2 },
  { category: 'CUSTOMERS', documentName: 'Sample Customer Contracts', description: 'Representative customer agreements', updateFrequency: 'AS_NEEDED', displayOrder: 3 },
  { category: 'CUSTOMERS', documentName: 'Sales Pipeline Report', description: 'Current sales pipeline and forecast', updateFrequency: 'MONTHLY', displayOrder: 4 },
  { category: 'CUSTOMERS', documentName: 'Customer Churn Analysis', description: 'Historical customer retention and churn data', updateFrequency: 'QUARTERLY', displayOrder: 5 },
  { category: 'CUSTOMERS', documentName: 'Pricing Documentation', description: 'Pricing schedules, rate cards, or pricing methodology', updateFrequency: 'AS_NEEDED', displayOrder: 6 },

  // Employees
  { category: 'EMPLOYEES', documentName: 'Employee Roster', description: 'List of all employees with tenure and roles', updateFrequency: 'QUARTERLY', displayOrder: 1 },
  { category: 'EMPLOYEES', documentName: 'Compensation Summary', description: 'Summary of salary ranges and compensation structure', updateFrequency: 'ANNUALLY', displayOrder: 2 },
  { category: 'EMPLOYEES', documentName: 'Benefits Overview', description: 'Summary of employee benefits programs', updateFrequency: 'ANNUALLY', displayOrder: 3 },
  { category: 'EMPLOYEES', documentName: 'Key Employee Agreements', description: 'Employment agreements for key personnel', updateFrequency: 'AS_NEEDED', displayOrder: 4 },
  { category: 'EMPLOYEES', documentName: 'Non-Compete Agreements', description: 'Non-compete and non-solicitation agreements', updateFrequency: 'AS_NEEDED', displayOrder: 5 },
  { category: 'EMPLOYEES', documentName: 'Employee Handbook', description: 'Current employee handbook and policies', updateFrequency: 'ANNUALLY', displayOrder: 6 },

  // IP
  { category: 'IP', documentName: 'Patent Filings', description: 'List of patents and patent applications', updateFrequency: 'AS_NEEDED', displayOrder: 1 },
  { category: 'IP', documentName: 'Trademark Registrations', description: 'Registered trademarks and pending applications', updateFrequency: 'AS_NEEDED', displayOrder: 2 },
  { category: 'IP', documentName: 'Copyright Registrations', description: 'Registered copyrights', updateFrequency: 'AS_NEEDED', displayOrder: 3 },
  { category: 'IP', documentName: 'Trade Secret Documentation', description: 'Summary of trade secrets and protection measures', updateFrequency: 'AS_NEEDED', displayOrder: 4 },
  { category: 'IP', documentName: 'IP Assignment Agreements', description: 'Employee and contractor IP assignment agreements', updateFrequency: 'AS_NEEDED', displayOrder: 5 },
  { category: 'IP', documentName: 'Technology Licenses', description: 'Inbound and outbound technology licenses', updateFrequency: 'AS_NEEDED', displayOrder: 6 },
]

// GET - Get all data room documents for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: companyId } = await params

    // Check company access
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
        organization: {
          users: {
            some: {
              user: { authId: user.id }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get existing documents with linked task and uploader info
    let documents = await prisma.dataRoomDocument.findMany({
      where: { companyId },
      include: {
        linkedTask: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { displayOrder: 'asc' },
        { documentName: 'asc' }
      ]
    })

    // Get uploader info for documents that have uploadedByUserId
    const uploaderIds = [...new Set(documents.filter(d => d.uploadedByUserId).map(d => d.uploadedByUserId))] as string[]
    const uploaders = uploaderIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: uploaderIds } },
          select: { id: true, name: true, email: true }
        })
      : []
    const uploaderMap = new Map(uploaders.map(u => [u.id, u]))

    // Add uploader info to documents
    const documentsWithUploaders = documents.map(doc => ({
      ...doc,
      uploadedBy: doc.uploadedByUserId ? uploaderMap.get(doc.uploadedByUserId) || null : null
    }))
    documents = documentsWithUploaders as typeof documents

    // If no documents exist, initialize with standard documents
    if (documents.length === 0) {
      await prisma.dataRoomDocument.createMany({
        data: STANDARD_DOCUMENTS.map(doc => ({
          companyId,
          ...doc,
          isRequired: true,
          isCustom: false,
        }))
      })

      documents = await prisma.dataRoomDocument.findMany({
        where: { companyId },
        include: {
          linkedTask: {
            select: {
              id: true,
              title: true,
              status: true,
            }
          }
        },
        orderBy: [
          { category: 'asc' },
          { displayOrder: 'asc' },
          { documentName: 'asc' }
        ]
      })
    }

    // Update status based on nextUpdateDue
    const now = new Date()
    const documentsWithStatus = documents.map(doc => {
      let status: DocumentStatus = doc.status
      if (doc.nextUpdateDue && doc.fileUrl) {
        if (doc.nextUpdateDue < now) {
          status = 'OVERDUE'
        } else {
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (doc.nextUpdateDue < weekFromNow) {
            status = 'NEEDS_UPDATE'
          } else {
            status = 'CURRENT'
          }
        }
      }
      return { ...doc, status }
    })

    return NextResponse.json({ documents: documentsWithStatus })
  } catch (error) {
    console.error('Error fetching data room documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new custom document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: companyId } = await params
    const body = await request.json()

    // Check company access
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
        organization: {
          users: {
            some: {
              user: { authId: user.id }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const {
      category,
      documentName,
      description,
      updateFrequency = 'AS_NEEDED',
    } = body

    if (!category || !documentName) {
      return NextResponse.json({ error: 'Category and document name are required' }, { status: 400 })
    }

    // Get max display order for this category
    const maxOrder = await prisma.dataRoomDocument.aggregate({
      where: { companyId, category },
      _max: { displayOrder: true }
    })

    const document = await prisma.dataRoomDocument.create({
      data: {
        companyId,
        category,
        documentName,
        description,
        updateFrequency,
        isRequired: false,
        isCustom: true,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
      }
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Error creating data room document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
