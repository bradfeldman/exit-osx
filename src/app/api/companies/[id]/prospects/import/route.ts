import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { BuyerType } from '@prisma/client'

interface CSVRow {
  company_name?: string
  name?: string
  buyer_type?: string
  buyerType?: string
  relevance_description?: string
  relevanceDescription?: string
  description?: string
  website?: string
  headquarters_location?: string
  headquartersLocation?: string
  location?: string
}

interface ParsedProspect {
  name: string
  buyerType: BuyerType
  relevanceDescription: string | null
  website: string | null
  headquartersLocation: string | null
  domain: string | null
}

interface ImportError {
  row: number
  field: string
  message: string
}

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): CSVRow[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) return []

  // Parse header row
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())

  // Parse data rows
  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: CSVRow = {}
    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        (row as Record<string, string>)[header] = values[index].trim()
      }
    })
    rows.push(row)
  }

  return rows
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  values.push(current)
  return values
}

/**
 * Map buyer type string to enum
 */
function mapBuyerType(value: string): BuyerType | null {
  const normalized = value.toLowerCase().trim()

  if (normalized === 'strategic' || normalized === 'strat') {
    return 'STRATEGIC'
  }
  if (normalized === 'financial' || normalized === 'fin' || normalized === 'pe' || normalized === 'private equity') {
    return 'FINANCIAL'
  }
  if (normalized === 'hybrid' || normalized === 'other') {
    return 'OTHER'
  }
  if (normalized === 'individual') {
    return 'INDIVIDUAL'
  }
  if (normalized === 'management' || normalized === 'mbo') {
    return 'MANAGEMENT'
  }
  if (normalized === 'esop') {
    return 'ESOP'
  }

  return null
}

/**
 * Extract domain from website
 */
function extractDomain(website: string): string | null {
  if (!website) return null
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`)
    return url.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Validate and transform a CSV row
 */
function validateRow(row: CSVRow, rowIndex: number): {
  prospect: ParsedProspect | null
  errors: ImportError[]
} {
  const errors: ImportError[] = []

  // Get name (support multiple column names)
  const name = (row.company_name || row.name || '').trim()
  if (!name) {
    errors.push({
      row: rowIndex,
      field: 'company_name',
      message: 'Company name is required',
    })
  }

  // Get buyer type
  const buyerTypeStr = (row.buyer_type || row.buyerType || '').trim()
  let buyerType: BuyerType | null = null
  if (!buyerTypeStr) {
    errors.push({
      row: rowIndex,
      field: 'buyer_type',
      message: 'Buyer type is required',
    })
  } else {
    buyerType = mapBuyerType(buyerTypeStr)
    if (!buyerType) {
      errors.push({
        row: rowIndex,
        field: 'buyer_type',
        message: `Invalid buyer type: "${buyerTypeStr}". Use: strategic, financial, hybrid`,
      })
    }
  }

  if (errors.length > 0) {
    return { prospect: null, errors }
  }

  // Get optional fields
  const relevanceDescription = (
    row.relevance_description ||
    row.relevanceDescription ||
    row.description ||
    ''
  ).trim() || null

  const website = (row.website || '').trim() || null
  const headquartersLocation = (
    row.headquarters_location ||
    row.headquartersLocation ||
    row.location ||
    ''
  ).trim() || null

  return {
    prospect: {
      name,
      buyerType: buyerType!,
      relevanceDescription,
      website,
      headquartersLocation,
      domain: extractDomain(website || ''),
    },
    errors: [],
  }
}

/**
 * POST /api/companies/[id]/prospects/import
 * Import prospects from CSV
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const skipDuplicates = formData.get('skipDuplicates') !== 'false'

    if (!file) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()
    const rows = parseCSV(content)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or has no data rows' },
        { status: 400 }
      )
    }

    // Validate all rows
    const validProspects: ParsedProspect[] = []
    const allErrors: ImportError[] = []

    for (let i = 0; i < rows.length; i++) {
      const { prospect, errors } = validateRow(rows[i], i + 2) // +2 for 1-indexed + header row
      if (prospect) {
        validProspects.push(prospect)
      }
      allErrors.push(...errors)
    }

    // Get existing prospects to check for duplicates
    const existingNames = await prisma.buyerProspect.findMany({
      where: { companyId },
      select: { name: true },
    })
    const existingNamesSet = new Set(
      existingNames.map(p => p.name.toLowerCase())
    )

    // Filter out duplicates if requested
    const prospectsToCreate: ParsedProspect[] = []
    let duplicateCount = 0

    for (const prospect of validProspects) {
      if (existingNamesSet.has(prospect.name.toLowerCase())) {
        duplicateCount++
        if (!skipDuplicates) {
          allErrors.push({
            row: validProspects.indexOf(prospect) + 2,
            field: 'company_name',
            message: `Duplicate: "${prospect.name}" already exists`,
          })
        }
      } else {
        prospectsToCreate.push(prospect)
        existingNamesSet.add(prospect.name.toLowerCase()) // Track to avoid duplicates within import
      }
    }

    // Create import batch
    const batch = await prisma.prospectImportBatch.create({
      data: {
        companyId,
        filename: file.name,
        totalRows: rows.length,
        successfulRows: 0,
        failedRows: 0,
        status: 'processing',
        createdById: result.auth.user.id,
      },
    })

    // Create prospects
    let successfulCount = 0
    const createErrors: ImportError[] = []

    for (const prospect of prospectsToCreate) {
      try {
        await prisma.buyerProspect.create({
          data: {
            companyId,
            name: prospect.name,
            buyerType: prospect.buyerType,
            relevanceDescription: prospect.relevanceDescription,
            website: prospect.website,
            headquartersLocation: prospect.headquartersLocation,
            domain: prospect.domain,
            source: 'CSV_IMPORT',
            importBatchId: batch.id,
            createdById: result.auth.user.id,
          },
        })
        successfulCount++
      } catch (error) {
        createErrors.push({
          row: validProspects.indexOf(prospect) + 2,
          field: 'database',
          message: 'Failed to create prospect',
        })
      }
    }

    // Update batch status
    const finalErrors = [...allErrors, ...createErrors]
    await prisma.prospectImportBatch.update({
      where: { id: batch.id },
      data: {
        successfulRows: successfulCount,
        failedRows: rows.length - successfulCount,
        errorLog: finalErrors.length > 0 ? JSON.parse(JSON.stringify(finalErrors)) : null,
        status: 'completed',
      },
    })

    return NextResponse.json({
      batchId: batch.id,
      status: 'completed',
      totalRows: rows.length,
      successful: successfulCount,
      failed: rows.length - successfulCount - (skipDuplicates ? duplicateCount : 0),
      duplicates: duplicateCount,
      errors: finalErrors.slice(0, 20), // Limit errors returned
    })
  } catch (error) {
    console.error('Error importing prospects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/companies/[id]/prospects/import
 * Get import batch status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')

    if (batchId) {
      // Get specific batch
      const batch = await prisma.prospectImportBatch.findFirst({
        where: { id: batchId, companyId },
      })

      if (!batch) {
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
      }

      return NextResponse.json({ batch })
    }

    // Get recent batches
    const batches = await prisma.prospectImportBatch.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('Error fetching import batches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
