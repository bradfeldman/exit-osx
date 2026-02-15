import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/dataroom'
import { createServiceClient } from '@/lib/supabase/server'
import { SIGNED_URL_PREVIEW_EXPIRY_SECONDS } from '@/lib/security'
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
 * GET /api/companies/[id]/dataroom/documents/[docId]/preview
 * Preview a document. PDFs are returned with watermark applied.
 * Non-PDFs use a signed URL.
 * Logs view activity.
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
      include: { folder: { select: { dataRoomId: true } } },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!document.filePath) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 404 })
    }

    const supabase = createServiceClient()
    const isPdf = document.mimeType === 'application/pdf' ||
                  document.fileName?.toLowerCase().endsWith('.pdf')

    // Log the view activity
    if (document.folder) {
      await logActivity({
        dataRoomId: document.folder.dataRoomId,
        userId: result.auth.user.id,
        userEmail: result.auth.user.email,
        action: 'VIEWED_DOCUMENT',
        documentId: docId,
        folderId: document.folderId || undefined,
        metadata: {
          fileName: document.fileName,
          watermarked: isPdf,
        },
      })
    }

    // For PDFs, return watermarked binary inline
    if (isPdf) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('data-room')
        .download(document.filePath)

      if (downloadError || !fileData) {
        console.error('Error downloading file for preview watermarking:', downloadError)
        return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
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
        console.error('Error adding watermark to PDF for preview:', watermarkError)
        if (document.isConfidential) {
          return NextResponse.json(
            { error: 'Unable to process document' },
            { status: 500 }
          )
        }
        // Fallback for non-confidential: signed URL without watermark
        const { data, error } = await supabase.storage
          .from('data-room')
          .createSignedUrl(document.filePath, SIGNED_URL_PREVIEW_EXPIRY_SECONDS)

        if (error) {
          return NextResponse.json({ error: 'Failed to generate preview URL' }, { status: 500 })
        }

        return NextResponse.json({
          url: data.signedUrl,
          fileName: document.fileName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          expiresIn: SIGNED_URL_PREVIEW_EXPIRY_SECONDS,
        })
      }
    }

    // For non-PDF files, generate signed URL
    const { data, error } = await supabase.storage
      .from('data-room')
      .createSignedUrl(document.filePath, SIGNED_URL_PREVIEW_EXPIRY_SECONDS)

    if (error) {
      console.error('Error creating signed URL:', error instanceof Error ? error.message : String(error))
      return NextResponse.json({ error: 'Failed to generate preview URL' }, { status: 500 })
    }

    return NextResponse.json({
      url: data.signedUrl,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      expiresIn: SIGNED_URL_PREVIEW_EXPIRY_SECONDS,
    })
  } catch (error) {
    console.error('Error generating preview URL:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
