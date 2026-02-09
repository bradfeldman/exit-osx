import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { createServiceClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

/**
 * Add watermark to PDF with user email and timestamp
 */
async function addWatermarkToPdf(
  pdfBytes: ArrayBuffer,
  userEmail: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
  const watermarkText = `Viewed by ${userEmail} on ${timestamp}`

  for (const page of pages) {
    const { width, height } = page.getSize()
    const fontSize = 10
    const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize)

    page.drawText(watermarkText, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0.7, 0.7, 0.7),
      rotate: degrees(45),
      opacity: 0.3,
    })

    const footerText = `${userEmail} | ${timestamp}`
    const footerWidth = helveticaFont.widthOfTextAtSize(footerText, 8)
    page.drawText(footerText, {
      x: width / 2 - footerWidth / 2,
      y: 15,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.5,
    })
  }

  return await pdfDoc.save()
}

/**
 * GET /api/companies/[id]/evidence/documents/[docId]/view
 * View an evidence document. PDFs are returned with watermark.
 * Non-PDFs return a short-lived signed URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: companyId, docId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const document = await prisma.dataRoomDocument.findUnique({
      where: { id: docId },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!document.filePath) {
      return NextResponse.json({ error: 'No file available' }, { status: 404 })
    }

    const supabase = createServiceClient()
    const isPdf = document.mimeType === 'application/pdf' ||
                  document.fileName?.toLowerCase().endsWith('.pdf')

    // For PDFs, watermark and return inline
    if (isPdf) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('data-room')
        .download(document.filePath)

      if (downloadError || !fileData) {
        console.error('Evidence view - storage download error:', downloadError)
        return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 })
      }

      try {
        const pdfBytes = await fileData.arrayBuffer()
        const watermarkedPdf = await addWatermarkToPdf(pdfBytes, result.auth.user.email)

        return new NextResponse(Buffer.from(watermarkedPdf), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${document.fileName || 'document.pdf'}"`,
            'Content-Length': watermarkedPdf.length.toString(),
          },
        })
      } catch (watermarkError) {
        console.error('Evidence view - watermark error:', watermarkError)
        // Fallback: signed URL without watermark
        const { data, error } = await supabase.storage
          .from('data-room')
          .createSignedUrl(document.filePath, 300)

        if (error) {
          return NextResponse.json({ error: 'Failed to generate view URL' }, { status: 500 })
        }

        return NextResponse.json({ url: data.signedUrl, fileName: document.fileName })
      }
    }

    // For non-PDFs, return a signed URL
    const { data, error } = await supabase.storage
      .from('data-room')
      .createSignedUrl(document.filePath, 300)

    if (error) {
      console.error('Evidence view - signed URL error:', error)
      return NextResponse.json({ error: 'Failed to generate view URL' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl, fileName: document.fileName })
  } catch (error) {
    console.error('Evidence view - unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
