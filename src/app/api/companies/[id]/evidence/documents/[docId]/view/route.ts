import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
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
    const fontSize = 14
    const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize)

    page.drawText(watermarkText, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0.6, 0.6, 0.6),
      rotate: degrees(45),
      opacity: 0.4,
    })

    const footerText = `${userEmail} | ${timestamp}`
    const footerWidth = helveticaFont.widthOfTextAtSize(footerText, 9)
    page.drawText(footerText, {
      x: width / 2 - footerWidth / 2,
      y: 15,
      size: 9,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
      opacity: 0.6,
    })
  }

  return await pdfDoc.save()
}

/**
 * Generate an HTML page that displays the document with a watermark overlay.
 * Works for images and any browser-renderable file type.
 */
function buildWatermarkedHtmlViewer(
  signedUrl: string,
  fileName: string,
  mimeType: string | null,
  userEmail: string
): string {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
  const watermarkText = `Viewed by ${userEmail} on ${timestamp}`
  const isImage = mimeType?.startsWith('image/')

  // Escape HTML entities
  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escHtml(fileName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a1a;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .header {
      width: 100%;
      background: #2a2a2a;
      color: #999;
      padding: 12px 24px;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #333;
    }
    .header .filename { color: #ccc; font-weight: 500; }
    .viewer {
      position: relative;
      display: inline-block;
      margin: 24px auto;
      max-width: 95vw;
    }
    .viewer img {
      max-width: 95vw;
      max-height: 85vh;
      display: block;
      border-radius: 4px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    }
    .viewer iframe {
      width: 90vw;
      height: 85vh;
      border: none;
      border-radius: 4px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    }
    .watermark-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      overflow: hidden;
    }
    .watermark-text {
      color: rgba(255, 255, 255, 0.25);
      font-size: 20px;
      font-weight: 600;
      transform: rotate(-35deg);
      white-space: nowrap;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
      user-select: none;
    }
    .watermark-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #2a2a2a;
      color: #888;
      padding: 8px 24px;
      font-size: 11px;
      text-align: center;
      border-top: 1px solid #333;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="filename">${escHtml(fileName)}</span>
    <span>${escHtml(watermarkText)}</span>
  </div>
  <div class="viewer">
    ${isImage
      ? `<img src="${escHtml(signedUrl)}" alt="${escHtml(fileName)}" />`
      : `<iframe src="${escHtml(signedUrl)}"></iframe>`
    }
    <div class="watermark-overlay">
      <span class="watermark-text">${escHtml(watermarkText)}</span>
    </div>
  </div>
  <div class="watermark-footer">${escHtml(watermarkText)}</div>
</body>
</html>`
}

/**
 * GET /api/companies/[id]/evidence/documents/[docId]/view
 *
 * Opens an evidence document directly in the browser.
 * - PDFs: served inline with watermark baked into the file
 * - Images/other: served in an HTML viewer with watermark overlay
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
      return new NextResponse('Document not found', { status: 404 })
    }

    if (!document.filePath) {
      return new NextResponse('No file available', { status: 404 })
    }

    const supabase = await createClient()

    // Generate a signed URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from('data-room')
      .createSignedUrl(document.filePath, 300)

    if (urlError || !urlData?.signedUrl) {
      console.error('Evidence view - signed URL error:', urlError)
      return new NextResponse('Failed to generate view URL', { status: 500 })
    }

    const isPdf = document.mimeType === 'application/pdf' ||
                  document.fileName?.toLowerCase().endsWith('.pdf')

    // PDFs: fetch, watermark with pdf-lib, serve inline
    if (isPdf) {
      try {
        const fileResponse = await fetch(urlData.signedUrl)
        if (!fileResponse.ok) {
          // Fallback to HTML viewer
          return serveHtmlViewer(urlData.signedUrl, document, result.auth.user.email)
        }

        const pdfBytes = await fileResponse.arrayBuffer()
        const watermarkedPdf = await addWatermarkToPdf(pdfBytes, result.auth.user.email)

        return new NextResponse(Buffer.from(watermarkedPdf), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${document.fileName || 'document.pdf'}"`,
            'Content-Length': watermarkedPdf.length.toString(),
          },
        })
      } catch (err) {
        console.error('Evidence view - watermark pipeline error:', err)
        return serveHtmlViewer(urlData.signedUrl, document, result.auth.user.email)
      }
    }

    // Non-PDFs: HTML viewer with watermark overlay
    return serveHtmlViewer(urlData.signedUrl, document, result.auth.user.email)
  } catch (error) {
    console.error('Evidence view - unexpected error:', error instanceof Error ? error.message : String(error))
    return new NextResponse('Internal server error', { status: 500 })
  }
}

function serveHtmlViewer(
  signedUrl: string,
  document: { fileName: string | null; mimeType: string | null; documentName: string },
  userEmail: string
) {
  const html = buildWatermarkedHtmlViewer(
    signedUrl,
    document.fileName || document.documentName,
    document.mimeType,
    userEmail
  )

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
