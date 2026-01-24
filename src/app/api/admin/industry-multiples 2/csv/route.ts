import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'

// CSV column headers
const CSV_HEADERS = [
  'icbIndustry',
  'icbSuperSector',
  'icbSector',
  'icbSubSector',
  'ebitdaMultipleLow',
  'ebitdaMultipleHigh',
  'revenueMultipleLow',
  'revenueMultipleHigh',
  'effectiveDate',
  'source',
]

// GET - Download CSV of all industry multiples
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const multiples = await prisma.industryMultiple.findMany({
      orderBy: [
        { icbIndustry: 'asc' },
        { icbSuperSector: 'asc' },
        { icbSector: 'asc' },
        { icbSubSector: 'asc' },
      ],
    })

    // Build CSV content
    const rows = [CSV_HEADERS.join(',')]

    for (const m of multiples) {
      const row = [
        m.icbIndustry,
        m.icbSuperSector,
        m.icbSector,
        m.icbSubSector,
        Number(m.ebitdaMultipleLow).toFixed(2),
        Number(m.ebitdaMultipleHigh).toFixed(2),
        Number(m.revenueMultipleLow).toFixed(2),
        Number(m.revenueMultipleHigh).toFixed(2),
        m.effectiveDate.toISOString().split('T')[0],
        m.source || '',
      ]
      rows.push(row.join(','))
    }

    const csvContent = rows.join('\n')
    const today = new Date().toISOString().split('T')[0]

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="industry-multiples-${today}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error generating CSV:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSV' },
      { status: 500 }
    )
  }
}

// POST - Upload CSV to update industry multiples
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the database user ID for tracking
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true },
    })
    const dbUserId = dbUser?.id

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const csvText = await file.text()
    const lines = csvText.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV must have a header row and at least one data row' },
        { status: 400 }
      )
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim())
    const requiredHeaders = ['icbIndustry', 'icbSuperSector', 'icbSector', 'icbSubSector',
                            'ebitdaMultipleLow', 'ebitdaMultipleHigh',
                            'revenueMultipleLow', 'revenueMultipleHigh']

    for (const req of requiredHeaders) {
      if (!headers.includes(req)) {
        return NextResponse.json(
          { error: `Missing required column: ${req}` },
          { status: 400 }
        )
      }
    }

    // Get column indices
    const getIndex = (name: string) => headers.indexOf(name)

    // Parse data rows
    const parsedRows: Array<{
      icbIndustry: string
      icbSuperSector: string
      icbSector: string
      icbSubSector: string
      ebitdaMultipleLow: number
      ebitdaMultipleHigh: number
      revenueMultipleLow: number
      revenueMultipleHigh: number
      effectiveDate: Date
      source: string | null
    }> = []

    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])

      if (values.length < headers.length) {
        errors.push(`Row ${i + 1}: Not enough columns`)
        continue
      }

      const icbIndustry = values[getIndex('icbIndustry')]?.trim()
      const icbSuperSector = values[getIndex('icbSuperSector')]?.trim()
      const icbSector = values[getIndex('icbSector')]?.trim()
      const icbSubSector = values[getIndex('icbSubSector')]?.trim()

      if (!icbIndustry || !icbSuperSector || !icbSector || !icbSubSector) {
        errors.push(`Row ${i + 1}: Missing ICB classification`)
        continue
      }

      const ebitdaMultipleLow = parseFloat(values[getIndex('ebitdaMultipleLow')])
      const ebitdaMultipleHigh = parseFloat(values[getIndex('ebitdaMultipleHigh')])
      const revenueMultipleLow = parseFloat(values[getIndex('revenueMultipleLow')])
      const revenueMultipleHigh = parseFloat(values[getIndex('revenueMultipleHigh')])

      if (isNaN(ebitdaMultipleLow) || isNaN(ebitdaMultipleHigh) ||
          isNaN(revenueMultipleLow) || isNaN(revenueMultipleHigh)) {
        errors.push(`Row ${i + 1}: Invalid multiple values`)
        continue
      }

      if (ebitdaMultipleLow > ebitdaMultipleHigh) {
        errors.push(`Row ${i + 1}: EBITDA low > high`)
        continue
      }

      if (revenueMultipleLow > revenueMultipleHigh) {
        errors.push(`Row ${i + 1}: Revenue low > high`)
        continue
      }

      const effectiveDateIdx = getIndex('effectiveDate')
      const sourceIdx = getIndex('source')

      let effectiveDate = new Date()
      if (effectiveDateIdx >= 0 && values[effectiveDateIdx]?.trim()) {
        const parsed = new Date(values[effectiveDateIdx].trim())
        if (!isNaN(parsed.getTime())) {
          effectiveDate = parsed
        }
      }

      const source = sourceIdx >= 0 ? values[sourceIdx]?.trim() || null : null

      parsedRows.push({
        icbIndustry,
        icbSuperSector,
        icbSector,
        icbSubSector,
        ebitdaMultipleLow,
        ebitdaMultipleHigh,
        revenueMultipleLow,
        revenueMultipleHigh,
        effectiveDate,
        source,
      })
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows found', details: errors },
        { status: 400 }
      )
    }

    // Delete all existing and insert new
    await prisma.industryMultiple.deleteMany()

    for (const row of parsedRows) {
      await prisma.industryMultiple.create({ data: row })
    }

    // Recalculate snapshots for all companies
    const allCompanies = await prisma.company.findMany({
      select: { id: true },
    })

    let successful = 0
    let failed = 0

    for (const company of allCompanies) {
      try {
        const result = await recalculateSnapshotForCompany(
          company.id,
          'Industry multiples updated via CSV upload',
          dbUserId
        )
        if (result.success) {
          successful++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${parsedRows.length} industry multiples`,
      imported: parsedRows.length,
      parseErrors: errors.length > 0 ? errors : undefined,
      snapshotsUpdated: {
        total: allCompanies.length,
        successful,
        failed,
      },
    })
  } catch (error) {
    console.error('Error processing CSV upload:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV upload' },
      { status: 500 }
    )
  }
}

// Helper to parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}
